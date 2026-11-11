import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import type { DeliveryAssignment, Order, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { OutboxService } from '../common/outbox/outbox.service.js';
import type { PaginatedResult } from '../merchant/dto/pagination.dto.js';
import type { ListEligibleOrdersDto } from './dto/list-eligible-orders.dto.js';
import type { AssignDeliveryDto } from './dto/assign-delivery.dto.js';

const ASSIGNMENT_INCLUDE = {
    order: true,
    delivery_partner: { include: { user: { select: { id: true, full_name: true, phone: true } } } },
    events: { orderBy: { created_at: 'asc' as const } },
};

/**
 * Admin-controlled manual delivery assignment (ADR-0010, FR-DEL-001). One `DeliveryAssignment` row
 * per order (the schema's `UNIQUE(order_id)` is never relaxed) - reassignment after a rejection,
 * failure, or admin cancellation reuses that same row rather than creating a new one; full history
 * is preserved via `delivery_events`, not via multiple assignment rows. See
 * `docs/04-design/DELIVERY-MANAGEMENT-DESIGN.md`.
 *
 * A partner can have at most one *active* (non-terminal) assignment at a time - DB-enforced by the
 * partial unique index `uq_delivery_assignments_partner_active`, not just application logic. Two
 * admins racing to assign the same order can't both succeed: the order-status compare-and-swap
 * (`READY`/`DELIVERY_FAILED` -> `ASSIGNED`) is the authoritative guard, exactly like BC-009's
 * double-accept protection.
 */
@Injectable()
export class DeliveryAssignmentService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly outbox: OutboxService,
    ) {}

    /** HOME_DELIVERY orders currently `READY` (never assigned, or returned to the queue after a
     * rejection/cancellation) or `DELIVERY_FAILED` (awaiting reassignment). A pickup order's
     * `fulfilment_type` is never `DELIVERY`, so it can never appear here. */
    async listEligibleOrders(query: ListEligibleOrdersDto): Promise<PaginatedResult<Order>> {
        const where: Prisma.OrderWhereInput = {
            fulfilment_type: 'DELIVERY',
            status: { in: ['READY', 'DELIVERY_FAILED'] },
        };
        const [data, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                orderBy: { placed_at: 'asc' },
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

    async findAssignmentOrNull(orderId: string): Promise<DeliveryAssignment | null> {
        return this.prisma.deliveryAssignment.findUnique({
            where: { order_id: orderId },
            include: ASSIGNMENT_INCLUDE,
        });
    }

    /** Merchant-facing read, scoped to the caller's own store - never trusts `orderId` alone.
     * Resolves ownership the same way `DeliveryWorkflowService.confirmMerchantHandover` does
     * (order belongs to `storeId`, store's merchant is owned by `userId`) before ever touching
     * the assignment, so a guessed/known order id for another merchant's order can never leak
     * that merchant's delivery-partner assignment. */
    async getOwnedByMerchant(
        userId: string,
        storeId: string,
        orderId: string,
    ): Promise<DeliveryAssignment> {
        const order = await this.prisma.order.findFirst({ where: { id: orderId, store_id: storeId } });
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
        return this.getAssignment(orderId);
    }

    async getAssignment(orderId: string): Promise<DeliveryAssignment> {
        const assignment = await this.prisma.deliveryAssignment.findUnique({
            where: { order_id: orderId },
            include: ASSIGNMENT_INCLUDE,
        });
        if (!assignment) {
            throw new NotFoundException('No delivery assignment exists for this order.');
        }
        return assignment;
    }

    async assign(
        adminId: string,
        orderId: string,
        dto: AssignDeliveryDto,
    ): Promise<DeliveryAssignment> {
        const order = await this.getDeliveryOrderOrThrow(orderId);
        if (order.status !== 'READY' && order.status !== 'DELIVERY_FAILED') {
            throw new ConflictException(
                `Cannot assign a delivery partner while the order is ${order.status}.`,
            );
        }
        const partner = await this.prisma.deliveryPartner.findUnique({
            where: { id: dto.deliveryPartnerId },
        });
        if (!partner) {
            throw new NotFoundException('Delivery partner not found.');
        }
        if (!partner.is_approved) {
            throw new ForbiddenException('This delivery partner is not active.');
        }

        try {
            return await this.prisma.$transaction(async (tx) => {
                const result = await tx.order.updateMany({
                    where: { id: order.id, status: order.status },
                    data: { status: 'ASSIGNED' },
                });
                if (result.count === 0) {
                    throw new ConflictException(
                        "This order's status has already changed - reload and retry.",
                    );
                }

                const existing = await tx.deliveryAssignment.findUnique({
                    where: { order_id: order.id },
                });
                const isReassignment = !!existing;
                if (
                    existing &&
                    !['REJECTED', 'FAILED', 'CANCELLED'].includes(existing.delivery_status)
                ) {
                    throw new ConflictException(
                        'This order already has an active delivery assignment.',
                    );
                }

                const assignment = existing
                    ? await tx.deliveryAssignment.update({
                          where: { id: existing.id },
                          data: {
                              delivery_partner_id: dto.deliveryPartnerId,
                              delivery_status: 'ASSIGNED',
                              assigned_at: new Date(),
                              accepted_at: null,
                              rejected_at: null,
                              rejected_reason: null,
                              picked_up_at: null,
                              picked_up_confirmed_by_merchant_at: null,
                              out_for_delivery_at: null,
                              delivered_at: null,
                              failed_at: null,
                              failed_reason: null,
                              cancelled_at: null,
                          },
                          include: ASSIGNMENT_INCLUDE,
                      })
                    : await tx.deliveryAssignment.create({
                          data: {
                              order_id: order.id,
                              delivery_partner_id: dto.deliveryPartnerId,
                              cod_amount_due: order.total_amount,
                          },
                          include: ASSIGNMENT_INCLUDE,
                      });

                await tx.deliveryEvent.create({
                    data: {
                        delivery_assignment_id: assignment.id,
                        event_type: isReassignment ? 'REASSIGNED' : 'ASSIGNED',
                        notes: isReassignment
                            ? `Reassigned (previously ${existing!.delivery_partner_id}) to ${dto.deliveryPartnerId} by admin.`
                            : `Assigned to ${dto.deliveryPartnerId} by admin.`,
                    },
                });
                await tx.orderStatusHistory.create({
                    data: {
                        order_id: order.id,
                        old_status: order.status,
                        new_status: 'ASSIGNED',
                        changed_by: adminId,
                    },
                });
                await this.audit.record({
                    actorUserId: adminId,
                    action: isReassignment ? 'DELIVERY_REASSIGNED' : 'DELIVERY_ASSIGNED',
                    entityType: 'order',
                    entityId: order.id,
                    afterState: { deliveryPartnerId: dto.deliveryPartnerId },
                });
                await this.outbox.record(tx, {
                    aggregateType: 'order',
                    aggregateId: order.id,
                    eventType: 'DELIVERY_ASSIGNED',
                    payload: { orderId: order.id, deliveryPartnerId: dto.deliveryPartnerId },
                });

                return assignment;
            });
        } catch (error) {
            if (isUniqueConstraintError(error)) {
                throw new ConflictException(
                    'This delivery partner already has an active assignment.',
                );
            }
            throw error;
        }
    }

    async cancel(adminId: string, orderId: string, reason: string): Promise<DeliveryAssignment> {
        const order = await this.getDeliveryOrderOrThrow(orderId);
        const assignment = await this.getAssignment(orderId);
        if (!['ASSIGNED', 'ACCEPTED'].includes(assignment.delivery_status)) {
            throw new ConflictException(
                'Only an assignment that has not yet been collected can be cancelled.',
            );
        }

        return this.prisma.$transaction(async (tx) => {
            const result = await tx.order.updateMany({
                where: { id: order.id, status: 'ASSIGNED' },
                data: { status: 'READY' },
            });
            if (result.count === 0) {
                throw new ConflictException(
                    "This order's status has already changed - reload and retry.",
                );
            }
            const updated = await tx.deliveryAssignment.update({
                where: { id: assignment.id },
                data: { delivery_status: 'CANCELLED', cancelled_at: new Date() },
                include: ASSIGNMENT_INCLUDE,
            });
            await tx.deliveryEvent.create({
                data: {
                    delivery_assignment_id: assignment.id,
                    event_type: 'CANCELLED',
                    notes: reason,
                },
            });
            await tx.orderStatusHistory.create({
                data: {
                    order_id: order.id,
                    old_status: 'ASSIGNED',
                    new_status: 'READY',
                    changed_by: adminId,
                    reason,
                },
            });
            await this.audit.record({
                actorUserId: adminId,
                action: 'DELIVERY_ASSIGNMENT_CANCELLED',
                entityType: 'order',
                entityId: order.id,
                afterState: { reason },
            });
            await this.outbox.record(tx, {
                aggregateType: 'order',
                aggregateId: order.id,
                eventType: 'DELIVERY_ASSIGNMENT_CANCELLED',
                payload: { orderId: order.id, reason },
            });
            return updated;
        });
    }

    private async getDeliveryOrderOrThrow(orderId: string): Promise<Order> {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
            throw new NotFoundException('Order not found.');
        }
        if (order.fulfilment_type !== 'DELIVERY') {
            throw new ConflictException('This order is not a home-delivery order.');
        }
        return order;
    }
}

function isUniqueConstraintError(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
    );
}
