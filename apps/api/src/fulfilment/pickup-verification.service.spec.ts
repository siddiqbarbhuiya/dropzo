import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PickupVerificationService } from './pickup-verification.service.js';

function makeConfig() {
    return {
        getOrThrow: jest.fn(() => 'test-secret-at-least-32-characters-long'),
    } as never;
}

describe('PickupVerificationService', () => {
    describe('generateForOrder', () => {
        it('stores only a hash, never the plaintext code', async () => {
            const create = jest.fn(async (args: { data: Record<string, unknown> }) => ({
                id: 'pv-1',
                ...args.data,
            }));
            const tx = { pickupVerification: { create } } as never;
            const service = new PickupVerificationService({} as never, makeConfig());

            const code = await service.generateForOrder(tx, 'order-1');

            expect(code).toMatch(/^\d{6}$/);
            const stored = (create.mock.calls[0]![0] as { data: { code_hash: string } }).data;
            expect(stored.code_hash).not.toBe(code);
            expect(stored.code_hash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex digest
        });
    });

    describe('verify', () => {
        async function setupWithCode(tx: Record<string, unknown>) {
            const service = new PickupVerificationService({} as never, makeConfig());
            const code = await service.generateForOrder(tx as never, 'order-1');
            return { service, code };
        }

        function makeVerificationRow(overrides: Record<string, unknown> = {}) {
            return {
                id: 'pv-1',
                code_hash: '',
                expires_at: new Date(Date.now() + 1000),
                verified_at: null,
                attempt_count: 0,
                max_attempts: 5,
                ...overrides,
            };
        }

        it('verifies a correct code exactly once and invalidates it', async () => {
            const row = makeVerificationRow();
            const update = jest.fn(async () => ({ ...row, verified_at: new Date() }));
            const tx = {
                pickupVerification: {
                    create: jest.fn(async (a: { data: Record<string, unknown> }) => {
                        row.code_hash = a.data.code_hash as string;
                        return row;
                    }),
                    update,
                },
                $queryRaw: jest.fn(async () => [row]),
            };
            const { service, code } = await setupWithCode(tx);

            const outcome = await service.verify(tx as never, 'order-1', code);
            expect(outcome).toEqual({ outcome: 'verified' });
            expect(update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { verified_at: expect.any(Date) } }),
            );
        });

        it('rejects an incorrect code and tracks remaining attempts', async () => {
            const row = makeVerificationRow();
            const tx = {
                pickupVerification: {
                    create: jest.fn(async (a: { data: Record<string, unknown> }) => {
                        row.code_hash = a.data.code_hash as string;
                        return row;
                    }),
                    update: jest.fn(async () => ({ ...row, attempt_count: 1, max_attempts: 5 })),
                },
                $queryRaw: jest.fn(async () => [row]),
            };
            const { service } = await setupWithCode(tx);

            const outcome = await service.verify(tx as never, 'order-1', '000000');
            expect(outcome).toEqual({ outcome: 'invalid', attemptsRemaining: 4 });
        });

        it('locks out after max attempts', async () => {
            const row = makeVerificationRow({ attempt_count: 5, max_attempts: 5 });
            const tx = {
                pickupVerification: { update: jest.fn() },
                $queryRaw: jest.fn(async () => [row]),
            };
            const service = new PickupVerificationService({} as never, makeConfig());

            const outcome = await service.verify(tx as never, 'order-1', '123456');
            expect(outcome).toEqual({ outcome: 'locked' });
        });

        it('rejects an expired code', async () => {
            const row = makeVerificationRow({ expires_at: new Date(Date.now() - 1000) });
            const tx = {
                pickupVerification: { update: jest.fn() },
                $queryRaw: jest.fn(async () => [row]),
            };
            const service = new PickupVerificationService({} as never, makeConfig());

            const outcome = await service.verify(tx as never, 'order-1', '123456');
            expect(outcome).toEqual({ outcome: 'expired' });
        });

        it('rejects a reused (already verified) code as locked', async () => {
            const row = makeVerificationRow({ verified_at: new Date() });
            const tx = {
                pickupVerification: { update: jest.fn() },
                $queryRaw: jest.fn(async () => [row]),
            };
            const service = new PickupVerificationService({} as never, makeConfig());

            const outcome = await service.verify(tx as never, 'order-1', '123456');
            expect(outcome).toEqual({ outcome: 'locked' });
        });

        it('reports not_found when no code was ever issued', async () => {
            const tx = {
                pickupVerification: { update: jest.fn() },
                $queryRaw: jest.fn(async () => []),
            };
            const service = new PickupVerificationService({} as never, makeConfig());

            const outcome = await service.verify(tx as never, 'order-1', '123456');
            expect(outcome).toEqual({ outcome: 'not_found' });
        });
    });

    describe('getOwnCode', () => {
        it('throws NotFoundException when no code has been issued', async () => {
            const prisma = {
                pickupVerification: { findUnique: jest.fn(async () => null) },
            } as never;
            const service = new PickupVerificationService(prisma, makeConfig());

            await expect(service.getOwnCode('order-1')).rejects.toThrow(NotFoundException);
        });

        it('throws ConflictException once already verified', async () => {
            const prisma = {
                pickupVerification: {
                    findUnique: jest.fn(async () => ({
                        verified_at: new Date(),
                        expires_at: new Date(Date.now() + 1000),
                    })),
                },
            } as never;
            const service = new PickupVerificationService(prisma, makeConfig());

            await expect(service.getOwnCode('order-1')).rejects.toThrow(ConflictException);
        });

        it('throws ConflictException once expired', async () => {
            const prisma = {
                pickupVerification: {
                    findUnique: jest.fn(async () => ({
                        verified_at: null,
                        expires_at: new Date(Date.now() - 1000),
                    })),
                },
            } as never;
            const service = new PickupVerificationService(prisma, makeConfig());

            await expect(service.getOwnCode('order-1')).rejects.toThrow(ConflictException);
        });

        it('returns the plaintext from cache right after generation', async () => {
            const row = { id: 'pv-1' };
            const tx = {
                pickupVerification: {
                    create: jest.fn(async (a: { data: Record<string, unknown> }) => ({
                        ...row,
                        ...a.data,
                    })),
                },
            };
            const prisma = {
                pickupVerification: {
                    findUnique: jest.fn(async () => ({
                        verified_at: null,
                        expires_at: new Date(Date.now() + 1000),
                    })),
                },
            } as never;
            const service = new PickupVerificationService(prisma, makeConfig());
            const code = await service.generateForOrder(tx as never, 'order-1');

            const result = await service.getOwnCode('order-1');
            expect(result).toEqual({
                expiresAt: expect.any(Date),
                codeAvailable: true,
                code,
            });
        });
    });
});
