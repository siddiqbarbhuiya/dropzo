import { jest } from '@jest/globals';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service.js';

function makePricing() {
    return { priceCart: jest.fn(async (cartId: string | null) => ({ cartId })) } as never;
}

function makeListing(overrides: Record<string, unknown> = {}) {
    return {
        id: 'listing-1',
        store_id: 'store-1',
        is_available: true,
        variant: { is_active: true, product: { is_active: true } },
        store: { status: 'ACTIVE', merchant: { verification_status: 'APPROVED' } },
        ...overrides,
    };
}

function makePrisma(
    opts: {
        listing?: unknown;
        existingCart?: Record<string, unknown> | null;
        existingItem?: Record<string, unknown> | null;
    } = {},
) {
    const cart = {
        findFirst: jest.fn(async () => opts.existingCart ?? null),
        create: jest.fn(async (args: { data: Record<string, unknown> }) => ({
            id: 'cart-new',
            ...args.data,
        })),
        update: jest.fn(async () => ({})),
        deleteMany: jest.fn(async () => ({ count: 1 })),
    };
    const cartItem = {
        findUnique: jest.fn(async () => opts.existingItem ?? null),
        findFirst: jest.fn(async () => opts.existingItem ?? null),
        create: jest.fn(async () => ({ id: 'item-new' })),
        update: jest.fn(async () => ({})),
        delete: jest.fn(async () => ({})),
        count: jest.fn(async () => 0),
    };
    const storeProduct = {
        findUnique: jest.fn(async () => ('listing' in opts ? opts.listing : makeListing())),
    };
    const tx = { cart, cartItem };
    return {
        cart,
        cartItem,
        storeProduct,
        $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(tx)),
    } as never;
}

describe('CartService', () => {
    describe('addItem', () => {
        it('creates a new cart when none is active', async () => {
            const prisma = makePrisma();
            const service = new CartService(prisma, makePricing());

            await service.addItem('user-1', { storeProductId: 'listing-1', quantity: 2 });

            expect(
                (prisma as never as { cart: { create: jest.Mock } }).cart.create,
            ).toHaveBeenCalled();
        });

        it('rejects adding an item from a different store (no silent merge)', async () => {
            const prisma = makePrisma({
                existingCart: { id: 'cart-1', store_id: 'store-OTHER' },
            });
            const service = new CartService(prisma, makePricing());

            await expect(
                service.addItem('user-1', { storeProductId: 'listing-1', quantity: 1 }),
            ).rejects.toThrow(ConflictException);
        });

        it('increments quantity when the same listing is added again', async () => {
            const prisma = makePrisma({
                existingCart: { id: 'cart-1', store_id: 'store-1' },
                existingItem: { id: 'item-1' },
            });
            const service = new CartService(prisma, makePricing());

            await service.addItem('user-1', { storeProductId: 'listing-1', quantity: 3 });

            expect(
                (prisma as never as { cartItem: { update: jest.Mock } }).cartItem.update,
            ).toHaveBeenCalledWith(
                expect.objectContaining({ data: { quantity: { increment: 3 } } }),
            );
        });

        it('rejects an inactive or unavailable listing', async () => {
            const prisma = makePrisma({ listing: makeListing({ is_available: false }) });
            const service = new CartService(prisma, makePricing());

            await expect(
                service.addItem('user-1', { storeProductId: 'listing-1', quantity: 1 }),
            ).rejects.toThrow(ConflictException);
        });

        it('rejects a listing from a suspended merchant', async () => {
            const prisma = makePrisma({
                listing: makeListing({
                    store: { status: 'ACTIVE', merchant: { verification_status: 'SUSPENDED' } },
                }),
            });
            const service = new CartService(prisma, makePricing());

            await expect(
                service.addItem('user-1', { storeProductId: 'listing-1', quantity: 1 }),
            ).rejects.toThrow(ForbiddenException);
        });

        it('rejects a listing whose store is not found', async () => {
            const prisma = makePrisma({ listing: null });
            const service = new CartService(prisma, makePricing());

            await expect(
                service.addItem('user-1', { storeProductId: 'missing', quantity: 1 }),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('removeItem', () => {
        it('deletes the cart entirely when the last item is removed', async () => {
            const prisma = makePrisma({
                existingCart: { id: 'cart-1', store_id: 'store-1' },
                existingItem: { id: 'item-1' },
            });
            const service = new CartService(prisma, makePricing());

            await service.removeItem('user-1', 'item-1');

            expect(
                (prisma as never as { cart: { deleteMany: jest.Mock } }).cart.deleteMany,
            ).toHaveBeenCalledWith({ where: { id: 'cart-1' } });
        });

        it("never trusts itemId alone - scopes removal to the caller's own cart", async () => {
            const prisma = makePrisma({
                existingCart: { id: 'cart-1', store_id: 'store-1' },
                existingItem: null,
            });
            const service = new CartService(prisma, makePricing());

            await expect(service.removeItem('user-1', 'not-owned-item')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('updateItemQuantity', () => {
        it('rejects when the caller has no active cart', async () => {
            const prisma = makePrisma({ existingCart: null });
            const service = new CartService(prisma, makePricing());

            await expect(
                service.updateItemQuantity('user-1', 'item-1', { quantity: 2 }),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
