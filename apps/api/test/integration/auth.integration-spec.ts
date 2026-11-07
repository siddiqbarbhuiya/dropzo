// BC-005 authentication/session/RBAC integration suite (Phase 10). Runs against the real
// dropzo_test database via a real Nest DI graph (see TestAuthAppModule below for the one
// deliberate, documented difference from AppModule) - no mocked Prisma, no mocked authorization
// results. A handful of scenarios go through full HTTP (supertest) to prove the controller/guard/
// DTO wiring; the rest call the real, DI-resolved services directly against the real database,
// exercising the identical business logic. Guard *classes* are already exercised in isolation by
// their own unit tests (jwt-auth.guard.spec.ts, roles.guard.spec.ts, merchant-access.guard.spec.ts);
// here the emphasis is the DB-backed logic those guards and services sit on top of.
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { Module, ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { validateEnv } from '../../src/config/env.validation.js';
import { PrismaModule } from '../../src/prisma/prisma.module.js';
import { AuditModule } from '../../src/common/audit/audit.module.js';
import { OtpModule } from '../../src/auth/otp/otp.module.js';
import { AllExceptionsFilter } from '../../src/common/filters/http-exception.filter.js';
import { AuthService } from '../../src/auth/auth.service.js';
import { AuthController } from '../../src/auth/auth.controller.js';
import { AdminRolesController } from '../../src/auth/admin-roles.controller.js';
import { OtpService } from '../../src/auth/otp/otp.service.js';
import { TokenService } from '../../src/auth/token.service.js';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../src/auth/guards/roles.guard.js';
import { MerchantAccessGuard } from '../../src/auth/guards/merchant-access.guard.js';
import { DevOtpProvider } from '../../src/auth/otp/providers/dev-otp.provider.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { disconnectAll, resetDatabase } from '../helpers/clients.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRootEnvPath = resolve(__dirname, '..', '..', '..', '..', '.env');

/**
 * Mirrors AppModule/AuthModule's real wiring (same ConfigModule validation, same PrismaModule,
 * AuditModule, OtpModule, the same AuthController/AdminRolesController, the same AuthService/
 * TokenService/MerchantAccessGuard, and the same JwtAuthGuard/RolesGuard pair as global APP_GUARDs)
 * with one deliberate omission: AuthModule's ThrottlerModule/ThrottlerGuard. @nestjs/throttler
 * 6.7.1 ships a plain CommonJS build that `require()`s the now ESM-only `@nestjs/common` - real
 * Node (verified directly: both `node -e "require('@nestjs/throttler')"` and a native
 * `import('@nestjs/throttler')` succeed under this project's Node version) resolves that via
 * synchronous CJS/ESM interop, but Jest's own module registry under `--experimental-vm-modules`
 * does not, and crashes the whole worker ("Must use import to load ES Module") the moment
 * anything imports it - so the real app is unaffected, only this test harness. ThrottlerGuard is
 * an unmodified, independently-tested third-party rate limiter that this project only ever uses as
 * a defence-in-depth baseline - OtpService's own DB-backed limits (exercised directly in "OTP
 * security" below) are the authoritative control per docs/04-design/AUTHENTICATION-DESIGN.md - so
 * omitting it here does not leave any Dropzo-specific logic unexercised.
 */
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: repoRootEnvPath,
            validate: validateEnv,
        }),
        PrismaModule,
        AuditModule,
        OtpModule,
        JwtModule.register({}),
    ],
    controllers: [AuthController, AdminRolesController],
    providers: [
        AuthService,
        TokenService,
        MerchantAccessGuard,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
    ],
})
class TestAuthAppModule {}

function freshPhone(): string {
    // Already in the exact E.164 form normalizePhoneNumber() produces (+91, 10 digits starting
    // 6-9) - AuthService normalizes every phone it's given before using it as the OTP/session key,
    // so a test phone not already in that form would mismatch DevOtpProvider's lookup key (it
    // stores/retrieves by the *normalized* phone). A fresh one per scenario sidesteps the 30s
    // resend cooldown rather than fighting it.
    return `+919${randomUUID().replace(/\D/g, '').slice(0, 9).padEnd(9, '1')}`;
}

let app: INestApplication;
let otpProvider: DevOtpProvider;
let authService: AuthService;
let otpService: OtpService;
let tokenService: TokenService;
let merchantGuard: MerchantAccessGuard;
let adminRolesController: AdminRolesController;
let prisma: PrismaService;

beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [TestAuthAppModule] }).compile();
    app = moduleRef.createNestApplication();
    // Mirrors main.ts's bootstrap exactly, so these tests see the same behaviour production does.
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    otpProvider = app.get(DevOtpProvider);
    authService = app.get(AuthService);
    otpService = app.get(OtpService);
    tokenService = app.get(TokenService);
    merchantGuard = app.get(MerchantAccessGuard);
    adminRolesController = app.get(AdminRolesController);
    prisma = app.get(PrismaService);
});

afterAll(async () => {
    await app.close();
    await disconnectAll();
});

beforeEach(async () => {
    await resetDatabase();
});

async function verifyViaService(phone: string) {
    // This helper's job is "get phone to a verified session," not exercise the resend cooldown
    // (covered directly in "OTP security" below) - so any prior challenge for this phone is
    // backdated past OTP_RESEND_COOLDOWN_SECONDS first, letting a second call for the same phone
    // (e.g. registration then login) always get a fresh, verifiable OTP rather than hitting
    // cooldown and reusing the first call's already-consumed code.
    await prisma.otpChallenge.updateMany({
        where: { phone },
        data: { created_at: new Date(Date.now() - 60_000) },
    });
    await authService.requestOtp(phone, { ipAddress: '10.0.0.1', userAgent: null });
    const code = otpProvider.getLastCodeForTesting(phone);
    if (!code) throw new Error('DevOtpProvider did not record a code for this phone.');
    return authService.verifyOtpAndAuthenticate(phone, code, {
        ipAddress: '10.0.0.1',
        userAgent: null,
    });
}

describe('HTTP wiring: controllers, guards, DTO validation (real DB, real guards)', () => {
    it('registers a new account end-to-end over HTTP', async () => {
        const phone = freshPhone();
        const sendRes = await request(app.getHttpServer())
            .post('/api/v1/auth/send-otp')
            .send({ phone });
        expect(sendRes.status).toBe(200);
        expect(sendRes.body.status).toBe('sent');

        const code = otpProvider.getLastCodeForTesting(phone);
        const verifyRes = await request(app.getHttpServer())
            .post('/api/v1/auth/verify-otp')
            .send({ phone, code });
        expect(verifyRes.status).toBe(200);
        expect(verifyRes.body.isNewAccount).toBe(true);
        expect(typeof verifyRes.body.accessToken).toBe('string');
        expect(typeof verifyRes.body.refreshToken).toBe('string');
    });

    it('rejects a malformed phone number before touching the OTP flow', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/v1/auth/send-otp')
            .send({ phone: '123' });
        expect(res.status).toBe(400);
    });

    it('rejects an unauthenticated request to a protected route', async () => {
        const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
        expect(res.status).toBe(401);
    });

    it('rejects a syntactically invalid access token', async () => {
        const res = await request(app.getHttpServer())
            .get('/api/v1/auth/me')
            .set('Authorization', 'Bearer not-a-real-token');
        expect(res.status).toBe(401);
    });

    it('denies a CUSTOMER calling an ADMIN-only endpoint (RolesGuard, real role from DB)', async () => {
        const phone = freshPhone();
        const sendRes = await request(app.getHttpServer())
            .post('/api/v1/auth/send-otp')
            .send({ phone });
        expect(sendRes.status).toBe(200);
        const code = otpProvider.getLastCodeForTesting(phone);
        const verifyRes = await request(app.getHttpServer())
            .post('/api/v1/auth/verify-otp')
            .send({ phone, code });
        const { accessToken } = verifyRes.body as { accessToken: string };

        const res = await request(app.getHttpServer())
            .patch(`/api/v1/admin/users/${randomUUID()}/roles`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ role: 'ADMIN', action: 'GRANT' });
        expect(res.status).toBe(403);
    });
});

