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
    const store = {
        findFirst: jest.fn(async () => ({ id: 'store-1', status: 'ACTIVE' })),
        ...((overrides.store as object) ?? {}),
    };
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
        store,
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

    describe('listPublicStoreProducts', () => {
        it('throws NotFoundException if store is inactive or not found', async () => {
            const prisma = makePrisma({
                store: { findFirst: jest.fn(async () => null) },
            });
            const service = new StoreProductService(
                prisma,
                makeAudit(),
                makeMerchantApplications(),
                makeStores(),
            );

            await expect(
                service.listPublicStoreProducts('missing-store', { page: 1, limit: 10 }),
            ).rejects.toThrow(NotFoundException);
        });

        it('returns published listings with in_stock and low_stock flags', async () => {
            const prisma = makePrisma({
                storeProduct: {
                    findMany: jest.fn(async () => [
                        {
                            id: 'listing-1',
                            store_id: 'store-1',
                            selling_price: '180.00',
                            mrp: '200.00',
                            is_available: true,
                            variant: {
                                id: 'variant-1',
                                variant_name: '5kg Bag',
                                sku: 'AASH-5KG',
                                pack_size: 5,
                                unit: 'kg',
                                product: {
                                    id: 'prod-1',
                                    name: 'Aashirvaad Shudh Chakki Atta',
                                    description: '100% whole wheat',
                                    category_id: 'cat-1',
                                    category: { name: 'Atta & Flours' },
                                },
                            },
                            inventory: {
                                on_hand_quantity: 15,
                                reserved_quantity: 0,
                                blocked_quantity: 0,
                                low_stock_threshold: 5,
                            },
                        },
                    ]),
                    count: jest.fn(async () => 1),
                },
                store: {
                    findFirst: jest.fn(async () => ({ id: 'store-1', status: 'ACTIVE' })),
                },
            });
            const service = new StoreProductService(
                prisma,
                makeAudit(),
                makeMerchantApplications(),
                makeStores(),
            );

            const result = await service.listPublicStoreProducts('store-1', { page: 1, limit: 10 });
            expect(result.data).toHaveLength(1);
            expect(result.data[0].product_name).toBe('Aashirvaad Shudh Chakki Atta');
            expect(result.data[0].selling_price).toBe(180);
            expect(result.data[0].mrp).toBe(200);
            expect(result.data[0].in_stock).toBe(true);
            expect(result.data[0].low_stock).toBe(false);
        });
    });
});
