import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { OtpService } from './otp.service.js';
import type { OtpProvider } from './otp-provider.interface.js';

function makeConfig(overrides: Record<string, unknown> = {}): ConfigService {
    const values: Record<string, unknown> = {
        OTP_HASH_SECRET: 'unit-test-otp-secret-at-least-32-chars-long',
        OTP_CODE_LENGTH: 6,
        OTP_EXPIRY_SECONDS: 300,
        OTP_MAX_ATTEMPTS: 5,
        OTP_RESEND_COOLDOWN_SECONDS: 30,
        OTP_PER_PHONE_HOURLY_LIMIT: 5,
        OTP_PER_IP_HOURLY_LIMIT: 20,
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

interface FakeChallengeRow {
    id: string;
    expires_at: Date;
    attempt_count: number;
    max_attempts: number;
    code_hash: string;
}

/**
 * verifyOtp runs entirely inside prisma.$transaction(tx => ...), using tx.$queryRaw to lock the
 * row (see otp.service.ts) and tx.otpChallenge.update for writes - so the mock's `tx` must support
 * both, and $transaction must actually invoke the callback with it (not just resolve a value).
 */
interface FakeTx {
    $queryRaw: (...args: unknown[]) => Promise<FakeChallengeRow[]>;
    otpChallenge: { update: (...args: unknown[]) => Promise<Record<string, unknown>> };
}

function makeVerifyPrisma(options: {
    queryRawResult: FakeChallengeRow[];
    update?: (data: Record<string, unknown>) => Record<string, unknown>;
}) {
    const update = jest.fn((async (args: { data: Record<string, unknown> }) =>
        (options.update ?? ((d) => d))(args.data)) as never);
    const tx = {
        $queryRaw: jest.fn((async () => options.queryRawResult) as never),
        otpChallenge: { update },
    } as unknown as FakeTx;
    return {
        prisma: {
            $transaction: jest.fn((async (callback: (tx: FakeTx) => unknown) =>
                callback(tx)) as never),
        } as never,
        update,
    };
}

function makeRequestPrisma(options?: {
    findFirst?: () => Promise<{ created_at: Date } | null>;
    create?: (data: { code_hash: string }) => Promise<unknown>;
    count?: () => Promise<number>;
}) {
    return {
        otpChallenge: {
            findFirst: jest.fn(options?.findFirst ?? (async () => null)),
            create: jest.fn((async (args: { data: { code_hash: string } }) =>
                (options?.create ?? (async () => ({})))(args.data)) as never),
            count: jest.fn(options?.count ?? (async () => 0)),
        },
    } as never;
}

function makeProvider() {
    const send = jest.fn((async () => ({ provider: 'test' })) as never) as jest.Mock;
    return { name: 'test', send } as unknown as OtpProvider & { send: typeof send };
}

describe('OtpService', () => {
    describe('requestOtp', () => {
        it('creates a challenge and sends the code when there is no recent request', async () => {
            const prisma = makeRequestPrisma();
            const provider = makeProvider();
            const service = new OtpService(prisma, makeConfig(), provider);

            const result = await service.requestOtp('+919876543210', '1.2.3.4');

            expect(result.outcome).toBe('sent');
            expect(provider.send).toHaveBeenCalledTimes(1);
            const [, code] = provider.send.mock.calls[0] as [string, string];
            expect(code).toMatch(/^\d{6}$/);
        });

        it('returns a cooldown outcome when the resend cooldown has not elapsed', async () => {
            const prisma = makeRequestPrisma({
                findFirst: async () => ({ created_at: new Date() }),
            });
            const provider = makeProvider();
            const service = new OtpService(
                prisma,
                makeConfig({ OTP_RESEND_COOLDOWN_SECONDS: 30 }),
                provider,
            );

            const result = await service.requestOtp('+919876543210', null);

            expect(result.outcome).toBe('cooldown');
            expect(provider.send).not.toHaveBeenCalled();
        });

        it('rejects once the per-phone hourly limit is reached', async () => {
            const prisma = makeRequestPrisma({ count: async () => 5 });
            const provider = makeProvider();
            const service = new OtpService(
                prisma,
                makeConfig({ OTP_PER_PHONE_HOURLY_LIMIT: 5 }),
                provider,
            );

            await expect(service.requestOtp('+919876543210', null)).rejects.toThrow();
            expect(provider.send).not.toHaveBeenCalled();
        });
    });

    describe('verifyOtp', () => {
        it('reports not_found when there is no pending challenge', async () => {
            const { prisma } = makeVerifyPrisma({ queryRawResult: [] });
            const service = new OtpService(prisma, makeConfig(), makeProvider());

            const result = await service.verifyOtp('+919876543210', '123456');
            expect(result.outcome).toBe('not_found');
        });

        it('reports expired and marks the challenge expired', async () => {
            const { prisma, update } = makeVerifyPrisma({
                queryRawResult: [
                    {
                        id: 'otp-1',
                        expires_at: new Date(Date.now() - 1000),
                        attempt_count: 0,
                        max_attempts: 5,
                        code_hash: 'irrelevant',
                    },
                ],
            });
            const service = new OtpService(prisma, makeConfig(), makeProvider());

            const result = await service.verifyOtp('+919876543210', '123456');
            expect(result.outcome).toBe('expired');
            expect(update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { status: 'EXPIRED' } }),
            );
        });

        it('reports locked once attempt_count already reached max_attempts', async () => {
            const { prisma } = makeVerifyPrisma({
                queryRawResult: [
                    {
                        id: 'otp-1',
                        expires_at: new Date(Date.now() + 100_000),
                        attempt_count: 5,
                        max_attempts: 5,
                        code_hash: 'irrelevant',
                    },
                ],
            });
            const service = new OtpService(prisma, makeConfig(), makeProvider());

            const result = await service.verifyOtp('+919876543210', '123456');
            expect(result.outcome).toBe('locked');
        });

        it('verifies a correct code against its own stored hash', async () => {
            // Exercises the real hashing path: request an OTP to capture its real hash, then
            // verify with the code the provider "sent" - a genuine round-trip, not a mocked result.
            let storedHash = '';
            const requestPrisma = makeRequestPrisma({
                create: async (data) => {
                    storedHash = data.code_hash;
                    return {};
                },
            });
            const provider = makeProvider();
            const requestingService = new OtpService(requestPrisma, makeConfig(), provider);
            await requestingService.requestOtp('+919876543210', null);
            const [, sentCode] = provider.send.mock.calls[0] as [string, string];

            const { prisma } = makeVerifyPrisma({
                queryRawResult: [
                    {
                        id: 'otp-1',
                        expires_at: new Date(Date.now() + 100_000),
                        attempt_count: 0,
                        max_attempts: 5,
                        code_hash: storedHash,
                    },
                ],
            });
            const verifyingService = new OtpService(prisma, makeConfig(), makeProvider());

            const result = await verifyingService.verifyOtp('+919876543210', sentCode);
            expect(result.outcome).toBe('verified');
        });

        it('rejects an incorrect code and decrements attempts remaining', async () => {
            const { prisma, update } = makeVerifyPrisma({
                queryRawResult: [
                    {
                        id: 'otp-1',
                        expires_at: new Date(Date.now() + 100_000),
                        attempt_count: 0,
                        max_attempts: 5,
                        code_hash: 'does-not-match-anything',
                    },
                ],
                update: () => ({ max_attempts: 5, attempt_count: 1 }),
            });
            const service = new OtpService(prisma, makeConfig(), makeProvider());

            const result = await service.verifyOtp('+919876543210', '000000');
            expect(result.outcome).toBe('invalid');
            if (result.outcome === 'invalid') {
                expect(result.attemptsRemaining).toBe(4);
            }
            expect(update).toHaveBeenCalled();
        });
    });
});
