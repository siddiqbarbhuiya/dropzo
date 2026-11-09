import { randomBytes } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Order, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { IdempotencyService } from '../common/idempotency/idempotency.service.js';
import { CartPricingService } from '../cart/cart-pricing.service.js';
import { ReservationService } from '../inventory/reservation.service.js';
import { FulfilmentValidationService } from './fulfilment-validation.service.js';
import type { PrepareCheckoutDto } from './dto/prepare-checkout.dto.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';
import type { CheckoutSummary } from './checkout.types.js';

const IDEMPOTENCY_SCOPE = 'checkout.create_order';
// How long the order's reservation holds stock before the expiry job releases it and cancels the
// order, in the absence of a merchant accept/reject flow in this milestone (BC-009+). Documented
// in ORDER-MANAGEMENT-DESIGN.md's "Reservation lifecycle" section.
const ORDER_ACCEPTANCE_WINDOW_MS = 24 * 60 * 60 * 1000;
const PRICE_TOLERANCE = 0.01;
// See the usage site for why this exists and why the exact number is a placeholder, not policy.
const MAX_OPEN_ORDERS_PER_CUSTOMER = 5;

function generateOrderNumber(): string {
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = randomBytes(4).toString('hex').toUpperCase();
    return `DZ${ymd}${suffix}`;
}

/**
 * Checkout preparation (read-only preview) and order creation (the one mutating operation that
 * reserves stock, creates the order, and transitions the cart - all in one transaction). See
 * docs/04-design/CART-CHECKOUT-DESIGN.md / ORDER-MANAGEMENT-DESIGN.md for the full lifecycle.
 */