describe('Registration and login (service + real DB)', () => {
    it('creates exactly one CUSTOMER account on first verification', async () => {
        const phone = freshPhone();
        const result = await verifyViaService(phone);
        expect(result.outcome).toBe('verified');
        if (result.outcome !== 'verified') return;
        expect(result.isNewAccount).toBe(true);

        const user = await prisma.user.findUniqueOrThrow({
            where: { phone },
            include: { roles: true },
        });
        expect(user.roles.map((r) => r.role)).toEqual(['CUSTOMER']);
    });

    it('logs an existing user in on a second verification without creating a new account', async () => {
        const phone = freshPhone();
        const first = await verifyViaService(phone);
        expect(first.outcome).toBe('verified');
        if (first.outcome !== 'verified') return;

        // Bypass the resend cooldown directly at the service layer - this test's subject is
        // findOrCreateUser's idempotency, not the cooldown (covered separately in OTP security).
        const second = await verifyViaService(phone);
        expect(second.outcome).toBe('verified');
        if (second.outcome !== 'verified') return;
        expect(second.isNewAccount).toBe(false);

        const users = await prisma.user.findMany({ where: { phone } });
        expect(users).toHaveLength(1);
    });

    it('never creates two accounts for the same phone racing to register concurrently', async () => {
        // Simulates two valid, already-issued OTP challenges for the same unregistered phone
        // (e.g. two devices that both requested and received a code) being verified at the same
        // instant - users.phone's UNIQUE constraint is the real safety net under test here, not
        // the OTP single-use mechanism (which already prevents the far more common case of the
        // same code being replayed - see "OTP security" below).
        const phone = freshPhone();
        const code = '123456';
        const codeHash = otpService['hashCode'](code) as string;
        await prisma.otpChallenge.createMany({
            data: [
                { phone, code_hash: codeHash, expires_at: new Date(Date.now() + 60_000) },
                { phone, code_hash: codeHash, expires_at: new Date(Date.now() + 60_000) },
            ],
        });

        const [a, b] = await Promise.all([
            authService.verifyOtpAndAuthenticate(phone, code, {
                ipAddress: null,
                userAgent: null,
            }),
            authService.verifyOtpAndAuthenticate(phone, code, {
                ipAddress: null,
                userAgent: null,
            }),
        ]);

        expect([a.outcome, b.outcome].filter((o) => o === 'verified')).toHaveLength(2);
        const users = await prisma.user.findMany({ where: { phone } });
        expect(users).toHaveLength(1);
    });
});

