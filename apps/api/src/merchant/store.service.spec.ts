import { jest } from '@jest/globals';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { StoreService } from './store.service.js';

function makeAudit() {
    return { record: jest.fn(async () => undefined) } as never;
}

function makeMerchantApplications(overrides: Record<string, unknown> = {}) {
    return {
        requireApprovedMerchantForOwner: jest.fn(async () => ({
            id: 'merchant-1',
            verification_status: 'APPROVED',
        })),
        getMerchantForOwner: jest.fn(async () => ({
            id: 'merchant-1',
            verification_status: 'APPROVED',
        })),
        ...overrides,
    } as never;
}

function makePrisma(overrides: Record<string, unknown> = {}) {
    return {
        $executeRaw: jest.fn(async () => 0),
        store: {
            findUniqueOrThrow: jest.fn(async () => ({
                id: 'store-1',
                merchant_id: 'merchant-1',
                status: 'PENDING',
            })),
            findFirst: jest.fn(async () => ({
                id: 'store-1',
                merchant_id: 'merchant-1',
                status: 'ACTIVE',
            })),
            findUnique: jest.fn(async () => ({
                id: 'store-1',
                merchant_id: 'merchant-1',
                status: 'PENDING',
            })),
            update: jest.fn(async (args: { data: Record<string, unknown> }) => ({
                id: 'store-1',
                ...args.data,
            })),
            updateMany: jest.fn(async () => ({ count: 1 })),
            findMany: jest.fn(async () => []),
            count: jest.fn(async () => 0),
            ...((overrides.store as object) ?? {}),
        },
        merchant: {
            findUnique: jest.fn(async () => ({ id: 'merchant-1' })),
        },
        serviceZone: {
            findUnique: jest.fn(async () => ({ id: 'zone-1', is_active: true })),
            ...((overrides.serviceZone as object) ?? {}),
        },
    } as never;
}

