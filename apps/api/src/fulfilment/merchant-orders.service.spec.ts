import { jest } from '@jest/globals';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MerchantOrdersService } from './merchant-orders.service.js';

function makeAudit() {
    return { record: jest.fn(async () => undefined) } as never;
}
function makeOutbox() {
    return { record: jest.fn(async () => undefined) } as never;
}
function makeLedger() {
    return { postCodCollection: jest.fn(async () => undefined) } as never;
}
function makeStores(storeStatus = 'ACTIVE') {
    return { getOwnStore: jest.fn(async () => ({ id: 'store-1', status: storeStatus })) } as never;
}
function makeMerchantApplications(verificationStatus = 'APPROVED') {
    return {
        getMerchantForOwner: jest.fn(async () => ({
            id: 'merchant-1',
            verification_status: verificationStatus,
            commission_percent: 8,
        })),
    } as never;
}
function makeReservations() {
    return {
        releaseReservationForOrder: jest.fn(async () => undefined),
        consumeReservationForOrder: jest.fn(async () => undefined),
    } as never;
}
function makePickupVerification(verifyResult: unknown = { outcome: 'verified' }) {
    return {
        generateForOrder: jest.fn(async () => '123456'),
        verify: jest.fn(async () => verifyResult),
    } as never;
}

function makeOrder(overrides: Record<string, unknown> = {}) {
    return {
        id: 'order-1',
        store_id: 'store-1',
        status: 'CREATED',
        order_number: 'DZ1',
        ...overrides,
    };
}

function makePrisma(opts: { order?: Record<string, unknown> } = {}) {
    const orderRow = opts.order ?? makeOrder();
    const order = {
        findFirst: jest.fn(async () => orderRow),
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => 0),
        updateMany: jest.fn(async () => ({ count: 1 })),
        findUniqueOrThrow: jest.fn(async () => orderRow),
    };
    const orderStatusHistory = { create: jest.fn(async () => ({})) };
    const payment = {
        findFirst: jest.fn(async () => ({ id: 'payment-1', status: 'PENDING' })),
        update: jest.fn(async () => ({})),
    };
    const paymentStatusHistory = { create: jest.fn(async () => ({})) };
    const tx = { order, orderStatusHistory, payment, paymentStatusHistory };
    return {
        order,
        $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(tx)),
    };
}

function makeService(
    opts: {
        prisma?: ReturnType<typeof makePrisma>;
        storeStatus?: string;
        merchantStatus?: string;
        verifyResult?: unknown;
        order?: Record<string, unknown>;
    } = {},
) {
    const prisma = opts.prisma ?? makePrisma({ order: opts.order });
    return new MerchantOrdersService(
        prisma as never,
        makeAudit(),
        makeOutbox(),
        makeLedger(),
        makeStores(opts.storeStatus),
        makeMerchantApplications(opts.merchantStatus),
        makeReservations(),
        makePickupVerification(opts.verifyResult),
    );
}