describe('OTP security (service + real DB)', () => {
    it('rejects replaying an already-verified code', async () => {
        const phone = freshPhone();
        await otpService.requestOtp(phone, null);
        const code = otpProvider.getLastCodeForTesting(phone)!;

        const first = await otpService.verifyOtp(phone, code);
        expect(first.outcome).toBe('verified');

        const second = await otpService.verifyOtp(phone, code);
        expect(second.outcome).toBe('not_found');
    });

    it('rejects a code after it has expired', async () => {
        const phone = freshPhone();
        await otpService.requestOtp(phone, null);
        const code = otpProvider.getLastCodeForTesting(phone)!;
        await prisma.otpChallenge.updateMany({
            where: { phone },
            data: { expires_at: new Date(Date.now() - 1000) },
        });

        const result = await otpService.verifyOtp(phone, code);
        expect(result.outcome).toBe('expired');
    });

    it('locks the challenge after the configured number of wrong attempts', async () => {
        const phone = freshPhone();
        await otpService.requestOtp(phone, null);

        let lastOutcome: string = '';
        for (let i = 0; i < 5; i += 1) {
            const result = await otpService.verifyOtp(phone, '000000');
            lastOutcome = result.outcome;
        }
        expect(lastOutcome).toBe('locked');

        const challenge = await prisma.otpChallenge.findFirstOrThrow({ where: { phone } });
        expect(challenge.status).toBe('FAILED');
    });

    it('rejects further OTP requests once the per-phone hourly limit is reached', async () => {
        const phone = freshPhone();
        // OTP_PER_PHONE_HOURLY_LIMIT=5 (.env.test.example) counts rows in the last hour - insert
        // 5 directly rather than fighting the 30s resend cooldown five times over. created_at must
        // be past OTP_RESEND_COOLDOWN_SECONDS (30s) so the cooldown check doesn't short-circuit
        // before the rate-limit check this test actually targets, but still within the hourly
        // window the rate limit counts against.
        await prisma.otpChallenge.createMany({
            data: Array.from({ length: 5 }, () => ({
                phone,
                code_hash: 'irrelevant',
                created_at: new Date(Date.now() - 45_000),
                expires_at: new Date(Date.now() - 1000),
                status: 'EXPIRED',
            })),
        });

        await expect(otpService.requestOtp(phone, null)).rejects.toThrow();
    });

    it('serializes concurrent requests for the same phone instead of letting them all bypass the cooldown', async () => {
        // The exact race a security review flagged ("SMS pumping"): many requests for one phone
        // fired at once, each reading "no recent challenge" before any of their inserts commit,
        // so none would see another's effect and the cooldown/rate-limit would be bypassed
        // entirely. requestOtp takes a per-phone Postgres advisory lock (pg_advisory_xact_lock)
        // before its cooldown check, serializing these five calls - so only the first through the
        // lock should ever see "sent"; every other one must observe that challenge and report
        // "cooldown", never a second "sent" for the same phone within the cooldown window.
        const phone = freshPhone();

        const results = await Promise.all(
            Array.from({ length: 5 }, () => otpService.requestOtp(phone, null)),
        );

        const sentCount = results.filter((r) => r.outcome === 'sent').length;
        expect(sentCount).toBe(1);
        expect(results.filter((r) => r.outcome === 'cooldown')).toHaveLength(4);

        const challenges = await prisma.otpChallenge.findMany({ where: { phone } });
        expect(challenges).toHaveLength(1);
    });

    it('never verifies the same single challenge twice under a concurrent race', async () => {
        // This is the exact TOCTOU bug verifyOtp's SELECT ... FOR UPDATE transaction was written
        // to close: two verify calls racing the *same* PENDING row (one legitimate client retrying
        // a slow response, or an attacker racing a guess against a legitimate verification), not
        // two separate challenges (that registration-race scenario is covered above). The second
        // transaction must block until the first commits, then see the row already VERIFIED and
        // report not_found - never a second "verified" for the same challenge.
        const phone = freshPhone();
        await otpService.requestOtp(phone, null);
        const code = otpProvider.getLastCodeForTesting(phone)!;

        const [a, b] = await Promise.all([
            otpService.verifyOtp(phone, code),
            otpService.verifyOtp(phone, code),
        ]);

        expect([a.outcome, b.outcome].sort()).toEqual(['not_found', 'verified']);
        const challenge = await prisma.otpChallenge.findFirstOrThrow({ where: { phone } });
        expect(challenge.status).toBe('VERIFIED');
    });

    it('rejects further OTP requests once the per-IP hourly limit is reached', async () => {
        // OTP_PER_IP_HOURLY_LIMIT=20 (.env.test.example) - distinct phones sharing one IP, all
        // past the resend cooldown, still within the hourly rate-limit window (same timing
        // reasoning as the per-phone limit test above).
        const ip = '203.0.113.7';
        await prisma.otpChallenge.createMany({
            data: Array.from({ length: 20 }, () => ({
                phone: freshPhone(),
                code_hash: 'irrelevant',
                created_at: new Date(Date.now() - 45_000),
                expires_at: new Date(Date.now() - 1000),
                status: 'EXPIRED',
                ip_address: ip,
            })),
        });

        await expect(otpService.requestOtp(freshPhone(), ip)).rejects.toThrow();
    });
});

