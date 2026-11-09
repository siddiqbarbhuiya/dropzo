import { jest } from '@jest/globals';
import { CartPricingService } from './cart-pricing.service.js';

function makeListing(overrides: Record<string, unknown> = {}) {
    return {
        id: 'listing-1',
        selling_price: 100,
        is_available: true,
        uses_batch_tracking: false,
        variant: {
            variant_name: '1kg pack',
            unit: 'kg',
            sku: 'SKU-1',
            is_active: true,
            product: { name: 'Basmati Rice', is_active: true },
        },
        store: { status: 'ACTIVE', merchant: { verification_status: 'APPROVED' } },
        inventory: {
            id: 'inventory-1',
            on_hand_quantity: 10,
            reserved_quantity: 0,
            stock_batches: [],
        },
        ...overrides,
    };
}

function makePrisma(listing: unknown, cartOverrides: Record<string, unknown> = {}) {
    return {
        cart: {
            findUnique: jest.fn(async () => ({
                id: 'cart-1',
                store_id: 'store-1',
                store: { name: 'Main Branch' },
                items: [{ id: 'item-1', store_product_id: 'listing-1', quantity: 2 }],
                ...cartOverrides,
            })),
        },
        storeProduct: {
            findUnique: jest.fn(async () => listing),
        },
    } as never;
}

describe('CartPricingService', () => {
    it('returns an empty, invalid summary when no cart id is given', async () => {
        const service = new CartPricingService(makePrisma(makeListing()));
        const summary = await service.priceCart(null);
        expect(summary).toEqual({
            cartId: null,
            storeId: null,
            storeName: null,
            items: [],
            subtotal: 0,
            totalAmount: 0,
            isValid: false,
        });
    });

    it('prices a valid cart with no errors', async () => {
        const prisma = makePrisma(makeListing());
        const service = new CartPricingService(prisma);

        const summary = await service.priceCart('cart-1');
        expect(summary.isValid).toBe(true);
        expect(summary.items).toHaveLength(1);
        expect(summary.items[0]!.errors).toEqual([]);
        expect(summary.subtotal).toBe(200);
        expect(summary.totalAmount).toBe(200);
    });

    it('flags an inactive listing, store, and merchant', async () => {
        const prisma = makePrisma(
            makeListing({
                is_available: false,
                store: { status: 'PAUSED', merchant: { verification_status: 'SUSPENDED' } },
            }),
        );
        const service = new CartPricingService(prisma);

        const summary = await service.priceCart('cart-1');
        expect(summary.isValid).toBe(false);
        expect(summary.items[0]!.errors).toEqual(
            expect.arrayContaining(['LISTING_UNAVAILABLE', 'STORE_INACTIVE', 'MERCHANT_INACTIVE']),
        );
    });

    it('flags insufficient aggregate stock', async () => {
        const prisma = makePrisma(
            makeListing({
                inventory: {
                    id: 'inventory-1',
                    on_hand_quantity: 1,
                    reserved_quantity: 0,
                    stock_batches: [],
                },
            }),
        );
        const service = new CartPricingService(prisma);

        const summary = await service.priceCart('cart-1');
        expect(summary.items[0]!.errors).toContain('INSUFFICIENT_STOCK');
    });

    it('excludes expired batches when summing batch-tracked availability', async () => {
        const prisma = makePrisma(
            makeListing({
                uses_batch_tracking: true,
                inventory: {
                    id: 'inventory-1',
                    on_hand_quantity: 10,
                    reserved_quantity: 0,
                    stock_batches: [
                        {
                            on_hand_quantity: 10,
                            reserved_quantity: 0,
                            expiry_date: new Date('2020-01-01'),
                        },
                    ],
                },
            }),
        );
        const service = new CartPricingService(prisma);

        const summary = await service.priceCart('cart-1');
        expect(summary.items[0]!.errors).toContain('INSUFFICIENT_STOCK');
    });

    it('reports a missing listing without throwing', async () => {
        const prisma = makePrisma(null);
        const service = new CartPricingService(prisma);

        const summary = await service.priceCart('cart-1');
        expect(summary.items[0]!.errors).toEqual(['LISTING_NOT_FOUND']);
        expect(summary.isValid).toBe(false);
    });
});
