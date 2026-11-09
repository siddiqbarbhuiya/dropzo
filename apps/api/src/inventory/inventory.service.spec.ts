import { jest } from '@jest/globals';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { InventoryService } from './inventory.service.js';

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

interface Options {
    listing?: Record<string, unknown>;
    inventory?: Record<string, unknown>;
    lockedBatch?: Record<string, unknown>[];
    availableBatches?: Record<string, unknown>[];
    expiredBatches?: Record<string, unknown>[];
}

function makePrisma(opts: Options = {}) {
    const listing = {
        id: 'listing-1',
        store_id: 'store-1',
        uses_batch_tracking: false,
        ...opts.listing,
    };
    const inventoryRow = {
        id: 'inventory-1',
        store_product_id: listing.id,
        on_hand_quantity: 10,
        reserved_quantity: 0,
        ...opts.inventory,
    };

    const storeProduct = {
        findFirst: jest.fn(async () => listing),
    };
    const inventory = {
        findUniqueOrThrow: jest.fn(async () => inventoryRow),
        update: jest.fn(async (args: { data: Record<string, unknown> }) => ({
            ...inventoryRow,
            ...args.data,
        })),
    };
    const stockBatch = {
        update: jest.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => ({
            id: args.where.id,
            ...args.data,
        })),
        create: jest.fn(async (args: { data: Record<string, unknown> }) => ({
            id: 'batch-new',
            ...args.data,
        })),
    };
    const stockMovement = {
        create: jest.fn(async (args: { data: Record<string, unknown> }) => ({
            id: 'movement-1',
            ...args.data,
        })),
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => 0),
    };

    const $queryRaw = jest.fn(async (strings: TemplateStringsArray) => {
        const sql = strings.join('|');
        if (sql.includes('FROM "inventory" i')) return [{ id: 'inventory-1' }];
        if (sql.includes('WHERE id =')) return opts.lockedBatch ?? [];
        if (sql.includes('IS NOT NULL')) return opts.expiredBatches ?? [];
        if (sql.includes('NULLS LAST')) return opts.availableBatches ?? [];
        return [];
    });

    const tx = { inventory, stockBatch, stockMovement, storeProduct, $queryRaw };

    return {
        storeProduct,
        inventory,
        stockBatch,
        stockMovement,
        $queryRaw,
        $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(tx)),
    } as never;
}