describe('Token lifecycle (service + real DB)', () => {
    it('rotates to a new refresh token and invalidates the old one', async () => {
        const phone = freshPhone();
        const result = await verifyViaService(phone);
        if (result.outcome !== 'verified') throw new Error('expected verified');

        const rotated = await tokenService.rotateRefreshToken(result.tokens.refreshToken, {});
        expect(rotated.outcome).toBe('rotated');
        if (rotated.outcome !== 'rotated') return;
        expect(rotated.tokens.refreshToken).not.toBe(result.tokens.refreshToken);

        const replay = await tokenService.rotateRefreshToken(result.tokens.refreshToken, {});
        expect(replay.outcome).toBe('invalid');
    });

    it('rejects a stale (already-rotated-away) refresh token, without reviving or revoking the session', async () => {
        // See ADR-0013's "Reuse/rotation conflict": user_sessions keeps no hash history, so a
        // rotated-away token matches no row at all and is correctly rejected as 'invalid' - it
        // does NOT get flagged as 'reused' (that outcome is reserved for presenting a token whose
        // session was already explicitly revoked through another path - see the next test), and
        // it does NOT revoke the session it used to belong to, which keeps working under its new
        // hash for whoever holds the current token.
        const phone = freshPhone();
        const result = await verifyViaService(phone);
        if (result.outcome !== 'verified') throw new Error('expected verified');
        const sessionId = result.tokens.session.id;

        const rotated = await tokenService.rotateRefreshToken(result.tokens.refreshToken, {});
        expect(rotated.outcome).toBe('rotated');

        const replay = await tokenService.rotateRefreshToken(result.tokens.refreshToken, {});
        expect(replay.outcome).toBe('invalid');

        const session = await prisma.userSession.findUniqueOrThrow({ where: { id: sessionId } });
        expect(session.revoked_at).toBeNull();
        if (rotated.outcome === 'rotated') {
            const stillWorks = await tokenService.rotateRefreshToken(
                rotated.tokens.refreshToken,
                {},
            );
            expect(stillWorks.outcome).toBe('rotated');
        }
    });

    it('rejects an already-revoked session even presenting its still-current token', async () => {
        const phone = freshPhone();
        const result = await verifyViaService(phone);
        if (result.outcome !== 'verified') throw new Error('expected verified');

        await tokenService.revokeSessionByRefreshToken(result.tokens.refreshToken);
        const outcome = await tokenService.rotateRefreshToken(result.tokens.refreshToken, {});
        expect(outcome.outcome).toBe('reused');
    });

    it('never produces two valid refresh tokens from one concurrent rotation race', async () => {
        // The exact race a security review flagged: two refresh calls presenting the same
        // still-valid token at once (a retried request, or an attacker racing the legitimate
        // client). rotateRefreshToken locks the session row (SELECT ... FOR UPDATE) inside one
        // transaction, so the second transaction blocks until the first commits and then sees the
        // already-rotated hash - exactly one of the two calls may "win" with a usable new token.
        const phone = freshPhone();
        const result = await verifyViaService(phone);
        if (result.outcome !== 'verified') throw new Error('expected verified');

        const [a, b] = await Promise.all([
            tokenService.rotateRefreshToken(result.tokens.refreshToken, {}),
            tokenService.rotateRefreshToken(result.tokens.refreshToken, {}),
        ]);
        const outcomes = [a.outcome, b.outcome].sort();
        // Postgres's row lock serializes the two transactions: the second to acquire the lock
        // re-evaluates its WHERE clause against the now-committed row, whose hash has already
        // moved on to the winner's new token - so the loser's presented (stale) hash matches no
        // row at all ("invalid"), never a second "rotated" success from the same original token.
        expect(outcomes).toEqual(['invalid', 'rotated']);

        const winner = a.outcome === 'rotated' ? a : b;
        if (winner.outcome !== 'rotated') throw new Error('expected one rotated outcome');
        const followUp = await tokenService.rotateRefreshToken(winner.tokens.refreshToken, {});
        expect(followUp.outcome).toBe('rotated');
    });
});

describe('Logout, logout-all, and session management (service + real DB)', () => {
    it('logout revokes only the targeted session', async () => {
        const phone = freshPhone();
        const result = await verifyViaService(phone);
        if (result.outcome !== 'verified') throw new Error('expected verified');

        await authService.logout(result.tokens.refreshToken, result.tokens.session.user_id);
        const outcome = await tokenService.rotateRefreshToken(result.tokens.refreshToken, {});
        expect(outcome.outcome).toBe('reused');
    });

    it('logout-all revokes every active session for the user', async () => {
        const phone = freshPhone();
        const first = await verifyViaService(phone);
        if (first.outcome !== 'verified') throw new Error('expected verified');
        const userId = first.tokens.session.user_id;
        const second = await tokenService.issueSession(userId, ['CUSTOMER'], {});

        const revokedCount = await authService.logoutAll(userId);
        expect(revokedCount).toBe(2);

        const sessions = await prisma.userSession.findMany({ where: { user_id: userId } });
        expect(sessions.every((s) => s.revoked_at !== null)).toBe(true);
        void second;
    });

    it('lists only active sessions and lets a user revoke one of their own by id', async () => {
        const phone = freshPhone();
        const result = await verifyViaService(phone);
        if (result.outcome !== 'verified') throw new Error('expected verified');
        const userId = result.tokens.session.user_id;

        const before = await authService.listSessions(userId);
        expect(before).toHaveLength(1);

        const revoked = await authService.revokeSession(userId, before[0]!.id);
        expect(revoked).toBe(true);

        const after = await authService.listSessions(userId);
        expect(after).toHaveLength(0);
    });

    it('refuses to revoke a session belonging to a different user', async () => {
        const phoneA = freshPhone();
        const phoneB = freshPhone();
        const a = await verifyViaService(phoneA);
        const b = await verifyViaService(phoneB);
        if (a.outcome !== 'verified' || b.outcome !== 'verified')
            throw new Error('expected verified');

        const revoked = await authService.revokeSession(
            a.tokens.session.user_id,
            b.tokens.session.id,
        );
        expect(revoked).toBe(false);
        const bSessions = await authService.listSessions(b.tokens.session.user_id);
        expect(bSessions).toHaveLength(1);
    });
});

