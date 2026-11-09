import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import type { Cart } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CartPricingService } from './cart-pricing.service.js';
import type { AddCartItemDto } from './dto/add-cart-item.dto.js';
import type { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import type { PricedCartSummary } from './cart-pricing.types.js';

/**
 * Customer cart CRUD. One cart belongs to one customer and one store
 * (`uq_carts_active_per_user` - at most one ACTIVE cart per user - plus `cart_items`'s own
 * `store_id` coming from the cart it belongs to); adding a product from a different store is a
 * clear 409, never a silent merge or an automatic clear. Pricing/validation is always delegated to
 * CartPricingService - this service only ever manages which rows exist, never computes a price.
 */
@Injectable()
export class CartService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly pricing: CartPricingService,
    ) {}

    async getActiveCart(userId: string): Promise<PricedCartSummary> {
        const cart = await this.prisma.cart.findFirst({
            where: { user_id: userId, status: 'ACTIVE' },
        });
        return this.pricing.priceCart(cart?.id ?? null);
    }

    async addItem(userId: string, dto: AddCartItemDto): Promise<PricedCartSummary> {
        const listing = await this.prisma.storeProduct.findUnique({
            where: { id: dto.storeProductId },
            include: {
                variant: { include: { product: true } },
                store: { include: { merchant: true } },
            },
        });
        if (!listing) {
            throw new NotFoundException('Listing not found.');
        }
        if (
            !listing.is_available ||
            !listing.variant.is_active ||
            !listing.variant.product.is_active
        ) {
            throw new ConflictException('This product is not currently available for purchase.');
        }
        if (listing.store.status !== 'ACTIVE') {
            throw new ConflictException('This store is not currently accepting orders.');
        }
        if (listing.store.merchant.verification_status !== 'APPROVED') {
            throw new ForbiddenException('This store is not currently accepting orders.');
        }

        const cartId = await this.prisma.$transaction(async (tx) => {
            let cart = await tx.cart.findFirst({ where: { user_id: userId, status: 'ACTIVE' } });
            if (cart && cart.store_id !== listing.store_id) {
                throw new ConflictException(
                    'Your cart already has items from a different store. Clear your cart before adding items from another store.',
                );
            }
            if (!cart) {
                cart = await tx.cart.create({
                    data: { user_id: userId, store_id: listing.store_id },
                });
            }

            const existing = await tx.cartItem.findUnique({
                where: {
                    cart_id_store_product_id: { cart_id: cart.id, store_product_id: listing.id },
                },
            });
            if (existing) {
                // Duplicate add-to-cart of the same listing increments quantity, the common
                // e-commerce convention - a separate, explicit update-quantity endpoint exists for
                // setting an absolute amount.
                await tx.cartItem.update({
                    where: { id: existing.id },
                    data: { quantity: { increment: dto.quantity } },
                });
            } else {
                await tx.cartItem.create({
                    data: {
                        cart_id: cart.id,
                        store_product_id: listing.id,
                        quantity: dto.quantity,
                    },
                });
            }
            await tx.cart.update({ where: { id: cart.id }, data: { updated_at: new Date() } });
            return cart.id;
        });

        return this.pricing.priceCart(cartId);
    }

    async updateItemQuantity(
        userId: string,
        itemId: string,
        dto: UpdateCartItemDto,
    ): Promise<PricedCartSummary> {
        const cart = await this.getOwnActiveCartOrThrow(userId);
        const item = await this.getOwnedItemOrThrow(cart.id, itemId);

        await this.prisma.cartItem.update({
            where: { id: item.id },
            data: { quantity: dto.quantity },
        });
        await this.prisma.cart.update({ where: { id: cart.id }, data: { updated_at: new Date() } });
        return this.pricing.priceCart(cart.id);
    }

    async removeItem(userId: string, itemId: string): Promise<PricedCartSummary> {
        const cart = await this.getOwnActiveCartOrThrow(userId);
        const item = await this.getOwnedItemOrThrow(cart.id, itemId);

        await this.prisma.$transaction(async (tx) => {
            await tx.cartItem.delete({ where: { id: item.id } });
            const remaining = await tx.cartItem.count({ where: { cart_id: cart.id } });
            if (remaining === 0) {
                // An empty cart carries no store-lock information worth keeping - deleting it (not
                // just leaving it ACTIVE-but-empty) is what lets the customer start a fresh cart
                // for a different store without first calling clearCart. deleteMany, not delete -
                // idempotent against a concurrent double-removal racing to delete the same cart.
                await tx.cart.deleteMany({ where: { id: cart.id } });
            } else {
                await tx.cart.update({ where: { id: cart.id }, data: { updated_at: new Date() } });
            }
        });
        return this.pricing.priceCart(null);
    }

    async clearCart(userId: string): Promise<PricedCartSummary> {
        const cart = await this.prisma.cart.findFirst({
            where: { user_id: userId, status: 'ACTIVE' },
        });
        if (cart) {
            await this.prisma.cart.deleteMany({ where: { id: cart.id } });
        }
        return this.pricing.priceCart(null);
    }

    private async getOwnActiveCartOrThrow(userId: string): Promise<Cart> {
        const cart = await this.prisma.cart.findFirst({
            where: { user_id: userId, status: 'ACTIVE' },
        });
        if (!cart) {
            throw new NotFoundException('You have no active cart.');
        }
        return cart;
    }

    /** Never trusts itemId alone - always re-checked against the caller's own cart. */
    private async getOwnedItemOrThrow(cartId: string, itemId: string) {
        const item = await this.prisma.cartItem.findFirst({
            where: { id: itemId, cart_id: cartId },
        });
        if (!item) {
            throw new NotFoundException('Cart item not found.');
        }
        return item;
    }
}
