import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import type { DeliveryAssignment, Merchant, Order, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { OutboxService } from '../common/outbox/outbox.service.js';
import { LedgerService } from '../common/ledger/ledger.service.js';
import { ReservationService } from '../inventory/reservation.service.js';
import { DeliveryPartnerService } from './delivery-partner.service.js';
import { DeliveryVerificationService } from './delivery-verification.service.js';
import type { ReasonDto } from './dto/reason.dto.js';
import type { VerifyDeliveryCodeDto } from './dto/verify-delivery-code.dto.js';

type Tx = Prisma.TransactionClient;

const ASSIGNMENT_INCLUDE = {
    order: true,
    events: { orderBy: { created_at: 'asc' as const } },
};

/**
 * The delivery partner's own workflow: accept/reject an assignment, confirm merchant collection,
 * mark out for delivery, verify customer delivery (which atomically completes the order and posts
 * the delivery-COD ledger entries), or report a failure. Every transition is the same
 * compare-and-swap pattern `MerchantOrdersService` established for the pickup flow - scoped to
 * `assertOwnAssignment` first, so a partner can only ever act on their own assignment (never
 * another partner's order id, even if guessed).
 */
@Injectable()
export class DeliveryWorkflowService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly outbox: OutboxService,
        private readonly ledger: LedgerService,
        private readonly reservations: ReservationService,
        private readonly partners: DeliveryPartnerService,
        private readonly verification: DeliveryVerificationService,
    ) {}

    async getOwnAssignment(userId: string, orderId: string): Promise<DeliveryAssignment> {
        return this.assertOwnAssignment(userId, orderId);
    }

    async getOwnCurrentAssignment(userId: string): Promise<DeliveryAssignment | null> {
        const partner = await this.partners.getOwnPartnerOrThrow(userId);
        return this.prisma.deliveryAssignment.findFirst({
            where: {
                delivery_partner_id: partner.id,
                delivery_status: { in: ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
            },
            include: ASSIGNMENT_INCLUDE,
        });
    }

    async accept(userId: string, orderId: string): Promise<DeliveryAssignment> {
        const assignment = await this.assertOwnAssignment(userId, orderId);
        if (assignment.delivery_status !== 'ASSIGNED') {
            throw new ConflictException('This assignment is no longer awaiting a response.');
        }
        return this.prisma.$transaction(async (tx) => {
            const updated = await this.transitionAssignment(
                tx,
                assignment,
                'ASSIGNED',
                'ACCEPTED',
                { accepted_at: new Date() },
            );
            await this.recordEvent(tx, assignment.id, 'ACCEPTED');
            await this.audit.record({
                actorUserId: userId,
                action: 'DELIVERY_ACCEPTED',
                entityType: 'delivery_assignment',
                entityId: assignment.id,
            });
            await this.outbox.record(tx, {
                aggregateType: 'delivery_assignment',
                aggregateId: assignment.id,
                eventType: 'DELIVERY_ACCEPTED',
                payload: { orderId },
            });
            return updated;
        });
    }

    async reject(userId: string, orderId: string, dto: ReasonDto): Promise<DeliveryAssignment> {
        const assignment = await this.assertOwnAssignment(userId, orderId);
        if (assignment.delivery_status !== 'ASSIGNED') {
            throw new ConflictException('This assignment is no longer awaiting a response.');
        }
        return this.prisma.$transaction(async (tx) => {
            const updated = await this.transitionAssignment(
                tx,
                assignment,
                'ASSIGNED',
                'REJECTED',
                {
                    rejected_at: new Date(),
                    rejected_reason: dto.reason,
                },
            );
            const orderUpdate = await tx.order.updateMany({
                where: { id: orderId, status: 'ASSIGNED' },
                data: { status: 'READY' },
            });
            if (orderUpdate.count === 0) {
                throw new ConflictException("This order's status has already changed.");
            }
            await tx.orderStatusHistory.create({
                data: {
                    order_id: orderId,
                    old_status: 'ASSIGNED',
                    new_status: 'READY',
                    changed_by: userId,
                    reason: dto.reason,
                },
            });
            await this.recordEvent(tx, assignment.id, 'REJECTED', dto.reason);
            await this.audit.record({
                actorUserId: userId,
                action: 'DELIVERY_REJECTED',
                entityType: 'delivery_assignment',
                entityId: assignment.id,
                afterState: { reason: dto.reason },
            });
            await this.outbox.record(tx, {
                aggregateType: 'delivery_assignment',
                aggregateId: assignment.id,
                eventType: 'DELIVERY_REJECTED',
                payload: { orderId, reason: dto.reason },
            });
            return updated;
        });
    }

    async markCollected(userId: string, orderId: string): Promise<DeliveryAssignment> {
        const assignment = await this.assertOwnAssignment(userId, orderId);
        if (assignment.delivery_status !== 'ACCEPTED') {
            throw new ConflictException(
                'You must accept this assignment before collecting the order.',
            );
        }
        return this.prisma.$transaction(async (tx) => {
            const updated = await this.transitionAssignment(
                tx,
                assignment,
                'ACCEPTED',
                'PICKED_UP',
                {
                    picked_up_at: new Date(),
                },
            );
            await this.transitionOrder(tx, orderId, 'ASSIGNED', 'PICKED_UP', userId);
            await this.recordEvent(tx, assignment.id, 'PICKED_UP');
            await this.audit.record({
                actorUserId: userId,
                action: 'DELIVERY_PICKED_UP',
                entityType: 'delivery_assignment',
                entityId: assignment.id,
            });
            await this.outbox.record(tx, {
                aggregateType: 'delivery_assignment',
                aggregateId: assignment.id,
                eventType: 'DELIVERY_PICKED_UP',
                payload: { orderId },
            });
            return updated;
        });
    }

    async markOutForDelivery(userId: string, orderId: string): Promise<DeliveryAssignment> {
        const assignment = await this.assertOwnAssignment(userId, orderId);
        if (assignment.delivery_status !== 'PICKED_UP') {
            throw new ConflictException('This order has not been collected from the store yet.');
        }
        return this.prisma.$transaction(async (tx) => {
            const updated = await this.transitionAssignment(
                tx,
                assignment,
                'PICKED_UP',
                'OUT_FOR_DELIVERY',
                { out_for_delivery_at: new Date() },
            );
            await this.transitionOrder(tx, orderId, 'PICKED_UP', 'OUT_FOR_DELIVERY', userId);
            // The plaintext is used only for the outbox payload here - never returned from any
            // partner-facing API response. See DeliveryVerificationService's class doc.
            const code = await this.verification.generateForAssignment(tx, assignment.id);
            await this.recordEvent(tx, assignment.id, 'OUT_FOR_DELIVERY');
            await this.audit.record({
                actorUserId: userId,
                action: 'DELIVERY_OUT_FOR_DELIVERY',
                entityType: 'delivery_assignment',
                entityId: assignment.id,
            });
            await this.outbox.record(tx, {
                aggregateType: 'delivery_assignment',
                aggregateId: assignment.id,
                eventType: 'DELIVERY_OUT_FOR_DELIVERY',
                payload: { orderId, deliveryCode: code },
            });
            return updated;
        });
    }

    /**
     * The one operation that completes a home-delivery order - never reachable by setting
     * `status` directly, only ever as the result of a successful delivery-code verification in
     * this same transaction. Verification, reservation consumption, COD payment capture, the
     * delivery-fee ledger posting, status history, audit, and the outbox event all happen
     * atomically, mirroring `MerchantOrdersService.completePickup` exactly.
     */
    async completeDelivery(
        userId: string,
        orderId: string,
        dto: VerifyDeliveryCodeDto,
    ): Promise<{ verified: boolean; order?: Order; attemptsRemaining?: number }> {
        const assignment = await this.assertOwnAssignment(userId, orderId);
        if (assignment.delivery_status !== 'OUT_FOR_DELIVERY') {
            throw new ConflictException('This order is not out for delivery.');
        }

        return this.prisma.$transaction(async (tx) => {
            const outcome = await this.verification.verify(tx, assignment.id, dto.code);
            if (outcome.outcome !== 'verified') {
                if (outcome.outcome === 'invalid') {
                    return { verified: false, attemptsRemaining: outcome.attemptsRemaining };
                }
                throw new ConflictException(
                    outcome.outcome === 'expired'
                        ? 'This delivery code has expired.'
                        : outcome.outcome === 'locked'
                          ? 'Too many incorrect attempts. This code can no longer be used.'
                          : 'No delivery code exists for this order.',
                );
            }

            const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });

            // Two real transitions, as the design records both - a delivery completion is not a
            // single step: the handover to the customer (`DELIVERED`) and the order's own
            // financial/operational closure (`COMPLETED`) happen in the same transaction but are
            // each worth their own history row.
            await this.casOrder(tx, orderId, 'OUT_FOR_DELIVERY', 'DELIVERED', userId);
            await this.casOrder(
                tx,
                orderId,
                'DELIVERED',
                'COMPLETED',
                userId,
                'Delivery verified.',
            );
            await tx.order.update({ where: { id: orderId }, data: { completed_at: new Date() } });

            await tx.deliveryAssignment.update({
                where: { id: assignment.id },
                data: {
                    delivery_status: 'DELIVERED',
                    delivered_at: new Date(),
                    cod_collected_amount: order.total_amount,
                    cod_collected_at: new Date(),
                },
            });

            await this.reservations.consumeReservationForOrder(tx, orderId, userId);

            const payment = await tx.payment.findFirst({ where: { order_id: orderId } });
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
                        source: 'DELIVERY_PARTNER',
                        reason: 'COD collected at delivery.',
                    },
                });
            }

            const merchant = await this.getMerchantForOrder(tx, order);
            await this.ledger.postDeliveryCodCollection(tx, order, merchant);

            await this.recordEvent(tx, assignment.id, 'DELIVERED');
            await this.audit.record({
                actorUserId: userId,
                action: 'DELIVERY_COMPLETED',
                entityType: 'order',
                entityId: orderId,
            });
            await this.outbox.record(tx, {
                aggregateType: 'order',
                aggregateId: orderId,
                eventType: 'DELIVERY_COMPLETED',
                payload: { orderId, orderNumber: order.order_number },
            });

            const reloaded = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
            return { verified: true, order: reloaded };
        });
    }

    async reportFailure(
        userId: string,
        orderId: string,
        dto: ReasonDto,
    ): Promise<DeliveryAssignment> {
        const assignment = await this.assertOwnAssignment(userId, orderId);
        if (assignment.delivery_status !== 'OUT_FOR_DELIVERY') {
            throw new ConflictException('A failure can only be reported while out for delivery.');
        }
        return this.prisma.$transaction(async (tx) => {
            const updated = await this.transitionAssignment(
                tx,
                assignment,
                'OUT_FOR_DELIVERY',
                'FAILED',
                {
                    failed_at: new Date(),
                    failed_reason: dto.reason,
                },
            );
            await this.transitionOrder(
                tx,
                orderId,
                'OUT_FOR_DELIVERY',
                'DELIVERY_FAILED',
                userId,
                dto.reason,
            );
            await this.recordEvent(tx, assignment.id, 'FAILED', dto.reason);
            await this.audit.record({
                actorUserId: userId,
                action: 'DELIVERY_FAILED',
                entityType: 'delivery_assignment',
                entityId: assignment.id,
                afterState: { reason: dto.reason },
            });
            await this.outbox.record(tx, {
                aggregateType: 'delivery_assignment',
                aggregateId: assignment.id,
                eventType: 'DELIVERY_FAILED',
                payload: { orderId, reason: dto.reason },
            });
            return updated;
        });
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------

    /** Never trusts orderId alone - always re-scoped to the authenticated partner's own row, so a
     * guessed order id for another partner's assignment is a clean 404, never a 403 (which would
     * confirm the order exists and is someone else's). */
    private async assertOwnAssignment(
        userId: string,
        orderId: string,
    ): Promise<DeliveryAssignment> {
        const partner = await this.partners.getOwnPartnerOrThrow(userId);
        const assignment = await this.prisma.deliveryAssignment.findFirst({
            where: { order_id: orderId, delivery_partner_id: partner.id },
            include: ASSIGNMENT_INCLUDE,
        });
        if (!assignment) {
            throw new NotFoundException('No delivery assignment found for this order.');
        }
        return assignment;
    }

    private async transitionAssignment(
        tx: Tx,
        assignment: DeliveryAssignment,
        fromStatus: string,
        toStatus: string,
        data: Record<string, unknown>,
    ): Promise<DeliveryAssignment> {
        const result = await tx.deliveryAssignment.updateMany({
            where: { id: assignment.id, delivery_status: fromStatus },
            data: { delivery_status: toStatus, ...data },
        });
        if (result.count === 0) {
            throw new ConflictException("This assignment's status has already changed.");
        }
        return tx.deliveryAssignment.findUniqueOrThrow({
            where: { id: assignment.id },
            include: ASSIGNMENT_INCLUDE,
        });
    }

    private async transitionOrder(
        tx: Tx,
        orderId: string,
        fromStatus: string,
        toStatus: string,
        actorUserId: string,
        reason?: string,
    ): Promise<void> {
        await this.casOrder(tx, orderId, fromStatus, toStatus, actorUserId, reason);
    }

    private async casOrder(
        tx: Tx,
        orderId: string,
        fromStatus: string,
        toStatus: string,
        actorUserId: string,
        reason?: string,
    ): Promise<void> {
        const result = await tx.order.updateMany({
            where: { id: orderId, status: fromStatus as Order['status'] },
            data: { status: toStatus as Order['status'] },
        });
        if (result.count === 0) {
            throw new ConflictException("This order's status has already changed.");
        }
        await tx.orderStatusHistory.create({
            data: {
                order_id: orderId,
                old_status: fromStatus as Order['status'],
                new_status: toStatus as Order['status'],
                changed_by: actorUserId,
                reason,
            },
        });
    }

    private async recordEvent(
        tx: Tx,
        assignmentId: string,
        eventType: string,
        notes?: string,
    ): Promise<void> {
        await tx.deliveryEvent.create({
            data: { delivery_assignment_id: assignmentId, event_type: eventType, notes },
        });
    }

    private async getMerchantForOrder(tx: Tx, order: Order): Promise<Merchant> {
        const store = await tx.store.findUniqueOrThrow({ where: { id: order.store_id } });
        return tx.merchant.findUniqueOrThrow({ where: { id: store.merchant_id } });
    }

    /** Merchant-facing, informational only - never drives the order-status transition, so a
     * merchant can never falsely mark delivery progress. The partner's own `markCollected` action
     * is what's authoritative. */
    async confirmMerchantHandover(
        userId: string,
        storeId: string,
        orderId: string,
    ): Promise<DeliveryAssignment> {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, store_id: storeId },
        });
        if (!order) {
            throw new NotFoundException('Order not found.');
        }
        const store = await this.prisma.store.findUniqueOrThrow({ where: { id: storeId } });
        const merchant = await this.prisma.merchant.findUniqueOrThrow({
            where: { id: store.merchant_id },
        });
        if (merchant.owner_user_id !== userId) {
            throw new ForbiddenException('You do not own this store.');
        }
        const assignment = await this.prisma.deliveryAssignment.findUnique({
            where: { order_id: orderId },
        });
        if (!assignment) {
            throw new NotFoundException('No delivery assignment exists for this order.');
        }
        return this.prisma.deliveryAssignment.update({
            where: { id: assignment.id },
            data: { picked_up_confirmed_by_merchant_at: new Date() },
            include: ASSIGNMENT_INCLUDE,
        });
    }
}