describe('Suspended accounts (service + real DB)', () => {
    it('rejects a refresh for a suspended account and revokes all of its sessions', async () => {
        const phone = freshPhone();
        const result = await verifyViaService(phone);
        if (result.outcome !== 'verified') throw new Error('expected verified');
        const userId = result.tokens.session.user_id;
        await tokenService.issueSession(userId, ['CUSTOMER'], {});

        await prisma.user.update({ where: { id: userId }, data: { is_active: false } });

        await expect(
            authService.refresh(result.tokens.refreshToken, { ipAddress: null, userAgent: null }),
        ).rejects.toThrow();

        const sessions = await prisma.userSession.findMany({ where: { user_id: userId } });
        expect(sessions.every((s) => s.revoked_at !== null)).toBe(true);
    });

    it('rejects login itself for a suspended account', async () => {
        const phone = freshPhone();
        const first = await verifyViaService(phone);
        if (first.outcome !== 'verified') throw new Error('expected verified');
        await prisma.user.update({
            where: { id: first.tokens.session.user_id },
            data: { is_active: false },
        });

        const second = await verifyViaService(phone);
        expect(second.outcome).toBe('account_suspended');
    });
});

describe('Admin role assignment (service + real DB)', () => {
    async function bootstrapAdmin(): Promise<{ userId: string; roles: string[] }> {
        // The first admin is a documented manual/seed-time step (see
        // docs/04-design/AUTHENTICATION-DESIGN.md), not a public endpoint - so the test
        // reproduces that step directly, exactly as an operator would.
        const phone = freshPhone();
        const result = await verifyViaService(phone);
        if (result.outcome !== 'verified') throw new Error('expected verified');
        await prisma.userRole.create({
            data: { user_id: result.tokens.session.user_id, role: 'ADMIN' },
        });
        return { userId: result.tokens.session.user_id, roles: ['CUSTOMER', 'ADMIN'] };
    }

    it('lets an ADMIN grant a role to another user, audit-logged', async () => {
        const admin = await bootstrapAdmin();
        const targetPhone = freshPhone();
        const target = await verifyViaService(targetPhone);
        if (target.outcome !== 'verified') throw new Error('expected verified');

        await adminRolesController.updateRole(
            target.tokens.session.user_id,
            { role: 'MERCHANT_OWNER', action: 'GRANT' },
            { id: admin.userId, roles: admin.roles, sessionId: 's' },
        );

        const roles = await prisma.userRole.findMany({
            where: { user_id: target.tokens.session.user_id },
        });
        expect(roles.map((r) => r.role)).toContain('MERCHANT_OWNER');
        const audit = await prisma.auditLog.findFirstOrThrow({
            where: { action: 'AUTH_ROLE_GRANTED', entity_id: target.tokens.session.user_id },
        });
        expect(audit.actor_user_id).toBe(admin.userId);
    });

    it('refuses an ADMIN (non-SUPER_ADMIN) granting SUPER_ADMIN to anyone, including themself', async () => {
        const admin = await bootstrapAdmin();

        await expect(
            adminRolesController.updateRole(
                admin.userId,
                { role: 'SUPER_ADMIN', action: 'GRANT' },
                { id: admin.userId, roles: admin.roles, sessionId: 's' },
            ),
        ).rejects.toThrow();

        const roles = await prisma.userRole.findMany({ where: { user_id: admin.userId } });
        expect(roles.map((r) => r.role)).not.toContain('SUPER_ADMIN');
    });

    it('never lets registration or self-service grant ADMIN or SUPER_ADMIN', async () => {
        const phone = freshPhone();
        const result = await verifyViaService(phone);
        if (result.outcome !== 'verified') throw new Error('expected verified');
        expect(result.isNewAccount).toBe(true);

        const roles = await prisma.userRole.findMany({
            where: { user_id: result.tokens.session.user_id },
        });
        expect(roles.map((r) => r.role)).toEqual(['CUSTOMER']);
    });

    it('revoking a role forces every session of the target user to be revoked immediately', async () => {
        // Access tokens otherwise keep whatever roles they were issued with until they naturally
        // expire (ACCESS_TOKEN_TTL_SECONDS) regardless of later role changes - an accepted tradeoff
        // for an ordinary logout/suspension, but a de-admin'd user retaining admin capability, even
        // briefly, is judged unacceptable. See ADR-0013 and AUTHENTICATION-DESIGN.md.
        const admin = await bootstrapAdmin();
        const target = await verifyViaService(freshPhone());
        if (target.outcome !== 'verified') throw new Error('expected verified');
        const targetUserId = target.tokens.session.user_id;
        await adminRolesController.updateRole(
            targetUserId,
            { role: 'MERCHANT_OWNER', action: 'GRANT' },
            { id: admin.userId, roles: admin.roles, sessionId: 's' },
        );

        await adminRolesController.updateRole(
            targetUserId,
            { role: 'MERCHANT_OWNER', action: 'REVOKE' },
            { id: admin.userId, roles: admin.roles, sessionId: 's' },
        );

        const sessions = await prisma.userSession.findMany({ where: { user_id: targetUserId } });
        expect(sessions.length).toBeGreaterThan(0);
        expect(sessions.every((s) => s.revoked_at !== null)).toBe(true);
        const refreshOutcome = await tokenService.rotateRefreshToken(
            target.tokens.refreshToken,
            {},
        );
        expect(refreshOutcome.outcome).toBe('reused');
    });

    it("granting a role does not revoke the target user's existing sessions", async () => {
        const admin = await bootstrapAdmin();
        const target = await verifyViaService(freshPhone());
        if (target.outcome !== 'verified') throw new Error('expected verified');

        await adminRolesController.updateRole(
            target.tokens.session.user_id,
            { role: 'MERCHANT_OWNER', action: 'GRANT' },
            { id: admin.userId, roles: admin.roles, sessionId: 's' },
        );

        const refreshOutcome = await tokenService.rotateRefreshToken(
            target.tokens.refreshToken,
            {},
        );
        expect(refreshOutcome.outcome).toBe('rotated');
    });
});

