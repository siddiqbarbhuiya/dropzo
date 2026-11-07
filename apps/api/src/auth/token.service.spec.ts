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

    /**
     * rotateRefreshToken runs entirely inside prisma.$transaction(tx => ...), locking the matching
     * row via tx.$queryRaw (see token.service.ts) and writing via tx.userSession.update - so the
     * mock's `tx` must support both, and $transaction must actually invoke the callback with it.
     */
    interface RotationTx {
        $queryRaw: (...args: unknown[]) => Promise<Array<Record<string, unknown>>>;
        userSession: { update: (...args: unknown[]) => Promise<Record<string, unknown>> };
        user: { findUniqueOrThrow: (...args: unknown[]) => Promise<Record<string, unknown>> };
    }

    function makeRotationPrisma(options: {
        queryRawResult: Array<Record<string, unknown>>;
        update?: (data: Record<string, unknown>) => Record<string, unknown>;
        findUniqueOrThrow?: () => Promise<Record<string, unknown>>;
    }) {
        const update = jest.fn((async (args: { data: Record<string, unknown> }) =>
            (options.update ?? ((d) => d))(args.data)) as never);
        const tx = {
            $queryRaw: jest.fn((async () => options.queryRawResult) as never),
            userSession: { update },
            user: {
                findUniqueOrThrow: jest.fn(
                    (options.findUniqueOrThrow ?? (async () => ({}))) as never,
                ),
            },
        } as unknown as RotationTx;
        return {
            prisma: {
                $transaction: jest.fn((async (callback: (tx: RotationTx) => unknown) =>
                    callback(tx)) as never),
            } as never,
            update,
        };
    }

    describe('refresh token rotation', () => {
        it('reports "invalid" when no session matches the presented token', async () => {
            const { prisma } = makeRotationPrisma({ queryRawResult: [] });
            const service = new TokenService(new JwtService({}), makeConfig(), prisma);

            const result = await service.rotateRefreshToken('nonexistent-token', {});
            expect(result.outcome).toBe('invalid');
        });

        it('reports "reused" when the matching session was already revoked', async () => {
            const { prisma } = makeRotationPrisma({
                queryRawResult: [
                    {
                        id: 'session-1',
                        revoked_at: new Date(),
                        expires_at: new Date(Date.now() + 1_000_000),
                    },
                ],
            });
            const service = new TokenService(new JwtService({}), makeConfig(), prisma);

            const result = await service.rotateRefreshToken('some-token', {});
            expect(result.outcome).toBe('reused');
        });

        it('reports "expired" and revokes the session when past its absolute lifetime', async () => {
            const { prisma, update } = makeRotationPrisma({
                queryRawResult: [
                    {
                        id: 'session-1',
                        revoked_at: null,
                        expires_at: new Date(Date.now() - 1_000),
                    },
                ],
            });
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
            const { prisma } = makeRotationPrisma({
                queryRawResult: [session],
                update: (data) => ({ ...session, ...data }),
                findUniqueOrThrow: async () => ({ id: 'user-1', roles: [{ role: 'CUSTOMER' }] }),
            });
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
