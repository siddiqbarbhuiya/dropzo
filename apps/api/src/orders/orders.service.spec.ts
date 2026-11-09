import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service.js';

function makePrisma(overrides: Record<string, unknown> = {}) {
    return {
        order: {
            findMany: jest.fn(async () => []),
            count: jest.fn(async () => 0),
            findFirst: jest.fn(async () => ({ id: 'order-1', customer_id: 'user-1' })),
            ...((overrides.order as object) ?? {}),
        },
    } as never;
}

describe('OrdersService', () => {
    describe('getOwnOrder', () => {
        it('looks up by id when given a UUID-shaped value', async () => {
            const findFirst = jest.fn(async () => ({ id: 'order-1' }));
            const prisma = makePrisma({ order: { findFirst } });
            const service = new OrdersService(prisma);

            await service.getOwnOrder('user-1', '11111111-1111-1111-1111-111111111111');

            expect(findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        customer_id: 'user-1',
                        OR: expect.arrayContaining([
                            { id: '11111111-1111-1111-1111-111111111111' },
                        ]),
                    }),
                }),
            );
        });

        it('never passes a non-UUID value to the id filter (order_number lookup only)', async () => {
            const findFirst = jest.fn(async () => ({ id: 'order-1' }));
            const prisma = makePrisma({ order: { findFirst } });
            const service = new OrdersService(prisma);

            await service.getOwnOrder('user-1', 'DZ20261109ABCD1234');

            expect(findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: [{ order_number: 'DZ20261109ABCD1234' }],
                    }),
                }),
            );
        });

        it("never lets a customer access another customer's order", async () => {
            const prisma = makePrisma({ order: { findFirst: jest.fn(async () => null) } });
            const service = new OrdersService(prisma);

            await expect(service.getOwnOrder('user-1', 'DZ-NOT-MINE')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('listOwnOrders', () => {
        it("scopes the list to the caller's own orders", async () => {
            const findMany = jest.fn(async () => []);
            const prisma = makePrisma({ order: { findMany } });
            const service = new OrdersService(prisma);

            await service.listOwnOrders('user-1', { page: 1, limit: 20 });

            expect(findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { customer_id: 'user-1' } }),
            );
        });
    });
});
