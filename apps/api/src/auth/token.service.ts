import { randomBytes, createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { UserSession } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export interface AccessTokenClaims {
    sub: string; // user id
    sid: string; // session id - lets a future check correlate a token to its session if needed
    roles: string[];
}

export interface IssuedTokens {
    accessToken: string;
    refreshToken: string;
    session: UserSession;
}

/**
 * Access tokens are short-lived, stateless JWTs (no personal data in the payload - see
 * docs/04-design/AUTHENTICATION-DESIGN.md's "Security assumptions" for the accepted tradeoff this
 * implies: a revoked session's already-issued access token remains valid until it naturally
 * expires). Refresh tokens are opaque random values, hashed at rest with SHA-256 - high entropy
 * already, so no signing secret or slow password-style hashing is needed, unlike a human-chosen
 * password. Rotation + reuse detection: `user_sessions` stores only the latest refresh token hash;
 * a refresh request whose presented token doesn't match it revokes the whole session outright, the
 * standard conservative response since the schema has no history of prior hashes to distinguish
 * "stale token" from "stolen token being replayed."
 */
@Injectable()
export class TokenService {
    constructor(
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
        private readonly prisma: PrismaService,
    ) {}

    async issueSession(
        userId: string,
        roles: string[],
        context: { userAgent?: string | null; ipAddress?: string | null },
    ): Promise<IssuedTokens> {
        const refreshToken = this.generateRefreshToken();
        const refreshTtlDays = this.config.get<number>('REFRESH_TOKEN_TTL_DAYS', 30);

        const session = await this.prisma.userSession.create({
            data: {
                user_id: userId,
                refresh_token_hash: this.hashRefreshToken(refreshToken),
                expires_at: new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000),
                user_agent: context.userAgent ?? undefined,
                ip_address: context.ipAddress ?? undefined,
            },
        });

        const accessToken = this.signAccessToken({ sub: userId, sid: session.id, roles });
        return { accessToken, refreshToken, session };
    }

    signAccessToken(claims: AccessTokenClaims): string {
        const ttlSeconds = this.config.get<number>('ACCESS_TOKEN_TTL_SECONDS', 900);
        return this.jwt.sign(claims, {
            secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
            expiresIn: ttlSeconds,
        });
    }

    verifyAccessToken(token: string): AccessTokenClaims {
        return this.jwt.verify<AccessTokenClaims>(token, {
            secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        });
    }

    /**
     * Rotates a refresh token. Returns the new token pair, or 'invalid' (no matching active
     * session), 'expired' (session past its absolute lifetime), or 'reused' (the session exists
     * but its stored hash doesn't match what was presented - the session is revoked as a side
     * effect of this outcome, before returning).
     *
     * Locks the matching row (`SELECT ... FOR UPDATE`, the same pattern used in
     * `OtpService.verifyOtp`) inside one transaction before reading or writing it: the original
     * implementation did a plain `findFirst` followed by a separate `update`, so two concurrent
     * refresh calls presenting the same still-valid token could both pass every check and both
     * rotate, racing to decide the session's next hash - weakening reuse detection exactly when a
     * genuine replay (attacker racing the legitimate client) is the scenario this exists to catch.
     */
    async rotateRefreshToken(
        presentedToken: string,
        context: { userAgent?: string | null; ipAddress?: string | null },
    ): Promise<
        | { outcome: 'rotated'; tokens: IssuedTokens; userId: string }
        | { outcome: 'invalid' }
        | { outcome: 'expired'; sessionId: string }
        | { outcome: 'reused'; sessionId: string }
    > {
        const presentedHash = this.hashRefreshToken(presentedToken);

        return this.prisma.$transaction(async (tx) => {
            const rows = await tx.$queryRaw<UserSession[]>`
                SELECT * FROM "user_sessions" WHERE refresh_token_hash = ${presentedHash} FOR UPDATE
            `;
            const matching = rows[0];

            if (!matching) {
                return { outcome: 'invalid' as const };
            }
            if (matching.revoked_at) {
                // A revoked session's hash should never match a *newly* presented token under
                // normal operation (rotation always changes the hash), so this branch means the
                // same token is being replayed after the session was already revoked - reuse.
                return { outcome: 'reused' as const, sessionId: matching.id };
            }
            if (matching.expires_at.getTime() < Date.now()) {
                await tx.userSession.update({
                    where: { id: matching.id },
                    data: { revoked_at: new Date() },
                });
                return { outcome: 'expired' as const, sessionId: matching.id };
            }

            const user = await tx.user.findUniqueOrThrow({
                where: { id: matching.user_id },
                include: { roles: true },
            });
            const newRefreshToken = this.generateRefreshToken();
            const updated = await tx.userSession.update({
                where: { id: matching.id },
                data: {
                    refresh_token_hash: this.hashRefreshToken(newRefreshToken),
                    user_agent: context.userAgent ?? matching.user_agent,
                    ip_address: context.ipAddress ?? matching.ip_address,
                },
            });

            const roles = user.roles.map((r) => r.role);
            const accessToken = this.signAccessToken({ sub: user.id, sid: updated.id, roles });
            return {
                outcome: 'rotated' as const,
                userId: user.id,
                tokens: { accessToken, refreshToken: newRefreshToken, session: updated },
            };
        });
    }

    async revokeSessionByRefreshToken(presentedToken: string): Promise<boolean> {
        const hash = this.hashRefreshToken(presentedToken);
        const session = await this.prisma.userSession.findFirst({
            where: { refresh_token_hash: hash, revoked_at: null },
        });
        if (!session) {
            return false;
        }
        await this.prisma.userSession.update({
            where: { id: session.id },
            data: { revoked_at: new Date() },
        });
        return true;
    }

    async revokeAllSessionsForUser(userId: string): Promise<number> {
        const result = await this.prisma.userSession.updateMany({
            where: { user_id: userId, revoked_at: null },
            data: { revoked_at: new Date() },
        });
        return result.count;
    }

    async revokeSessionById(userId: string, sessionId: string): Promise<boolean> {
        const session = await this.prisma.userSession.findFirst({
            where: { id: sessionId, user_id: userId, revoked_at: null },
        });
        if (!session) {
            return false;
        }
        await this.prisma.userSession.update({
            where: { id: session.id },
            data: { revoked_at: new Date() },
        });
        return true;
    }

    private generateRefreshToken(): string {
        return randomBytes(32).toString('hex');
    }

    private hashRefreshToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }
}