describe('MerchantOrdersService', () => {
    describe('assertCanOperate (via accept)', () => {
        it('rejects when the store is not active', async () => {
            const service = makeService({ storeStatus: 'PAUSED' });
            await expect(service.accept('user-1', 'store-1', 'order-1')).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('rejects when the merchant is suspended', async () => {
            const service = makeService({ merchantStatus: 'SUSPENDED' });
            await expect(service.accept('user-1', 'store-1', 'order-1')).rejects.toThrow(
                ForbiddenException,
            );
        });
    });

    describe('accept', () => {
        it('transitions CREATED -> ACCEPTED', async () => {
            const prisma = makePrisma({ order: makeOrder({ status: 'CREATED' }) });
            const service = makeService({ prisma });

            await service.accept('user-1', 'store-1', 'order-1');

            expect(prisma.order.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'order-1', status: 'CREATED' },
                    data: { status: 'ACCEPTED' },
                }),
            );
        });

        it('rejects accepting an order not in CREATED status', async () => {
            const prisma = makePrisma({ order: makeOrder({ status: 'ACCEPTED' }) });
            const service = makeService({ prisma });

            await expect(service.accept('user-1', 'store-1', 'order-1')).rejects.toThrow(
                ConflictException,
            );
        });

        it('rejects a concurrent double-accept (compare-and-swap loses the race)', async () => {
            const prisma = makePrisma({ order: makeOrder({ status: 'CREATED' }) });
            prisma.order.updateMany = jest.fn(async () => ({ count: 0 }));
            const service = makeService({ prisma });

            await expect(service.accept('user-1', 'store-1', 'order-1')).rejects.toThrow(
                ConflictException,
            );
        });

        it('never trusts orderId alone - scopes the lookup to the resolved store', async () => {
            const prisma = makePrisma();
            prisma.order.findFirst = jest.fn(async () => null) as never;
            const service = makeService({ prisma });

            await expect(service.accept('user-1', 'store-1', 'not-owned')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('reject', () => {
        it('releases the reservation and records the mandatory reason', async () => {
            const prisma = makePrisma({ order: makeOrder({ status: 'CREATED' }) });
            const reservations = makeReservations();
            const service = new MerchantOrdersService(
                prisma as never,
                makeAudit(),
                makeOutbox(),
                makeLedger(),
                makeStores(),
                makeMerchantApplications(),
                reservations,
                makePickupVerification(),
            );

            await service.reject('user-1', 'store-1', 'order-1', { reason: 'Out of stock' });

            expect(
                (reservations as never as { releaseReservationForOrder: jest.Mock })
                    .releaseReservationForOrder,
            ).toHaveBeenCalledWith(expect.anything(), 'order-1');
            expect(prisma.order.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({ data: { status: 'REJECTED' } }),
            );
        });

        it('rejects rejecting an already-accepted order', async () => {
            const prisma = makePrisma({ order: makeOrder({ status: 'ACCEPTED' }) });
            const service = makeService({ prisma });

            await expect(
                service.reject('user-1', 'store-1', 'order-1', { reason: 'too late' }),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('markPreparing / markReady', () => {
        it('rejects marking ready before preparing', async () => {
            const prisma = makePrisma({ order: makeOrder({ status: 'ACCEPTED' }) });
            const service = makeService({ prisma });

            await expect(service.markReady('user-1', 'store-1', 'order-1')).rejects.toThrow(
                ConflictException,
            );
        });

        it('generates a pickup code when marking ready', async () => {
            const prisma = makePrisma({ order: makeOrder({ status: 'PREPARING' }) });
            const pickupVerification = makePickupVerification();
            const service = new MerchantOrdersService(
                prisma as never,
                makeAudit(),
                makeOutbox(),
                makeLedger(),
                makeStores(),
                makeMerchantApplications(),
                makeReservations(),
                pickupVerification,
            );

            await service.markReady('user-1', 'store-1', 'order-1');

            expect(
                (pickupVerification as never as { generateForOrder: jest.Mock }).generateForOrder,
            ).toHaveBeenCalled();
        });
    });

    describe('completePickup', () => {
        it('rejects when the order is not READY', async () => {
            const prisma = makePrisma({ order: makeOrder({ status: 'PREPARING' }) });
            const service = makeService({ prisma });

            await expect(
                service.completePickup('user-1', 'store-1', 'order-1', { code: '123456' }),
            ).rejects.toThrow(ConflictException);
        });

        it('on a correct code: completes the order, consumes the reservation, captures payment, and posts the ledger', async () => {
            const prisma = makePrisma({ order: makeOrder({ status: 'READY' }) });
            const reservations = makeReservations();
            const ledger = makeLedger();
            const service = new MerchantOrdersService(
                prisma as never,
                makeAudit(),
                makeOutbox(),
                ledger,
                makeStores(),
                makeMerchantApplications(),
                reservations,
                makePickupVerification({ outcome: 'verified' }),
            );

            const result = await service.completePickup('user-1', 'store-1', 'order-1', {
                code: '123456',
            });

            expect(result.verified).toBe(true);
            expect(prisma.order.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'order-1', status: 'READY' },
                    data: expect.objectContaining({ status: 'COMPLETED' }),
                }),
            );
            expect(
                (reservations as never as { consumeReservationForOrder: jest.Mock })
                    .consumeReservationForOrder,
            ).toHaveBeenCalled();
            expect(
                (ledger as never as { postCodCollection: jest.Mock }).postCodCollection,
            ).toHaveBeenCalled();
        });

        it('on an incorrect code: reports attempts remaining and changes nothing', async () => {
            const prisma = makePrisma({ order: makeOrder({ status: 'READY' }) });
            const service = makeService({
                prisma,
                order: makeOrder({ status: 'READY' }),
                verifyResult: { outcome: 'invalid', attemptsRemaining: 3 },
            });

            const result = await service.completePickup('user-1', 'store-1', 'order-1', {
                code: '000000',
            });

            expect(result).toEqual({ verified: false, attemptsRemaining: 3 });
            expect(prisma.order.updateMany).not.toHaveBeenCalled();
        });

        it('on an expired code: rejects with a conflict and changes nothing', async () => {
            const prisma = makePrisma({ order: makeOrder({ status: 'READY' }) });
            const service = makeService({
                prisma,
                order: makeOrder({ status: 'READY' }),
                verifyResult: { outcome: 'expired' },
            });

            await expect(
                service.completePickup('user-1', 'store-1', 'order-1', { code: '123456' }),
            ).rejects.toThrow(ConflictException);
            expect(prisma.order.updateMany).not.toHaveBeenCalled();
        });

        it('on a locked-out code: rejects with a conflict', async () => {
            const prisma = makePrisma({ order: makeOrder({ status: 'READY' }) });
            const service = makeService({
                prisma,
                order: makeOrder({ status: 'READY' }),
                verifyResult: { outcome: 'locked' },
            });

            await expect(
                service.completePickup('user-1', 'store-1', 'order-1', { code: '123456' }),
            ).rejects.toThrow(ConflictException);
        });

        it('rejects a concurrent double-completion (compare-and-swap loses the race)', async () => {
            const prisma = makePrisma({ order: makeOrder({ status: 'READY' }) });
            prisma.order.updateMany = jest.fn(async () => ({ count: 0 }));
            const service = makeService({ prisma, order: makeOrder({ status: 'READY' }) });

            await expect(
                service.completePickup('user-1', 'store-1', 'order-1', { code: '123456' }),
            ).rejects.toThrow(ConflictException);
        });

        it('never marks COD as paid when no payment row is found (defensive, not expected in practice)', async () => {
            const prisma = makePrisma({ order: makeOrder({ status: 'READY' }) });
            prisma.$transaction = jest.fn(async (fn: (tx: unknown) => unknown) =>
                fn({
                    order: prisma.order,
                    orderStatusHistory: { create: jest.fn(async () => ({})) },
                    payment: { findFirst: jest.fn(async () => null), update: jest.fn() },
                    paymentStatusHistory: { create: jest.fn() },
                }),
            );
            const service = makeService({ prisma, order: makeOrder({ status: 'READY' }) });

            const result = await service.completePickup('user-1', 'store-1', 'order-1', {
                code: '123456',
            });
            expect(result.verified).toBe(true);
        });
    });
});
