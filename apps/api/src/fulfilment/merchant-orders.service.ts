import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import type { Order, Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { OutboxService } from '../common/outbox/outbox.service.js';
import { LedgerService } from '../common/ledger/ledger.service.js';
import { MerchantApplicationService } from '../merchant/merchant-application.service.js';
import { StoreService } from '../merchant/store.service.js';
import { ReservationService } from '../inventory/reservation.service.js';
import { PickupVerificationService } from './pickup-verification.service.js';
import type { PaginatedResult } from '../merchant/dto/pagination.dto.js';
import type { ListMerchantOrdersDto } from './dto/list-merchant-orders.dto.js';
import type { RejectOrderDto } from './dto/reject-order.dto.js';
import type { VerifyPickupCodeDto } from './dto/verify-pickup-code.dto.js';

const ORDER_INCLUDE = {
    items: true,
    status_history: { orderBy: { created_at: 'asc' as const } },
    payments: true,
};

/**
 * The merchant order lifecycle this milestone implements: `CREATED -> ACCEPTED -> PREPARING ->
 * READY -> COMPLETED` (successful pickup verification), with `CREATED -> REJECTED` as the only
 * early exit a merchant can take. Every real `order_status` enum value this needs already exists
 * (BC-004) - no migration adds a new one. See `docs/04-design/ORDER-FULFILMENT-DESIGN.md` for the
 * full state machine and the reasoning behind each transition's guard.
 *
 * Every transition is a compare-and-swap (`updateMany` scoped to the order's id *and* its expected
 * current status, the same pattern BC-005/006 established for token rotation and application
 * decisions) - two concurrent requests racing to change one order's status can never both succeed.
 */
@Injectable()
export class MerchantOrdersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly outbox: OutboxService,
        private readonly ledger: LedgerService,
        private readonly stores: StoreService,
        private readonly merchantApplications: MerchantApplicationService,
        private readonly reservations: ReservationService,
        private readonly pickupVerification: PickupVerificationService,
    ) {}

    async listOwnStoreOrders(
        userId: string,
        storeId: string,
        query: ListMerchantOrdersDto,
    ): Promise<PaginatedResult<Order>> {
        await this.stores.getOwnStore(userId, storeId);
        const where = { store_id: storeId, ...(query.status ? { status: query.status } : {}) };
        const [data, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                include: ORDER_INCLUDE,
                orderBy: { created_at: 'desc' },
                skip: (query.page - 1) * query.limit,
                take: query.limit,
            }),
            this.prisma.order.count({ where }),
        ]);
        return {
            data,
            meta: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / query.limit)),
            },
        };
    }

    async getOwnStoreOrder(userId: string, storeId: string, orderId: string): Promise<Order> {
        await this.stores.getOwnStore(userId, storeId);
        return this.getOwnedOrThrow(storeId, orderId);
    }

    async accept(userId: string, storeId: string, orderId: string): Promise<Order> {
        await this.assertCanOperate(userId, storeId);
        return this.transition(userId, storeId, orderId, 'CREATED', 'ACCEPTED', async () => {
            // Accepted - never touched by the ordinary unaccepted-order expiry job again (see
            // ReservationService.releaseExpiredOrderReservations's order-status join filter).
        });
    }

    async reject(
        userId: string,
        storeId: string,
        orderId: string,
        dto: RejectOrderDto,
    ): Promise<Order> {
        await this.assertCanOperate(userId, storeId);
        return this.transition(
            userId,
            storeId,
            orderId,
            'CREATED',
            'REJECTED',
            async (tx, order) => {
                // Release exactly once - releaseReservationForOrder is itself idempotent (the
                // compare-and-swap inside releaseReservation), but the status compare-and-swap above
                // already guarantees this closure only ever runs once per order regardless.
                await this.reservations.releaseReservationForOrder(tx, order.id);
            },
            dto.reason,
        );
    }

    async markPreparing(userId: string, storeId: string, orderId: string): Promise<Order> {
        await this.assertCanOperate(userId, storeId);
        return this.transition(userId, storeId, orderId, 'ACCEPTED', 'PREPARING', async () => {});
    }

    async markReady(userId: string, storeId: string, orderId: string): Promise<Order> {
        await this.assertCanOperate(userId, storeId);
        return this.transition(
            userId,
            storeId,
            orderId,
            'PREPARING',
            'READY',
            async (tx, order) => {
                // The plaintext is used only for the outbox payload here - never returned from this
                // (or any merchant-facing) API response. See PickupVerificationService's class doc.
                const code = await this.pickupVerification.generateForOrder(tx, order.id);
                await this.outbox.record(tx, {
                    aggregateType: 'order',
                    aggregateId: order.id,
                    eventType: 'ORDER_READY_FOR_PICKUP',
                    payload: {
                        orderId: order.id,
                        orderNumber: order.order_number,
                        pickupCode: code,
                    },
                });
            },
        );
    }

    /**
     * The one operation that completes an order - never reachable by setting `status` directly,
     * only ever as the result of a successful pickup-code verification in this same transaction.
     * Verification, reservation consumption, COD payment capture, ledger posting, status history,
     * audit, and the outbox event all happen atomically: a failed verification leaves every one of
     * them untouched (the transaction simply never reaches past `pickupVerification.verify`'s
     * `'verified'` branch).
     */
    async completePickup(
        userId: string,
        storeId: string,
        orderId: string,
        dto: VerifyPickupCodeDto,
    ): Promise<{ verified: boolean; order?: Order; attemptsRemaining?: number }> {
        await this.assertCanOperate(userId, storeId);
        const order = await this.getOwnedOrThrow(storeId, orderId);
        if (order.status !== 'READY') {
            throw new ConflictException('This order is not ready for pickup collection.');
        }

        return this.prisma.$transaction(async (tx) => {
            const outcome = await this.pickupVerification.verify(tx, order.id, dto.code);
            if (outcome.outcome !== 'verified') {
                if (outcome.outcome === 'invalid') {
                    return { verified: false, attemptsRemaining: outcome.attemptsRemaining };
                }
                throw new ConflictException(
                    outcome.outcome === 'expired'
                        ? 'This pickup code has expired.'
                        : outcome.outcome === 'locked'
                          ? 'Too many incorrect attempts. This code can no longer be used.'
                          : 'No pickup code exists for this order.',
                );
            }

            const completed = await tx.order.updateMany({
                where: { id: order.id, status: 'READY' },
                data: { status: 'COMPLETED', completed_at: new Date() },
            });
            if (completed.count === 0) {
                throw new ConflictException(
                    'This order has already been completed or changed state.',
                );
            }

            await this.reservations.consumeReservationForOrder(tx, order.id, userId);

            const payment = await tx.payment.findFirst({ where: { order_id: order.id } });
            if (payment && payment.status === 'PENDING') {
                await tx.payment.update({
                    where: { id: payment.id },
                    data: { status: 'CAPTURED' },
                });
                await tx.paymentStatusHistory.create({
                    data: {
                        payment_id: payment.id,
                        old_status: 'PENDING',
                        new_status: 'CAPTURED',
                        actor_user_id: userId,
                        source: 'MERCHANT',
                        reason: 'COD collected at pickup.',
                    },
                });
            }

            const merchant = await this.merchantApplications.getMerchantForOwner(userId);
            await this.ledger.postCodCollection(tx, order, merchant);

            await tx.orderStatusHistory.create({
                data: {
                    order_id: order.id,
                    old_status: 'READY',
                    new_status: 'COMPLETED',
                    changed_by: userId,
                    reason: 'Pickup code verified.',
                },
            });
            await this.audit.record({
                actorUserId: userId,
                action: 'ORDER_PICKUP_COMPLETED',
                entityType: 'order',
                entityId: order.id,
            });
            await this.outbox.record(tx, {
                aggregateType: 'order',
                aggregateId: order.id,
                eventType: 'ORDER_COMPLETED',
                payload: { orderId: order.id, orderNumber: order.order_number },
            });

            const reloaded = await tx.order.findUniqueOrThrow({
                where: { id: order.id },
                include: ORDER_INCLUDE,
            });
            return { verified: true, order: reloaded };
        });
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------

    /**
     * Shared compare-and-swap transition body: lock in the expected `fromStatus`, run the
     * caller's side effect (reservation release, pickup-code generation, ...) inside the same
     * transaction, write status history + audit + a generic outbox event, and return the reloaded
     * order. A mismatched `fromStatus` (already transitioned by a concurrent request, or simply
     * the wrong state for this action) is a clean `409`, never a silent no-op or a partial change.
     */
    private async transition(
        userId: string,
        storeId: string,
        orderId: string,
        fromStatus: string,
        toStatus: string,
        sideEffect: (tx: Tx, order: Order) => Promise<void>,
        reason?: string,
    ): Promise<Order> {
        const order = await this.getOwnedOrThrow(storeId, orderId);
        if (order.status !== fromStatus) {
            throw new ConflictException(
                `Cannot transition this order from ${order.status} to ${toStatus}.`,
            );
        }

        return this.prisma.$transaction(async (tx) => {
            const result = await tx.order.updateMany({
                where: { id: order.id, status: fromStatus },
                data: { status: toStatus as Order['status'] },
            });
            if (result.count === 0) {
                throw new ConflictException(
                    "This order's status has already changed - reload and retry.",
                );
            }

            await sideEffect(tx, order);

            await tx.orderStatusHistory.create({
                data: {
                    order_id: order.id,
                    old_status: fromStatus as Order['status'],
                    new_status: toStatus as Order['status'],
                    changed_by: userId,
                    reason,
                },
            });
            await this.audit.record({
                actorUserId: userId,
                action: `ORDER_${toStatus}`,
                entityType: 'order',
                entityId: order.id,
                afterState: reason ? { reason } : undefined,
            });
            await this.outbox.record(tx, {
                aggregateType: 'order',
                aggregateId: order.id,
                eventType: `ORDER_${toStatus}`,
                payload: { orderId: order.id, orderNumber: order.order_number, reason },
            });

            return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: ORDER_INCLUDE });
        });
    }

    /** Suspended merchants and inactive stores must not accept new orders or act on existing ones. */
    private async assertCanOperate(userId: string, storeId: string): Promise<void> {
        const store = await this.stores.getOwnStore(userId, storeId);
        if (store.status !== 'ACTIVE') {
            throw new ForbiddenException('This store is not currently active.');
        }
        const merchant = await this.merchantApplications.getMerchantForOwner(userId);
        if (merchant.verification_status === 'SUSPENDED') {
            throw new ForbiddenException('Your merchant account is suspended.');
        }
    }

    /** Never trusts orderId alone - always re-checked against the resolved store. */
    private async getOwnedOrThrow(storeId: string, orderId: string): Promise<Order> {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, store_id: storeId },
            include: ORDER_INCLUDE,
        });
        if (!order) {
            throw new NotFoundException('Order not found.');
        }
        return order;
    }
}
