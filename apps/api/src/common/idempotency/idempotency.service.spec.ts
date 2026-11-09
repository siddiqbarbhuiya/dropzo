import { jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service.js';

function makePrisma(overrides: Record<string, unknown> = {}) {
    return {
        idempotencyRecord: {
            create: jest.fn(async () => ({ id: 'rec-1' })),
            findUniqueOrThrow: jest.fn(async () => ({
                id: 'rec-1',
                request_hash: IdempotencyService.hashPayload({ a: 1 }),
                status: 'IN_PROGRESS',
                response_snapshot: null,
            })),
            updateMany: jest.fn(async () => ({ count: 1 })),
            ...((overrides.idempotencyRecord as object) ?? {}),
        },
    } as never;
}

describe('IdempotencyService', () => {
    describe('begin', () => {
        it('proceeds on a fresh key', async () => {
            const prisma = makePrisma();
            const service = new IdempotencyService(prisma);

            const outcome = await service.begin('scope-1', 'user-1', 'key-1', { a: 1 });
            expect(outcome).toEqual({ kind: 'proceed' });
        });

        it('replays the original response for a COMPLETED retry with the same payload', async () => {
            const prisma = makePrisma({
                idempotencyRecord: {
                    create: jest.fn(async () => {
                        throw new Error('unique constraint');
                    }),
                    findUniqueOrThrow: jest.fn(async () => ({
                        id: 'rec-1',
                        request_hash: IdempotencyService.hashPayload({ a: 1 }),
                        status: 'COMPLETED',
                        response_snapshot: { orderId: 'order-1' },
                    })),
                },
            });
            const service = new IdempotencyService(prisma);

            const outcome = await service.begin('scope-1', 'user-1', 'key-1', { a: 1 });
            expect(outcome).toEqual({ kind: 'completed', response: { orderId: 'order-1' } });
        });

        it('reports in_progress for a concurrent retry', async () => {
            const prisma = makePrisma({
                idempotencyRecord: {
                    create: jest.fn(async () => {
                        throw new Error('unique constraint');
                    }),
                    findUniqueOrThrow: jest.fn(async () => ({
                        id: 'rec-1',
                        request_hash: IdempotencyService.hashPayload({ a: 1 }),
                        status: 'IN_PROGRESS',
                        response_snapshot: null,
                    })),
                },
            });
            const service = new IdempotencyService(prisma);

            const outcome = await service.begin('scope-1', 'user-1', 'key-1', { a: 1 });
            expect(outcome).toEqual({ kind: 'in_progress' });
        });

        it('rejects the same key reused with a different request body', async () => {
            const prisma = makePrisma({
                idempotencyRecord: {
                    create: jest.fn(async () => {
                        throw new Error('unique constraint');
                    }),
                    findUniqueOrThrow: jest.fn(async () => ({
                        id: 'rec-1',
                        request_hash: IdempotencyService.hashPayload({ a: 1 }),
                        status: 'IN_PROGRESS',
                        response_snapshot: null,
                    })),
                },
            });
            const service = new IdempotencyService(prisma);

            await expect(service.begin('scope-1', 'user-1', 'key-1', { a: 2 })).rejects.toThrow(
                ConflictException,
            );
        });

        it('allows a fresh attempt when the previous one FAILED', async () => {
            const prisma = makePrisma({
                idempotencyRecord: {
                    create: jest.fn(async () => {
                        throw new Error('unique constraint');
                    }),
                    findUniqueOrThrow: jest.fn(async () => ({
                        id: 'rec-1',
                        request_hash: IdempotencyService.hashPayload({ a: 1 }),
                        status: 'FAILED',
                        response_snapshot: null,
                    })),
                    updateMany: jest.fn(async () => ({ count: 1 })),
                },
            });
            const service = new IdempotencyService(prisma);

            const outcome = await service.begin('scope-1', 'user-1', 'key-1', { a: 1 });
            expect(outcome).toEqual({ kind: 'proceed' });
        });
    });
});
