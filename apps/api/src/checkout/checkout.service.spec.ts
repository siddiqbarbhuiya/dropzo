import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CheckoutService } from './checkout.service.js';

const PRICED_SUMMARY = {
    cartId: 'cart-1',
    storeId: 'store-1',
    storeName: 'Main Branch',
    items: [
        {
            cartItemId: 'item-1',
            storeProductId: 'listing-1',
            inventoryId: 'inventory-1',
            usesBatchTracking: false,
            productName: 'Basmati Rice',
            variantName: '1kg pack',
            sku: 'SKU-1',
            unit: 'kg',
            quantity: 2,
            unitPrice: 100,
            subtotal: 200,
            errors: [],
        },
    ],
    subtotal: 200,
    totalAmount: 200,
    isValid: true,
};

function makeAudit() {
    return { record: jest.fn(async () => undefined) } as never;
}

function makePricing(summary: unknown = PRICED_SUMMARY) {
    return { priceCart: jest.fn(async () => summary) } as never;
}

function makeFulfilment(errors: string[] = []) {
    return { validate: jest.fn(async () => errors) } as never;
}

function makeReservations() {
    return { reserveForOrder: jest.fn(async () => 'reservation-1') } as never;
}

function makeIdempotency(overrides: Record<string, unknown> = {}) {
    return {
        begin: jest.fn(async () => ({ kind: 'proceed' })),
        complete: jest.fn(async () => undefined),
        fail: jest.fn(async () => undefined),
        ...overrides,
    } as never;
}

function makePrisma(
    opts: { activeCart?: Record<string, unknown> | null; openOrderCount?: number } = {},
) {
    const order = {
        create: jest.fn(async (args: { data: Record<string, unknown> }) => ({
            id: 'order-1',
            order_number: 'DZ20261109ABCD1234',
            ...args.data,
        })),
        findUniqueOrThrow: jest.fn(async () => ({
            id: 'order-1',
            order_number: 'DZ20261109ABCD1234',
            items: [],
        })),
        count: jest.fn(async () => opts.openOrderCount ?? 0),
    };
    const tx = {
        $executeRaw: jest.fn(async () => 0),
        cart: {
            findFirst: jest.fn(async () =>
                'activeCart' in opts ? opts.activeCart : { id: 'cart-1', store_id: 'store-1' },
            ),
            update: jest.fn(async () => ({})),
        },
        store: {
            findUniqueOrThrow: jest.fn(async () => ({
                id: 'store-1',
                name: 'Main Branch',
                address: 'Market Road',
            })),
        },
        order,
        orderItem: { create: jest.fn(async () => ({})) },
        payment: { create: jest.fn(async () => ({})) },
        orderStatusHistory: { create: jest.fn(async () => ({})) },
    };
    return {
        cart: tx.cart,
        order,
        $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(tx)),
    } as never;
}