describe('StoreService', () => {
    describe('createStore', () => {
        const dto = {
            name: 'Main Branch',
            address: 'Market Road',
            district: 'Karimganj',
            city: 'Badarpur',
            latitude: 24.86,
            longitude: 92.51,
        };

        it('creates a store for an approved merchant', async () => {
            const prisma = makePrisma();
            const service = new StoreService(prisma, makeAudit(), makeMerchantApplications());

            const result = await service.createStore('user-1', dto);
            expect(result.id).toBe('store-1');
        });

        it('rejects creation when the merchant is not approved', async () => {
            const merchantApplications = makeMerchantApplications({
                requireApprovedMerchantForOwner: jest.fn(async () => {
                    throw new ForbiddenException('not approved');
                }),
            });
            const prisma = makePrisma();
            const service = new StoreService(prisma, makeAudit(), merchantApplications);

            await expect(service.createStore('user-1', dto)).rejects.toThrow(ForbiddenException);
        });

        it('rejects invalid operating hours (open not before close)', async () => {
            const prisma = makePrisma();
            const service = new StoreService(prisma, makeAudit(), makeMerchantApplications());

            await expect(
                service.createStore('user-1', {
                    ...dto,
                    openingHours: { mon: { open: '18:00', close: '09:00' } } as never,
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it('rejects an inactive service zone', async () => {
            const prisma = makePrisma({
                serviceZone: { findUnique: jest.fn(async () => ({ id: 'zone-1', is_active: false })) },
            });
            const service = new StoreService(prisma, makeAudit(), makeMerchantApplications());

            await expect(
                service.createStore('user-1', { ...dto, serviceZoneId: 'zone-1' }),
            ).rejects.toThrow(BadRequestException);
        });

        it('rejects a service zone that does not exist', async () => {
            const prisma = makePrisma({ serviceZone: { findUnique: jest.fn(async () => null) } });
            const service = new StoreService(prisma, makeAudit(), makeMerchantApplications());

            await expect(
                service.createStore('user-1', { ...dto, serviceZoneId: 'does-not-exist' }),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('getOwnStore', () => {
        it('denies access to a store belonging to a different merchant', async () => {
            const prisma = makePrisma({
                store: { findFirst: jest.fn(async () => null) },
            });
            const service = new StoreService(prisma, makeAudit(), makeMerchantApplications());

            await expect(service.getOwnStore('user-1', 'someone-elses-store')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('suspension blocks ordinary store edits', () => {
        const merchantApplications = makeMerchantApplications({
            getMerchantForOwner: jest.fn(async () => ({
                id: 'merchant-1',
                verification_status: 'SUSPENDED',
            })),
        });

        it('rejects updateStore for a suspended merchant', async () => {
            const prisma = makePrisma();
            const service = new StoreService(prisma, makeAudit(), merchantApplications);

            await expect(
                service.updateStore('user-1', 'store-1', { name: 'New Name' }),
            ).rejects.toThrow(ForbiddenException);
        });

        it('rejects updateHours for a suspended merchant', async () => {
            const prisma = makePrisma();
            const service = new StoreService(prisma, makeAudit(), merchantApplications);

            await expect(
                service.updateHours('user-1', 'store-1', { mon: { open: '09:00', close: '18:00' } }),
            ).rejects.toThrow(ForbiddenException);
        });

        it('rejects updateAvailability for a suspended merchant', async () => {
            const prisma = makePrisma();
            const service = new StoreService(prisma, makeAudit(), merchantApplications);

            await expect(
                service.updateAvailability('user-1', 'store-1', { supportsPickup: false }),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('updateStatusByMerchant', () => {
        it('allows pausing an ACTIVE store', async () => {
            const prisma = makePrisma({
                store: {
                    findFirst: jest.fn(async () => ({
                        id: 'store-1',
                        merchant_id: 'merchant-1',
                        status: 'ACTIVE',
                    })),
                    updateMany: jest.fn(async () => ({ count: 1 })),
                    findUniqueOrThrow: jest.fn(async () => ({ id: 'store-1', status: 'PAUSED' })),
                },
            });
            const service = new StoreService(prisma, makeAudit(), makeMerchantApplications());

            const result = await service.updateStatusByMerchant('user-1', 'store-1', 'PAUSED');
            expect(result.status).toBe('PAUSED');
        });

        it('rejects a merchant trying to activate straight from PENDING (admin-only)', async () => {
            const prisma = makePrisma({
                store: {
                    findFirst: jest.fn(async () => ({
                        id: 'store-1',
                        merchant_id: 'merchant-1',
                        status: 'PENDING',
                    })),
                },
            });
            const service = new StoreService(prisma, makeAudit(), makeMerchantApplications());

            await expect(
                service.updateStatusByMerchant('user-1', 'store-1', 'ACTIVE'),
            ).rejects.toThrow(BadRequestException);
        });

        it('rejects a suspended merchant trying to reactivate a paused store', async () => {
            const merchantApplications = makeMerchantApplications({
                getMerchantForOwner: jest.fn(async () => ({
                    id: 'merchant-1',
                    verification_status: 'SUSPENDED',
                })),
            });
            const prisma = makePrisma({
                store: {
                    findFirst: jest.fn(async () => ({
                        id: 'store-1',
                        merchant_id: 'merchant-1',
                        status: 'PAUSED',
                    })),
                },
            });
            const service = new StoreService(prisma, makeAudit(), merchantApplications);

            await expect(
                service.updateStatusByMerchant('user-1', 'store-1', 'ACTIVE'),
            ).rejects.toThrow(ForbiddenException);
        });

        it('rejects a concurrent status change that already moved the store on', async () => {
            const prisma = makePrisma({
                store: {
                    findFirst: jest.fn(async () => ({
                        id: 'store-1',
                        merchant_id: 'merchant-1',
                        status: 'ACTIVE',
                    })),
                    updateMany: jest.fn(async () => ({ count: 0 })),
                },
            });
            const service = new StoreService(prisma, makeAudit(), makeMerchantApplications());

            await expect(
                service.updateStatusByMerchant('user-1', 'store-1', 'PAUSED'),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('updateStatusByAdmin', () => {
        it('approves a PENDING store into ACTIVE', async () => {
            const prisma = makePrisma({
                store: {
                    findUnique: jest.fn(async () => ({ id: 'store-1', status: 'PENDING' })),
                    updateMany: jest.fn(async () => ({ count: 1 })),
                    findUniqueOrThrow: jest.fn(async () => ({ id: 'store-1', status: 'ACTIVE' })),
                },
            });
            const service = new StoreService(prisma, makeAudit(), makeMerchantApplications());

            const result = await service.updateStatusByAdmin('store-1', 'ACTIVE', 'admin-1');
            expect(result.status).toBe('ACTIVE');
        });

        it('rejects an invalid admin transition', async () => {
            const prisma = makePrisma({
                store: { findUnique: jest.fn(async () => ({ id: 'store-1', status: 'CLOSED' })) },
            });
            const service = new StoreService(prisma, makeAudit(), makeMerchantApplications());

            await expect(
                service.updateStatusByAdmin('store-1', 'ACTIVE', 'admin-1'),
            ).rejects.toThrow(BadRequestException);
        });
    });
});