describe('InventoryService', () => {
    describe('receiveStock', () => {
        it('increases aggregate on-hand quantity and records a RECEIVED movement', async () => {
            const prisma = makePrisma();
            const service = new InventoryService(
                prisma,
                makeAudit(),
                makeMerchantApplications(),
                makeStores(),
            );

            await service.receiveStock('user-1', 'store-1', 'listing-1', { quantity: 10 });

            expect(
                (prisma as never as { inventory: { update: jest.Mock } }).inventory.update,
            ).toHaveBeenCalledWith(
                expect.objectContaining({ data: { on_hand_quantity: { increment: 10 } } }),
            );
            expect(
                (prisma as never as { stockMovement: { create: jest.Mock } }).stockMovement.create,
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ movement_type: 'RECEIVED', quantity: 10 }),
                }),
            );
        });

        it('creates a new batch when batch-tracked and no batchId is given', async () => {
            const prisma = makePrisma({ listing: { uses_batch_tracking: true } });
            const service = new InventoryService(
                prisma,
                makeAudit(),
                makeMerchantApplications(),
                makeStores(),
            );

            await service.receiveStock('user-1', 'store-1', 'listing-1', {
                quantity: 20,
                batchCode: 'B1',
            });

            expect(
                (prisma as never as { stockBatch: { create: jest.Mock } }).stockBatch.create,
            ).toHaveBeenCalled();
        });

        it('rejects a suspended merchant', async () => {
            const prisma = makePrisma();
            const service = new InventoryService(
                prisma,
                makeAudit(),
                makeMerchantApplications('SUSPENDED'),
                makeStores(),
            );

            await expect(
                service.receiveStock('user-1', 'store-1', 'listing-1', { quantity: 10 }),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('adjustStock', () => {
        it('requires a reason and applies a signed aggregate delta', async () => {
            const prisma = makePrisma();
            const service = new InventoryService(
                prisma,
                makeAudit(),
                makeMerchantApplications(),
                makeStores(),
            );

            await service.adjustStock('user-1', 'store-1', 'listing-1', {
                quantityDelta: -3,
                reason: 'Stocktake correction',
            });

            expect(
                (prisma as never as { inventory: { update: jest.Mock } }).inventory.update,
            ).toHaveBeenCalledWith(
                expect.objectContaining({ data: { on_hand_quantity: { increment: -3 } } }),
            );
        });

        it('rejects a negative aggregate decrease below available (non-reserved) stock', async () => {
            const prisma = makePrisma({ inventory: { on_hand_quantity: 2, reserved_quantity: 0 } });
            const service = new InventoryService(
                prisma,
                makeAudit(),
                makeMerchantApplications(),
                makeStores(),
            );

            await expect(
                service.adjustStock('user-1', 'store-1', 'listing-1', {
                    quantityDelta: -5,
                    reason: 'Stocktake correction',
                }),
            ).rejects.toThrow(ConflictException);
        });

        it('requires an explicit batchId to increase batch-tracked stock', async () => {
            const prisma = makePrisma({ listing: { uses_batch_tracking: true } });
            const service = new InventoryService(
                prisma,
                makeAudit(),
                makeMerchantApplications(),
                makeStores(),
            );

            await expect(
                service.adjustStock('user-1', 'store-1', 'listing-1', {
                    quantityDelta: 5,
                    reason: 'Found extra stock',
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it('uses FEFO across eligible batches when decreasing without a batchId', async () => {
            const prisma = makePrisma({
                listing: { uses_batch_tracking: true },
                availableBatches: [
                    { id: 'batch-a', on_hand_quantity: '4', reserved_quantity: '0' },
                    { id: 'batch-b', on_hand_quantity: '10', reserved_quantity: '0' },
                ],
            });
            const service = new InventoryService(
                prisma,
                makeAudit(),
                makeMerchantApplications(),
                makeStores(),
            );

            await service.adjustStock('user-1', 'store-1', 'listing-1', {
                quantityDelta: -6,
                reason: 'Stocktake shortfall',
            });

            const batchUpdate = (prisma as never as { stockBatch: { update: jest.Mock } })
                .stockBatch.update;
            expect(batchUpdate).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({
                    where: { id: 'batch-a' },
                    data: { on_hand_quantity: { decrement: 4 } },
                }),
            );
            expect(batchUpdate).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    where: { id: 'batch-b' },
                    data: { on_hand_quantity: { decrement: 2 } },
                }),
            );
        });

        it('never pulls from already-reserved quantity (no reservation bypass)', async () => {
            const prisma = makePrisma({
                listing: { uses_batch_tracking: true },
                availableBatches: [
                    { id: 'batch-a', on_hand_quantity: '10', reserved_quantity: '10' },
                ],
            });
            const service = new InventoryService(
                prisma,
                makeAudit(),
                makeMerchantApplications(),
                makeStores(),
            );

            await expect(
                service.adjustStock('user-1', 'store-1', 'listing-1', {
                    quantityDelta: -1,
                    reason: 'Correction',
                }),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('removeStock', () => {
        it('rejects marking a non-expired batch as EXPIRED', async () => {
            const prisma = makePrisma({
                listing: { uses_batch_tracking: true },
                lockedBatch: [
                    {
                        id: 'batch-a',
                        on_hand_quantity: '5',
                        reserved_quantity: '0',
                        expiry_date: new Date(Date.now() + 86_400_000),
                    },
                ],
            });
            const service = new InventoryService(
                prisma,
                makeAudit(),
                makeMerchantApplications(),
                makeStores(),
            );

            await expect(
                service.removeStock('user-1', 'store-1', 'listing-1', {
                    type: 'EXPIRED',
                    quantity: 2,
                    reason: 'Past date',
                    batchId: 'batch-a',
                }),
            ).rejects.toThrow(ConflictException);
        });

        it('only allocates from genuinely expired batches for an EXPIRED removal', async () => {
            const prisma = makePrisma({
                listing: { uses_batch_tracking: true },
                expiredBatches: [
                    { id: 'batch-old', on_hand_quantity: '3', reserved_quantity: '0' },
                ],
            });
            const service = new InventoryService(
                prisma,
                makeAudit(),
                makeMerchantApplications(),
                makeStores(),
            );

            await service.removeStock('user-1', 'store-1', 'listing-1', {
                type: 'EXPIRED',
                quantity: 3,
                reason: 'Past date, write-off',
            });

            expect(
                (prisma as never as { stockBatch: { update: jest.Mock } }).stockBatch.update,
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'batch-old' },
                    data: { on_hand_quantity: { decrement: 3 } },
                }),
            );
        });

        it('rejects removal of an unauthorized/foreign listing', async () => {
            const prisma = makePrisma({ listing: undefined });
            (
                prisma as unknown as { storeProduct: { findFirst: jest.Mock } }
            ).storeProduct.findFirst = jest.fn(async () => null);
            const service = new InventoryService(
                prisma,
                makeAudit(),
                makeMerchantApplications(),
                makeStores(),
            );

            await expect(
                service.removeStock('user-1', 'store-1', 'not-owned-listing', {
                    type: 'DAMAGED',
                    quantity: 1,
                    reason: 'Broken',
                }),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
