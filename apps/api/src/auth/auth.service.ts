import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { OtpService } from './otp/otp.service.js';
import { TokenService, type IssuedTokens } from './token.service.js';
import { normalizePhoneNumber } from './phone.util.js';

export interface RequestContext {
    ipAddress: string | null;
    userAgent: string | null;
}

export type RequestOtpOutcome =
    { outcome: 'sent' } | { outcome: 'cooldown'; retryAfterSeconds: number };

export type VerifyOtpOutcome =
    | { outcome: 'verified'; tokens: IssuedTokens; isNewAccount: boolean }
    | { outcome: 'invalid' }
    | { outcome: 'expired' }
    | { outcome: 'locked' }
    | { outcome: 'account_suspended' };

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly otp: OtpService,
        private readonly tokens: TokenService,
        private readonly audit: AuditService,
    ) {}

    async requestOtp(rawPhone: string, context: RequestContext): Promise<RequestOtpOutcome> {
        const phone = normalizePhoneNumber(rawPhone);
        const result = await this.otp.requestOtp(phone, context.ipAddress);
        await this.audit.record({
            action: 'AUTH_OTP_REQUESTED',
            entityType: 'phone',
            entityId: phone,
            afterState: { outcome: result.outcome },
        });
        return result;
    }

    /**
     * Verifies the OTP and either logs an existing user in or registers a new one - the same flow
     * for both, per FR-AUTH-001: a phone number that has never completed verification before
     * becomes a new CUSTOMER account the moment its first OTP is verified. New registrations never
     * receive any role beyond CUSTOMER - elevated roles are granted only through the dedicated,
     * audited admin endpoint (see RolesController), never through this flow.
     */
    async verifyOtpAndAuthenticate(
        rawPhone: string,
        code: string,
        context: RequestContext,
    ): Promise<VerifyOtpOutcome> {
        const phone = normalizePhoneNumber(rawPhone);
        const result = await this.otp.verifyOtp(phone, code);

        if (result.outcome !== 'verified') {
            await this.audit.record({
                action: 'AUTH_OTP_VERIFICATION_FAILED',
                entityType: 'phone',
                entityId: phone,
                afterState: { outcome: result.outcome },
            });
            // 'not_found' and 'invalid' are both reported as the same outcome to the caller - see
            // the controller - so a client can never distinguish "wrong code" from "no OTP was
            // ever requested for this phone," which would otherwise leak account/request state.
            if (result.outcome === 'not_found') {
                return { outcome: 'invalid' };
            }
            return result;
        }

        const { user, isNewAccount } = await this.findOrCreateUser(phone);

        if (!user.is_active) {
            await this.audit.record({
                actorUserId: user.id,
                action: 'AUTH_LOGIN_REJECTED_SUSPENDED',
                entityType: 'user',
                entityId: user.id,
            });
            return { outcome: 'account_suspended' };
        }

        const roles = await this.prisma.userRole.findMany({ where: { user_id: user.id } });
        const tokens = await this.tokens.issueSession(
            user.id,
            roles.map((r) => r.role),
            context,
        );

        await this.audit.record({
            actorUserId: user.id,
            action: isNewAccount ? 'AUTH_USER_REGISTERED' : 'AUTH_LOGIN_SUCCEEDED',
            entityType: 'user',
            entityId: user.id,
        });

        return { outcome: 'verified', tokens, isNewAccount };
    }

    async refresh(refreshToken: string, context: RequestContext) {
        const result = await this.tokens.rotateRefreshToken(refreshToken, context);

        if (result.outcome === 'reused') {
            await this.audit.record({
                action: 'AUTH_REFRESH_TOKEN_REUSE_DETECTED',
                entityType: 'refresh_token',
                entityId: 'redacted',
            });
            throw new UnauthorizedException('This session has been revoked.');
        }
        if (result.outcome === 'invalid') {
            throw new UnauthorizedException('Invalid refresh token.');
        }
        if (result.outcome === 'expired') {
            throw new UnauthorizedException('This session has expired. Please log in again.');
        }

        const user = await this.prisma.user.findUnique({ where: { id: result.userId } });
        if (!user?.is_active) {
            await this.tokens.revokeAllSessionsForUser(result.userId);
            throw new ForbiddenException('This account is suspended.');
        }

        return result.tokens;
    }

    async logout(refreshToken: string, userId: string): Promise<void> {
        const revoked = await this.tokens.revokeSessionByRefreshToken(refreshToken);
        await this.audit.record({
            actorUserId: userId,
            action: 'AUTH_LOGOUT',
            entityType: 'user',
            entityId: userId,
            afterState: { revoked },
        });
    }

    async logoutAll(userId: string): Promise<number> {
        const count = await this.tokens.revokeAllSessionsForUser(userId);
        await this.audit.record({
            actorUserId: userId,
            action: 'AUTH_LOGOUT_ALL',
            entityType: 'user',
            entityId: userId,
            afterState: { sessionsRevoked: count },
        });
        return count;
    }

    async listSessions(userId: string) {
        return this.prisma.userSession.findMany({
            where: { user_id: userId, revoked_at: null },
            orderBy: { issued_at: 'desc' },
            select: {
                id: true,
                issued_at: true,
                expires_at: true,
                user_agent: true,
                ip_address: true,
            },
        });
    }

    async revokeSession(userId: string, sessionId: string): Promise<boolean> {
        const revoked = await this.tokens.revokeSessionById(userId, sessionId);
        if (revoked) {
            await this.audit.record({
                actorUserId: userId,
                action: 'AUTH_SESSION_REVOKED',
                entityType: 'user_session',
                entityId: sessionId,
            });
        }
        return revoked;
    }

    async getMe(userId: string) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            include: { roles: true },
        });
        return {
            id: user.id,
            phone: user.phone,
            fullName: user.full_name,
            isActive: user.is_active,
            roles: user.roles.map((r) => r.role),
        };
    }

    /**
     * Concurrency-safe: two simultaneous first-time verifications for the same phone number race
     * to INSERT, but users.phone is UNIQUE - the loser's create() throws, and is retried as a
     * plain lookup, which now finds the winner's row. Never two accounts for one phone number.
     */
    private async findOrCreateUser(
        phone: string,
    ): Promise<{ user: { id: string; is_active: boolean }; isNewAccount: boolean }> {
        const existing = await this.prisma.user.findUnique({ where: { phone } });
        if (existing) {
            return { user: existing, isNewAccount: false };
        }

        try {
            const created = await this.prisma.$transaction(async (tx) => {
                const user = await tx.user.create({ data: { phone } });
                await tx.userRole.create({ data: { user_id: user.id, role: 'CUSTOMER' } });
                return user;
            });
            return { user: created, isNewAccount: true };
        } catch {
            const user = await this.prisma.user.findUniqueOrThrow({ where: { phone } });
            return { user, isNewAccount: false };
        }
    }
}