describe('Merchant cross-tenant isolation (MerchantAccessGuard + real DB)', () => {
    async function makeMerchantWithOwner() {
        const owner = await prisma.user.create({ data: { phone: freshPhone() } });
        const merchant = await prisma.merchant.create({
            data: {
                owner_user_id: owner.id,
                legal_name: 'x',
                display_name: 'x',
                contact_phone: '1',
                business_address: 'x',
            },
        });
        const storeId = randomUUID();
        await prisma.$executeRaw`
            INSERT INTO "stores" (id, merchant_id, name, address, district, city, location, status)
            VALUES (${storeId}::uuid, ${merchant.id}::uuid, 'x', 'x', 'x', 'x',
                ST_SetSRID(ST_MakePoint(92.5, 24.8), 4326)::geography, 'ACTIVE')
        `;
        return { owner, merchant, storeId };
    }

    function contextFor(userId: string, params: Record<string, string>) {
        return {
            switchToHttp: () => ({
                getRequest: () => ({ user: { id: userId, roles: [], sessionId: 's' }, params }),
            }),
        } as never;
    }

    it('allows the merchant owner', async () => {
        const { owner, merchant } = await makeMerchantWithOwner();
        await expect(
            merchantGuard.canActivate(contextFor(owner.id, { merchantId: merchant.id })),
        ).resolves.toBe(true);
    });

    it('allows merchant staff resolved via the storeId param', async () => {
        const { merchant, storeId } = await makeMerchantWithOwner();
        const staffUser = await prisma.user.create({ data: { phone: freshPhone() } });
        await prisma.merchantStaff.create({
            data: { merchant_id: merchant.id, user_id: staffUser.id, role: 'STAFF' },
        });

        await expect(
            merchantGuard.canActivate(contextFor(staffUser.id, { storeId })),
        ).resolves.toBe(true);
    });

    it('denies an unrelated user - no cross-tenant leakage', async () => {
        const { merchant } = await makeMerchantWithOwner();
        const outsider = await prisma.user.create({ data: { phone: freshPhone() } });

        await expect(
            merchantGuard.canActivate(contextFor(outsider.id, { merchantId: merchant.id })),
        ).rejects.toThrow();
    });
});
