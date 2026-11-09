import { jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { ReservationService } from './reservation.service.js';

interface Options {
    inventory?: Record<string, { on_hand_quantity: number; reserved_quantity: number }>;
    availableBatches?: Record<
        string,
        { id: string; on_hand_quantity: string; reserved_quantity: string }[]
    >;
    reservationItems?: Array<{
        id: string;
        inventory_id: string;
        batch_id: string | null;
        quantity: number;
    }>;
}

function makeTx(opts: Options = {}) {
    const inventory = {
        findUniqueOrThrow: jest.fn(async (args: { where: { id: string } }) => {
            const row = opts.inventory?.[args.where.id] ?? {
                on_hand_quantity: 10,
                reserved_quantity: 0,
            };
            return { id: args.where.id, ...row };
        }),
        update: jest.fn(async () => ({})),
    };
    const stockBatch = { update: jest.fn(async () => ({})) };
    const stockReservation = {
        create: jest.fn(async () => ({ id: 'reservation-1' })),
        updateMany: jest.fn(async () => ({ count: 1 })),
    };
    const stockReservationItem = {
        create: jest.fn(async () => ({})),
        findMany: jest.fn(async () => opts.reservationItems ?? []),
    };
    const $queryRaw = jest.fn(async (strings: TemplateStringsArray) => {
        const sql = strings.join('|');
        if (sql.includes('FROM "stock_batches"') && sql.includes('NULLS LAST')) {
            return opts.availableBatches?.['default'] ?? [];
        }
        return [];
    });
    return { inventory, stockBatch, stockReservation, stockReservationItem, $queryRaw };
}

function makePrisma(tx: ReturnType<typeof makeTx>, extra: Record<string, unknown> = {}) {
    return {
        $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(tx)),
        ...extra,
    } as never;
}

describe('ReservationService', () => {
    describe('reserveForOrder (aggregate)', () => {
        it('reserves available aggregate stock', async () => {
            const tx = makeTx({
                inventory: { 'inv-1': { on_hand_quantity: 10, reserved_quantity: 0 } },
            });
            const prisma = makePrisma(tx);
            const service = new ReservationService(prisma);

            const reservationId = await service.reserveForOrder(
                tx as never,
                'order-1',
                [{ inventoryId: 'inv-1', quantity: 5, usesBatchTracking: false }],
                new Date(Date.now() + 1000),
            );

            expect(reservationId).toBe('reservation-1');
            expect(tx.inventory.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { reserved_quantity: { increment: 5 } } }),
            );
        });

        it('rejects when available aggregate stock is insufficient', async () => {
            const tx = makeTx({
                inventory: { 'inv-1': { on_hand_quantity: 2, reserved_quantity: 0 } },
            });
            const prisma = makePrisma(tx);
            const service = new ReservationService(prisma);

            await expect(
                service.reserveForOrder(
                    tx as never,
                    'order-1',
                    [{ inventoryId: 'inv-1', quantity: 5, usesBatchTracking: false }],
                    new Date(Date.now() + 1000),
                ),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('reserveForOrder (batch-tracked, FEFO)', () => {
        it('allocates across eligible batches in FEFO order', async () => {
            const tx = makeTx({
                availableBatches: {
                    default: [
                        { id: 'batch-a', on_hand_quantity: '4', reserved_quantity: '0' },
                        { id: 'batch-b', on_hand_quantity: '10', reserved_quantity: '0' },
                    ],
                },
            });
            const prisma = makePrisma(tx);
            const service = new ReservationService(prisma);

            await service.reserveForOrder(
                tx as never,
                'order-1',
                [{ inventoryId: 'inv-1', quantity: 6, usesBatchTracking: true }],
                new Date(Date.now() + 1000),
            );

            expect(tx.stockBatch.update).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({
                    where: { id: 'batch-a' },
                    data: { reserved_quantity: { increment: 4 } },
                }),
            );
            expect(tx.stockBatch.update).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    where: { id: 'batch-b' },
                    data: { reserved_quantity: { increment: 2 } },
                }),
            );
        });

        it('never allocates from an expired or already fully-reserved batch', async () => {
            const tx = makeTx({ availableBatches: { default: [] } });
            const prisma = makePrisma(tx);
            const service = new ReservationService(prisma);

            await expect(
                service.reserveForOrder(
                    tx as never,
                    'order-1',
                    [{ inventoryId: 'inv-1', quantity: 1, usesBatchTracking: true }],
                    new Date(Date.now() + 1000),
                ),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('releaseReservation', () => {
        it('restores reserved_quantity for each item and is a no-op on a second call', async () => {
            const tx = makeTx({
                reservationItems: [
                    { id: 'ri-1', inventory_id: 'inv-1', batch_id: null, quantity: 5 },
                ],
            });
            const prisma = makePrisma(tx);
            const service = new ReservationService(prisma);

            await service.releaseReservation(tx as never, 'reservation-1');
            expect(tx.inventory.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { reserved_quantity: { decrement: 5 } } }),
            );

            // Second call: updateMany now matches zero rows (status no longer ACTIVE) - no-op.
            tx.stockReservation.updateMany = jest.fn(async () => ({ count: 0 }));
            tx.inventory.update.mockClear();
            await service.releaseReservation(tx as never, 'reservation-1');
            expect(tx.inventory.update).not.toHaveBeenCalled();
        });
    });

    describe('releaseExpiredOrderReservations', () => {
        it('releases expired reservations and cancels their still-CREATED orders', async () => {
            const tx = makeTx({
                reservationItems: [
                    { id: 'ri-1', inventory_id: 'inv-1', batch_id: null, quantity: 3 },
                ],
            });
            tx.stockReservation.updateMany = jest.fn(async () => ({ count: 1 }));
            const order = { updateMany: jest.fn(async () => ({ count: 1 })) };
            const orderStatusHistory = { create: jest.fn(async () => ({})) };
            const fullTx = { ...tx, order, orderStatusHistory };

            const prisma = {
                stockReservation: {
                    findMany: jest.fn(async () => [
                        { id: 'reservation-1', order_id: 'order-1', expires_at: new Date(0) },
                    ]),
                },
                $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(fullTx)),
            } as never;
            const service = new ReservationService(prisma);

            const result = await service.releaseExpiredOrderReservations();
            expect(result).toEqual({ released: 1, cancelledOrders: 1 });
            expect(order.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 'order-1', status: 'CREATED' } }),
            );
        });
    });
});