@Injectable()
export class CheckoutService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly pricing: CartPricingService,
        private readonly fulfilment: FulfilmentValidationService,
        private readonly reservations: ReservationService,
        private readonly idempotency: IdempotencyService,
        private readonly audit: AuditService,
    ) {}

    async prepare(userId: string, dto: PrepareCheckoutDto): Promise<CheckoutSummary> {
        const cart = await this.getOwnActiveCartOrThrow(userId);
        const priced = await this.pricing.priceCart(cart.id);
        const fulfilmentErrors = await this.fulfilment.validate(
            cart.store_id,
            dto.fulfilmentType,
            dto.deliveryAddress,
        );
        return {
            ...priced,
            fulfilmentType: dto.fulfilmentType,
            fulfilmentErrors,
            isReadyForCheckout: priced.isValid && fulfilmentErrors.length === 0,
        };
    }

    /**
     * Idempotent: a retry with the same (user, idempotencyKey, request body) replays the original
     * order rather than creating a second one; the same key with a different body is rejected;
     * concurrent duplicates serialize on the idempotency_records unique constraint so only one
     * ever proceeds to create an order. See IdempotencyService / DATABASE-DESIGN.md's "Idempotency
     * rules".
     */
    async createOrder(
        userId: string,
        dto: CreateOrderDto,
        idempotencyKey: string,
    ): Promise<Order & { items: unknown[] }> {
        const outcome = await this.idempotency.begin<{ orderId: string; orderNumber: string }>(
            IDEMPOTENCY_SCOPE,
            userId,
            idempotencyKey,
            dto,
        );
        if (outcome.kind === 'in_progress') {
            throw new ConflictException(
                'A request with this idempotency key is already being processed.',
            );
        }
        if (outcome.kind === 'completed') {
            return this.prisma.order.findUniqueOrThrow({
                where: { id: outcome.response.orderId },
                include: { items: true },
            });
        }

        try {
            const order = await this.doCreateOrder(userId, dto, idempotencyKey);
            await this.idempotency.complete(IDEMPOTENCY_SCOPE, userId, idempotencyKey, {
                orderId: order.id,
                orderNumber: order.order_number,
            });
            return order;
        } catch (error) {
            await this.idempotency.fail(IDEMPOTENCY_SCOPE, userId, idempotencyKey);
            throw error;
        }
    }

    private async doCreateOrder(
        userId: string,
        dto: CreateOrderDto,
        idempotencyKey: string,
    ): Promise<Order & { items: unknown[] }> {
        return this.prisma.$transaction(async (tx) => {
            const cart = await tx.cart.findFirst({ where: { user_id: userId, status: 'ACTIVE' } });
            if (!cart) {
                throw new NotFoundException('You have no active cart.');
            }

            // A conservative defense-in-depth ceiling, not a tuned product policy - COD needs no
            // upfront payment, so nothing else stops a customer from repeatedly creating orders
            // against scarce stock and never collecting any of them (flagged by an automated
            // security review; see RISK-014/TD-017 for the real per-customer limit, which depends
            // on usage patterns this task has no basis to invent).
            const openOrders = await tx.order.count({
                where: { customer_id: userId, status: 'CREATED' },
            });
            if (openOrders >= MAX_OPEN_ORDERS_PER_CUSTOMER) {
                throw new ConflictException(
                    'You have too many orders awaiting confirmation. Please wait for an existing order to be processed before placing another.',
                );
            }

            // Authoritative re-validation, inside this transaction - never the stale read from a
            // separate prepareCheckout call, and never the client's own totals.
            const priced = await this.pricing.priceCart(cart.id, tx);
            if (!priced.isValid) {
                throw new ConflictException(
                    'Your cart has items that are no longer available or in stock. Please review your cart again.',
                );
            }
            const fulfilmentErrors = await this.fulfilment.validate(
                cart.store_id,
                dto.fulfilmentType,
                dto.deliveryAddress,
                tx,
            );
            if (fulfilmentErrors.length > 0) {
                throw new ConflictException(
                    `The requested fulfilment method is not available: ${fulfilmentErrors.join(', ')}.`,
                );
            }
            if (Math.abs(dto.expectedTotalAmount - priced.totalAmount) > PRICE_TOLERANCE) {
                throw new ConflictException(
                    'Prices have changed since you last viewed your cart. Please review your cart again.',
                );
            }

            const store = await tx.store.findUniqueOrThrow({ where: { id: cart.store_id } });
            const isDelivery = dto.fulfilmentType === 'DELIVERY';

            let order: Order | undefined;
            for (let attempt = 0; attempt < 5; attempt++) {
                try {
                    order = await tx.order.create({
                        data: {
                            order_number: generateOrderNumber(),
                            customer_id: userId,
                            store_id: store.id,
                            store_name_snapshot: store.name,
                            store_address_snapshot: store.address,
                            fulfilment_type: dto.fulfilmentType,
                            status: 'CREATED',
                            delivery_recipient_name_snapshot: isDelivery
                                ? dto.deliveryAddress!.recipientName
                                : undefined,
                            delivery_recipient_phone_snapshot: isDelivery
                                ? dto.deliveryAddress!.recipientPhone
                                : undefined,
                            delivery_address_snapshot: isDelivery
                                ? (dto.deliveryAddress as unknown as Prisma.InputJsonValue)
                                : undefined,
                            subtotal: priced.subtotal,
                            total_amount: priced.totalAmount,
                            payment_method: 'COD',
                            idempotency_key: idempotencyKey,
                            customer_notes: dto.customerNotes,
                        },
                    });
                    break;
                } catch (error) {
                    if (attempt === 4) throw error;
                }
            }
            if (!order) {
                throw new ConflictException(
                    'Could not generate a unique order number. Please retry.',
                );
            }

            for (const item of priced.items) {
                await tx.orderItem.create({
                    data: {
                        order_id: order.id,
                        store_product_id: item.storeProductId,
                        product_name_snapshot: item.productName,
                        variant_snapshot: item.variantName,
                        sku_snapshot: item.sku,
                        unit_price: item.unitPrice,
                        quantity: item.quantity,
                        tax_amount: 0,
                        line_total: item.subtotal,
                    },
                });
            }

            const expiresAt = new Date(Date.now() + ORDER_ACCEPTANCE_WINDOW_MS);
            await this.reservations.reserveForOrder(
                tx,
                order.id,
                priced.items.map((item) => ({
                    inventoryId: item.inventoryId!,
                    quantity: item.quantity,
                    usesBatchTracking: item.usesBatchTracking,
                })),
                expiresAt,
            );

            await tx.payment.create({
                data: {
                    order_id: order.id,
                    provider: 'COD',
                    amount: priced.totalAmount,
                    status: 'PENDING',
                },
            });
            await tx.orderStatusHistory.create({
                data: { order_id: order.id, new_status: 'CREATED' },
            });
            // Transition, never delete - order history must stay intact for the customer to view.
            await tx.cart.update({ where: { id: cart.id }, data: { status: 'CHECKED_OUT' } });

            await this.audit.record({
                actorUserId: userId,
                action: 'ORDER_CREATED',
                entityType: 'order',
                entityId: order.id,
                afterState: { orderNumber: order.order_number, totalAmount: priced.totalAmount },
            });

            return tx.order.findUniqueOrThrow({
                where: { id: order.id },
                include: { items: true },
            });
        });
    }

    private async getOwnActiveCartOrThrow(userId: string) {
        const cart = await this.prisma.cart.findFirst({
            where: { user_id: userId, status: 'ACTIVE' },
        });
        if (!cart) {
            throw new NotFoundException('You have no active cart.');
        }
        return cart;
    }
}
