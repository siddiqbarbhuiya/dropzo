import { jest } from '@jest/globals';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MerchantApplicationService } from './merchant-application.service.js';

function makeAudit() {
    return { record: jest.fn(async () => undefined) } as never;
}

function makePrisma(overrides: Record<string, unknown> = {}) {
    return {
        merchant: {
            findUnique: jest.fn(async () => null),
            create: jest.fn(async (args: { data: Record<string, unknown> }) => ({
                id: 'merchant-1',
                verification_status: 'PENDING',
                ...args.data,
            })),
            update: jest.fn(async (args: { data: Record<string, unknown> }) => ({
                id: 'merchant-1',
                ...args.data,
            })),
            updateMany: jest.fn(async () => ({ count: 1 })),
            findUniqueOrThrow: jest.fn(async () => ({ id: 'merchant-1' })),
            findMany: jest.fn(async () => []),
            count: jest.fn(async () => 0),
            groupBy: jest.fn(async () => []),
            ...((overrides.merchant as object) ?? {}),
        },
        userRole: {
            upsert: jest.fn(async () => ({})),
        },
    } as never;
}

describe('MerchantApplicationService', () => {
    describe('submitApplication', () => {
        const dto = {
            legalName: 'Acme Pvt Ltd',
            displayName: 'Acme',
            contactPhone: '9876543210',
            businessAddress: 'Main Road',
        };

        it('creates a new application when the user has none yet', async () => {
            const prisma = makePrisma();
            const service = new MerchantApplicationService(prisma, makeAudit());

            const result = await service.submitApplication('user-1', dto);

            expect(result.verification_status).toBe('PENDING');
            expect(
                (prisma as never as { merchant: { create: jest.Mock } }).merchant.create,
            ).toHaveBeenCalled();
        });

        it('rejects a duplicate submission while an application is already PENDING', async () => {
            const prisma = makePrisma({
                merchant: {
                    findUnique: jest.fn(async () => ({
                        id: 'merchant-1',
                        verification_status: 'PENDING',
                    })),
                },
            });
            const service = new MerchantApplicationService(prisma, makeAudit());

            await expect(service.submitApplication('user-1', dto)).rejects.toThrow(
                ConflictException,
            );
        });

        it('rejects a duplicate submission for an already-APPROVED merchant', async () => {
            const prisma = makePrisma({
                merchant: {
                    findUnique: jest.fn(async () => ({
                        id: 'merchant-1',
                        verification_status: 'APPROVED',
                    })),
                },
            });
            const service = new MerchantApplicationService(prisma, makeAudit());

            await expect(service.submitApplication('user-1', dto)).rejects.toThrow(
                ConflictException,
            );
        });

        it('allows resubmission after rejection, clearing the previous review', async () => {
            const update = jest.fn(async (args: { data: Record<string, unknown> }) => ({
                id: 'merchant-1',
                ...args.data,
            }));
            const prisma = makePrisma({
                merchant: {
                    findUnique: jest.fn(async () => ({
                        id: 'merchant-1',
                        verification_status: 'REJECTED',
                    })),
                    update,
                },
            });
            const service = new MerchantApplicationService(prisma, makeAudit());

            const result = await service.submitApplication('user-1', dto);

            expect(result.verification_status).toBe('PENDING');
            expect(update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        reviewed_at: null,
                        reviewed_by_user_id: null,
                        rejection_reason: null,
                    }),
                }),
            );
        });
    });

    describe('requireApprovedMerchantForOwner', () => {
        it('throws when the merchant has not been approved yet', async () => {
            const prisma = makePrisma({
                merchant: {
                    findUnique: jest.fn(async () => ({
                        id: 'merchant-1',
                        verification_status: 'PENDING',
                    })),
                },
            });
            const service = new MerchantApplicationService(prisma, makeAudit());

            await expect(service.requireApprovedMerchantForOwner('user-1')).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('throws a distinct message when the merchant is suspended', async () => {
            const prisma = makePrisma({
                merchant: {
                    findUnique: jest.fn(async () => ({
                        id: 'merchant-1',
                        verification_status: 'SUSPENDED',
                    })),
                },
            });
            const service = new MerchantApplicationService(prisma, makeAudit());

            await expect(service.requireApprovedMerchantForOwner('user-1')).rejects.toThrow(
                'suspended',
            );
        });

        it('returns the merchant when approved', async () => {
            const prisma = makePrisma({
                merchant: {
                    findUnique: jest.fn(async () => ({
                        id: 'merchant-1',
                        verification_status: 'APPROVED',
                    })),
                },
            });
            const service = new MerchantApplicationService(prisma, makeAudit());

            await expect(service.requireApprovedMerchantForOwner('user-1')).resolves.toMatchObject({
                id: 'merchant-1',
            });
        });
    });

    describe('admin transitions', () => {
        it('approves a PENDING application and grants MERCHANT_OWNER', async () => {
            const upsert = jest.fn(async () => ({}));
            const prisma = makePrisma({
                merchant: {
                    updateMany: jest.fn(async () => ({ count: 1 })),
                    findUniqueOrThrow: jest.fn(async () => ({
                        id: 'merchant-1',
                        owner_user_id: 'owner-1',
                        verification_status: 'APPROVED',
                    })),
                },
            });
            (prisma as never as { userRole: { upsert: typeof upsert } }).userRole.upsert = upsert;
            const service = new MerchantApplicationService(prisma, makeAudit());

            const result = await service.approve('merchant-1', 'admin-1');

            expect(result.verification_status).toBe('APPROVED');
            expect(upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: { user_id: 'owner-1', role: 'MERCHANT_OWNER' },
                }),
            );
        });

        it('rejects approving an application that is no longer PENDING (concurrent decision)', async () => {
            const prisma = makePrisma({
                merchant: {
                    updateMany: jest.fn(async () => ({ count: 0 })),
                    findUnique: jest.fn(async () => ({
                        id: 'merchant-1',
                        verification_status: 'REJECTED',
                    })),
                },
            });
            const service = new MerchantApplicationService(prisma, makeAudit());

            await expect(service.approve('merchant-1', 'admin-1')).rejects.toThrow(
                ConflictException,
            );
        });

        it('throws not found when approving a non-existent application', async () => {
            const prisma = makePrisma({
                merchant: {
                    updateMany: jest.fn(async () => ({ count: 0 })),
                    findUnique: jest.fn(async () => null),
                },
            });
            const service = new MerchantApplicationService(prisma, makeAudit());

            await expect(service.approve('does-not-exist', 'admin-1')).rejects.toThrow(
                NotFoundException,
            );
        });

        it('suspends an APPROVED merchant with a reason', async () => {
            const audit = makeAudit();
            const prisma = makePrisma({
                merchant: {
                    updateMany: jest.fn(async () => ({ count: 1 })),
                    findUniqueOrThrow: jest.fn(async () => ({
                        id: 'merchant-1',
                        verification_status: 'SUSPENDED',
                    })),
                },
            });
            const service = new MerchantApplicationService(prisma, audit);

            const result = await service.suspend('merchant-1', 'admin-1', 'policy violation');

            expect(result.verification_status).toBe('SUSPENDED');
            expect((audit as never as { record: jest.Mock }).record).toHaveBeenCalledWith(
                expect.objectContaining({ action: 'MERCHANT_SUSPENDED' }),
            );
        });

        it('reinstates a SUSPENDED merchant back to APPROVED', async () => {
            const prisma = makePrisma({
                merchant: {
                    updateMany: jest.fn(async () => ({ count: 1 })),
                    findUniqueOrThrow: jest.fn(async () => ({
                        id: 'merchant-1',
                        verification_status: 'APPROVED',
                    })),
                },
            });
            const service = new MerchantApplicationService(prisma, makeAudit());

            const result = await service.reinstate('merchant-1', 'admin-1');
            expect(result.verification_status).toBe('APPROVED');
        });
    });
});
