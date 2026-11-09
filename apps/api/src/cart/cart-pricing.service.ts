import { Injectable } from '@nestjs/common';
import type { CartItem, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CartLineErrorCode, PricedCartLine, PricedCartSummary } from './cart-pricing.types.js';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * Central, authoritative cart validation and pricing - every number here is recomputed fresh from
 * the database on every call. Used by both the cart-summary endpoint (informational) and checkout
 * (must have zero errors to proceed). Never trusts a client-supplied price, quantity cap, or
 * total - see AGENTS.md section 7 / SECURITY-STANDARDS.md.
 *
 * Every method takes an optional `client`, defaulting to the ambient PrismaService connection -
 * checkout's order-creation transaction passes its own `tx` so the authoritative re-validation
 * reads happen inside the same transaction as the reservation and order insert, not from a
 * snapshot taken before the transaction started.
 */
@Injectable()
export class CartPricingService {
    constructor(private readonly prisma: PrismaService) {}

    async priceCart(
        cartId: string | null,
        client: DbClient = this.prisma,
    ): Promise<PricedCartSummary> {
        if (!cartId) {
            return {
                cartId: null,
                storeId: null,
                storeName: null,
                items: [],
                subtotal: 0,
                totalAmount: 0,
                isValid: false,
            };
        }

        const cart = await client.cart.findUnique({
            where: { id: cartId },
            include: { store: true, items: true },
        });
        if (!cart) {
            return {
                cartId: null,
                storeId: null,
                storeName: null,
                items: [],
                subtotal: 0,
                totalAmount: 0,
                isValid: false,
            };
        }

        const items = await Promise.all(cart.items.map((item) => this.priceLine(item, client)));
        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        const isValid = items.length > 0 && items.every((item) => item.errors.length === 0);

        return {
            cartId: cart.id,
            storeId: cart.store_id,
            storeName: cart.store.name,
            items,
            subtotal: round2(subtotal),
            // No delivery fee, tax, or platform charge is configured anywhere in the schema today
            // (Store has no fee field) - fabricating one would violate the task's explicit
            // instruction, so total_amount is exactly the subtotal until a real charge exists.
            totalAmount: round2(subtotal),
            isValid,
        };
    }

    private async priceLine(item: CartItem, client: DbClient): Promise<PricedCartLine> {
        const listing = await client.storeProduct.findUnique({
            where: { id: item.store_product_id },
            include: {
                variant: { include: { product: true } },
                store: { include: { merchant: true } },
                inventory: { include: { stock_batches: true } },
            },
        });

        const errors: CartLineErrorCode[] = [];
        if (!listing) {
            return {
                cartItemId: item.id,
                storeProductId: item.store_product_id,
                inventoryId: null,
                usesBatchTracking: false,
                productName: 'Unknown product',
                variantName: 'Unknown variant',
                sku: null,
                unit: '',
                quantity: Number(item.quantity),
                unitPrice: 0,
                subtotal: 0,
                errors: ['LISTING_NOT_FOUND'],
            };
        }

        if (!listing.is_available) errors.push('LISTING_UNAVAILABLE');
        if (!listing.variant.is_active) errors.push('VARIANT_INACTIVE');
        if (!listing.variant.product.is_active) errors.push('PRODUCT_INACTIVE');
        if (listing.store.status !== 'ACTIVE') errors.push('STORE_INACTIVE');
        if (listing.store.merchant.verification_status !== 'APPROVED')
            errors.push('MERCHANT_INACTIVE');

        const quantity = Number(item.quantity);
        if (!this.hasSufficientStock(listing.inventory, listing.uses_batch_tracking, quantity)) {
            errors.push('INSUFFICIENT_STOCK');
        }

        const unitPrice = Number(listing.selling_price);
        return {
            cartItemId: item.id,
            storeProductId: item.store_product_id,
            inventoryId: listing.inventory?.id ?? null,
            usesBatchTracking: listing.uses_batch_tracking,
            productName: listing.variant.product.name,
            variantName: listing.variant.variant_name,
            sku: listing.variant.sku,
            unit: listing.variant.unit,
            quantity,
            unitPrice,
            subtotal: round2(unitPrice * quantity),
            errors,
        };
    }

    private hasSufficientStock(
        inventory:
            | {
                  on_hand_quantity: unknown;
                  reserved_quantity: unknown;
                  stock_batches: Array<{
                      on_hand_quantity: unknown;
                      reserved_quantity: unknown;
                      expiry_date: Date | null;
                  }>;
              }
            | null
            | undefined,
        usesBatchTracking: boolean,
        quantity: number,
    ): boolean {
        if (!inventory) return false;
        if (!usesBatchTracking) {
            const available =
                Number(inventory.on_hand_quantity) - Number(inventory.reserved_quantity);
            return available >= quantity;
        }
        // Date-only comparison, matching SQL's `expiry_date >= CURRENT_DATE` (no time-of-day
        // component) - a plain `new Date()` would incorrectly treat a batch expiring later today
        // as already expired once any time has passed since midnight.
        const todayMidnightUtc = new Date();
        todayMidnightUtc.setUTCHours(0, 0, 0, 0);
        const available = inventory.stock_batches
            .filter((batch) => batch.expiry_date === null || batch.expiry_date >= todayMidnightUtc)
            .reduce(
                (sum, batch) =>
                    sum + (Number(batch.on_hand_quantity) - Number(batch.reserved_quantity)),
                0,
            );
        return available >= quantity;
    }
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}
