import { jest } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service.js';

function makeConfig(overrides: Record<string, unknown> = {}): ConfigService {
    const values: Record<string, unknown> = {
        JWT_ACCESS_SECRET: 'unit-test-secret-at-least-32-chars-long',
        ACCESS_TOKEN_TTL_SECONDS: 900,
        REFRESH_TOKEN_TTL_DAYS: 30,
        ...overrides,
    };
    return {
        get: (key: string, fallback?: unknown) => values[key] ?? fallback,
        getOrThrow: (key: string) => {
            if (values[key] === undefined) throw new Error(`Missing config: ${key}`);
            return values[key];
        },
    } as unknown as ConfigService;
}

describe('TokenService', () => {
    describe('access tokens', () => {
        it('signs a token that verifies back to the same claims', () => {
            const jwt = new JwtService({});
            const config = makeConfig();
            const prisma = {} as never;
            const service = new TokenService(jwt, config, prisma);

            const token = service.signAccessToken({
                sub: 'user-1',
                sid: 'session-1',
                roles: ['CUSTOMER'],
            });
            const claims = service.verifyAccessToken(token);

            expect(claims.sub).toBe('user-1');
            expect(claims.sid).toBe('session-1');
            expect(claims.roles).toEqual(['CUSTOMER']);
        });

        it('rejects a token signed with a different secret', () => {
            const jwt = new JwtService({});
            const prisma = {} as never;
            const signer = new TokenService(
                jwt,
                makeConfig({ JWT_ACCESS_SECRET: 'secret-a-at-least-32-characters-long' }),
                prisma,
            );
            const verifier = new TokenService(
                jwt,
                makeConfig({ JWT_ACCESS_SECRET: 'secret-b-at-least-32-characters-long' }),
                prisma,
            );

            const token = signer.signAccessToken({ sub: 'user-1', sid: 'session-1', roles: [] });
            expect(() => verifier.verifyAccessToken(token)).toThrow();
        });

        it('rejects an expired token', () => {
            const jwt = new JwtService({});
            const prisma = {} as never;
            const config = makeConfig({ ACCESS_TOKEN_TTL_SECONDS: -1 });
            const service = new TokenService(jwt, config, prisma);

            const token = service.signAccessToken({ sub: 'user-1', sid: 'session-1', roles: [] });
            expect(() => service.verifyAccessToken(token)).toThrow();
        });
    });

    describe('refresh token rotation', () => {
        it('reports "invalid" when no session matches the presented token', async () => {
            const prisma = {
                userSession: { findFirst: jest.fn(async () => null) },
            } as never;
            const service = new TokenService(new JwtService({}), makeConfig(), prisma);

            const result = await service.rotateRefreshToken('nonexistent-token', {});
            expect(result.outcome).toBe('invalid');
        });

        it('reports "reused" when the matching session was already revoked', async () => {
            const prisma = {
                userSession: {
                    findFirst: jest.fn(async () => ({
                        id: 'session-1',
                        revoked_at: new Date(),
                        expires_at: new Date(Date.now() + 1_000_000),
                    })),
                },
            } as never;
            const service = new TokenService(new JwtService({}), makeConfig(), prisma);

            const result = await service.rotateRefreshToken('some-token', {});
            expect(result.outcome).toBe('reused');
        });

        it('reports "expired" and revokes the session when past its absolute lifetime', async () => {
            const update = jest.fn(async () => ({}));
            const prisma = {
                userSession: {
                    findFirst: jest.fn(async () => ({
                        id: 'session-1',
                        revoked_at: null,
                        expires_at: new Date(Date.now() - 1_000),
                    })),
                    update,
                },
            } as never;
            const service = new TokenService(new JwtService({}), makeConfig(), prisma);

            const result = await service.rotateRefreshToken('some-token', {});
            expect(result.outcome).toBe('expired');
            expect(update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ revoked_at: expect.any(Date) }),
                }),
            );
        });

        it('rotates to a new token pair for a valid, active session', async () => {
            const session = {
                id: 'session-1',
                user_id: 'user-1',
                revoked_at: null,
                expires_at: new Date(Date.now() + 1_000_000),
                user_agent: null,
                ip_address: null,
            };
            const updatedSession = { ...session, refresh_token_hash: 'new-hash' };
            const prisma = {
                userSession: {
                    findFirst: jest.fn(async () => session),
                    update: jest.fn(async () => updatedSession),
                },
                user: {
                    findUniqueOrThrow: jest.fn(async () => ({
                        id: 'user-1',
                        roles: [{ role: 'CUSTOMER' }],
                    })),
                },
            } as never;
            const service = new TokenService(new JwtService({}), makeConfig(), prisma);

            const result = await service.rotateRefreshToken('old-token', {});
            expect(result.outcome).toBe('rotated');
            if (result.outcome === 'rotated') {
                expect(result.userId).toBe('user-1');
                expect(result.tokens.refreshToken).not.toBe('old-token');
                const claims = service.verifyAccessToken(result.tokens.accessToken);
                expect(claims.roles).toEqual(['CUSTOMER']);
            }
        });
    });
});
