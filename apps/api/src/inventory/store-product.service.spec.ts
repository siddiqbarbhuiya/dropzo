import { jest } from '@jest/globals';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StoreProductService } from './store-product.service.js';

function makeAudit() {
    return { record: jest.fn(async () => undefined) } as never;
}

function makeMerchantApplications(verificationStatus = 'APPROVED') {
    return {
        getMerchantForOwner: jest.fn(async () => ({
            id: 'merchant-1',
            verification_status: verificationStatus,
        })),
    } as never;
}

function makeStores() {
    return {
        getOwnStore: jest.fn(async () => ({ id: 'store-1' })),
    } as never;
}

function makePrisma(overrides: Record<string, unknown> = {}) {
    const storeProduct = {
        create: jest.fn(async (args: { data: Record<string, unknown> }) => ({
            id: 'listing-1',
            ...args.data,
        })),
        update: jest.fn(async (args: { data: Record<string, unknown> }) => ({
            id: 'listing-1',
            ...args.data,
        })),
        findFirst: jest.fn(async () => ({ id: 'listing-1', store_id: 'store-1' })),
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => 0),
        ...((overrides.storeProduct as object) ?? {}),
    };
    const inventory = {
        create: jest.fn(async () => ({ id: 'inventory-1' })),
        update: jest.fn(async () => ({ id: 'inventory-1' })),
        ...((overrides.inventory as object) ?? {}),
    };
    const productVariant = {
        findUnique: jest.fn(async () => ({ id: 'variant-1', is_active: true })),
        ...((overrides.productVariant as object) ?? {}),
    };
    return {
        storeProduct,
        inventory,
        productVariant,
        $transaction: jest.fn(async (fn: (tx: unknown) => unknown) =>
            fn({ storeProduct, inventory }),
        ),
    } as never;
}

describe('StoreProductService', () => {
    describe('createListing', () => {
        it('creates a listing and its paired inventory row in one transaction', async () => {
            const prisma = makePrisma();
            const service = new StoreProductService(
                prisma,
                makeAudit(),
                makeMerchantApplications(),
                makeStores(),
            );

            const result = await service.createListing('user-1', 'store-1', {
                variantId: 'variant-1',
                sellingPrice: 120,
            });

            expect(result.id).toBe('listing-1');
            expect(
                (prisma as never as { inventory: { create: jest.Mock } }).inventory.create,
            ).toHaveBeenCalled();
        });

        it('rejects a suspended merchant', async () => {
            const prisma = makePrisma();
            const service = new StoreProductService(
                prisma,
                makeAudit(),
                makeMerchantApplications('SUSPENDED'),
                makeStores(),
            );

            await expect(
                service.createListing('user-1', 'store-1', {
                    variantId: 'variant-1',
                    sellingPrice: 120,
                }),
            ).rejects.toThrow(ForbiddenException);
        });

        it('rejects an inactive or missing variant', async () => {
            const prisma = makePrisma({
                productVariant: { findUnique: jest.fn(async () => null) },
            });
            const service = new StoreProductService(
                prisma,
                makeAudit(),
                makeMerchantApplications(),
                makeStores(),
            );

            await expect(
                service.createListing('user-1', 'store-1', {
                    variantId: 'missing',
                    sellingPrice: 120,
                }),
            ).rejects.toThrow(NotFoundException);
        });

        it('maps a duplicate store/variant listing to a ConflictException', async () => {
            const prisma = makePrisma({
                storeProduct: {
                    create: jest.fn(async () => {
                        throw new Error('unique constraint');
                    }),
                },
            });
            const service = new StoreProductService(
                prisma,
                makeAudit(),
                makeMerchantApplications(),
                makeStores(),
            );

            await expect(
                service.createListing('user-1', 'store-1', {
                    variantId: 'variant-1',
                    sellingPrice: 120,
                }),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('getOwnListing / listOwnListings', () => {
        it('never trusts listingId alone - scopes the lookup to the resolved store', async () => {
            const prisma = makePrisma({ storeProduct: { findFirst: jest.fn(async () => null) } });
            const service = new StoreProductService(
                prisma,
                makeAudit(),
                makeMerchantApplications(),
                makeStores(),
            );

            await expect(
                service.getOwnListing('user-1', 'store-1', 'listing-from-another-store'),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