describe('CheckoutService', () => {
    describe('prepare', () => {
        it('returns the priced summary plus fulfilment readiness', async () => {
            const prisma = makePrisma();
            const service = new CheckoutService(
                prisma,
                makePricing(),
                makeFulfilment(),
                makeReservations(),
                makeIdempotency(),
                makeAudit(),
            );

            const summary = await service.prepare('user-1', { fulfilmentType: 'PICKUP' });
            expect(summary.isReadyForCheckout).toBe(true);
        });

        it('is not ready when fulfilment has errors even if pricing is valid', async () => {
            const prisma = makePrisma();
            const service = new CheckoutService(
                prisma,
                makePricing(),
                makeFulfilment(['PICKUP_NOT_SUPPORTED']),
                makeReservations(),
                makeIdempotency(),
                makeAudit(),
            );

            const summary = await service.prepare('user-1', { fulfilmentType: 'PICKUP' });
            expect(summary.isReadyForCheckout).toBe(false);
        });

        it('rejects when the caller has no active cart', async () => {
            const prisma = makePrisma({ activeCart: null });
            const service = new CheckoutService(
                prisma,
                makePricing(),
                makeFulfilment(),
                makeReservations(),
                makeIdempotency(),
                makeAudit(),
            );

            await expect(service.prepare('user-1', { fulfilmentType: 'PICKUP' })).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('createOrder', () => {
        it('creates an order, reserves stock, and transitions the cart', async () => {
            const prisma = makePrisma();
            const reservations = makeReservations();
            const idempotency = makeIdempotency();
            const service = new CheckoutService(
                prisma,
                makePricing(),
                makeFulfilment(),
                reservations,
                idempotency,
                makeAudit(),
            );

            const order = await service.createOrder(
                'user-1',
                { fulfilmentType: 'PICKUP', expectedTotalAmount: 200 },
                'key-1',
            );

            expect(order.id).toBe('order-1');
            expect(
                (reservations as never as { reserveForOrder: jest.Mock }).reserveForOrder,
            ).toHaveBeenCalled();
            expect((idempotency as never as { complete: jest.Mock }).complete).toHaveBeenCalledWith(
                'checkout.create_order',
                'user-1',
                'key-1',
                expect.objectContaining({ orderId: 'order-1' }),
            );
        });

        it('replays the original order on a completed-idempotency-key retry', async () => {
            const prisma = makePrisma();
            const idempotency = makeIdempotency({
                begin: jest.fn(async () => ({
                    kind: 'completed',
                    response: { orderId: 'order-1', orderNumber: 'DZ1' },
                })),
            });
            const service = new CheckoutService(
                prisma,
                makePricing(),
                makeFulfilment(),
                makeReservations(),
                idempotency,
                makeAudit(),
            );

            const order = await service.createOrder(
                'user-1',
                { fulfilmentType: 'PICKUP', expectedTotalAmount: 200 },
                'key-1',
            );
            expect(order.id).toBe('order-1');
            expect(
                (prisma as never as { $transaction: jest.Mock }).$transaction,
            ).not.toHaveBeenCalled();
        });

        it('rejects a new order once the customer already has too many open orders', async () => {
            const prisma = makePrisma({ openOrderCount: 5 });
            const idempotency = makeIdempotency();
            const service = new CheckoutService(
                prisma,
                makePricing(),
                makeFulfilment(),
                makeReservations(),
                idempotency,
                makeAudit(),
            );

            await expect(
                service.createOrder(
                    'user-1',
                    { fulfilmentType: 'PICKUP', expectedTotalAmount: 200 },
                    'key-1',
                ),
            ).rejects.toThrow(ConflictException);
            expect((idempotency as never as { fail: jest.Mock }).fail).toHaveBeenCalled();
        });

        it('rejects a concurrent in-progress idempotency key', async () => {
            const prisma = makePrisma();
            const idempotency = makeIdempotency({
                begin: jest.fn(async () => ({ kind: 'in_progress' })),
            });
            const service = new CheckoutService(
                prisma,
                makePricing(),
                makeFulfilment(),
                makeReservations(),
                idempotency,
                makeAudit(),
            );

            await expect(
                service.createOrder(
                    'user-1',
                    { fulfilmentType: 'PICKUP', expectedTotalAmount: 200 },
                    'key-1',
                ),
            ).rejects.toThrow(ConflictException);
        });

        it('rejects and marks the idempotency key FAILED when the cart is stale (price changed)', async () => {
            const prisma = makePrisma();
            const idempotency = makeIdempotency();
            const service = new CheckoutService(
                prisma,
                makePricing(),
                makeFulfilment(),
                makeReservations(),
                idempotency,
                makeAudit(),
            );

            await expect(
                service.createOrder(
                    'user-1',
                    { fulfilmentType: 'PICKUP', expectedTotalAmount: 999 },
                    'key-1',
                ),
            ).rejects.toThrow(ConflictException);
            expect((idempotency as never as { fail: jest.Mock }).fail).toHaveBeenCalledWith(
                'checkout.create_order',
                'user-1',
                'key-1',
            );
        });

        it('rejects when the cart has invalid/unavailable items', async () => {
            const prisma = makePrisma();
            const idempotency = makeIdempotency();
            const service = new CheckoutService(
                prisma,
                makePricing({ ...PRICED_SUMMARY, isValid: false }),
                makeFulfilment(),
                makeReservations(),
                idempotency,
                makeAudit(),
            );

            await expect(
                service.createOrder(
                    'user-1',
                    { fulfilmentType: 'PICKUP', expectedTotalAmount: 200 },
                    'key-1',
                ),
            ).rejects.toThrow(ConflictException);
            expect((idempotency as never as { fail: jest.Mock }).fail).toHaveBeenCalled();
        });

        it('rejects when the fulfilment method is not available', async () => {
            const prisma = makePrisma();
            const idempotency = makeIdempotency();
            const service = new CheckoutService(
                prisma,
                makePricing(),
                makeFulfilment(['DELIVERY_OUT_OF_RANGE']),
                makeReservations(),
                idempotency,
                makeAudit(),
            );

            await expect(
                service.createOrder(
                    'user-1',
                    { fulfilmentType: 'DELIVERY', expectedTotalAmount: 200 },
                    'key-1',
                ),
            ).rejects.toThrow(ConflictException);
        });

        it('propagates a reservation failure (insufficient stock) and marks the key FAILED', async () => {
            const prisma = makePrisma();
            const reservations = {
                reserveForOrder: jest.fn(async () => {
                    throw new ConflictException('Not enough stock.');
                }),
            } as never;
            const idempotency = makeIdempotency();
            const service = new CheckoutService(
                prisma,
                makePricing(),
                makeFulfilment(),
                reservations,
                idempotency,
                makeAudit(),
            );

            await expect(
                service.createOrder(
                    'user-1',
                    { fulfilmentType: 'PICKUP', expectedTotalAmount: 200 },
                    'key-1',
                ),
            ).rejects.toThrow(ConflictException);
            expect((idempotency as never as { fail: jest.Mock }).fail).toHaveBeenCalled();
        });
    });
});
