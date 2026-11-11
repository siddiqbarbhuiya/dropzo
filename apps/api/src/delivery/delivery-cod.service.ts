import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { DeliveryCodHandover } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { OutboxService } from '../common/outbox/outbox.service.js';
import { DeliveryPartnerService } from './delivery-partner.service.js';
import type { PaginatedResult } from '../merchant/dto/pagination.dto.js';
import type { RecordHandoverDto } from './dto/record-handover.dto.js';
import type { PaginationDto } from '../merchant/dto/pagination.dto.js';

/**
 * COD collection summary and cash-handover reconciliation (`docs/04-design/
 * COD-DELIVERY-RECONCILIATION-DESIGN.md`). A partner's cash-in-custody balance is always derived
 * from `delivery_assignments.cod_collected_amount WHERE handover_id IS NULL` - never a stored,
 * independently-editable counter, so it can never drift from the authoritative collection records.
 * A handover covers a chosen set of already-collected assignments in full; partial-amount handover
 * *within* one assignment is out of scope (an explicit, documented MVP limitation), but handing
 * over some-but-not-all outstanding assignments (a partial handover *across* assignments) is
 * supported.
 */
@Injectable()
export class DeliveryCodService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly outbox: OutboxService,
        private readonly partners: DeliveryPartnerService,
    ) {}

    async getOwnCodSummary(userId: string): Promise<{
        outstandingBalance: string;
        uncollectedAssignments: Array<{
            orderId: string;
            amount: string;
            collectedAt: Date | null;
        }>;
    }> {
        const partner = await this.partners.getOwnPartnerOrThrow(userId);
        return this.summaryForPartner(partner.id);
    }

    async adminGetSummary(partnerId: string): Promise<{
        outstandingBalance: string;
        uncollectedAssignments: Array<{
            orderId: string;
            amount: string;
            collectedAt: Date | null;
        }>;
    }> {
        return this.summaryForPartner(partnerId);
    }

    async adminListHandovers(
        partnerId: string | undefined,
        query: PaginationDto,
    ): Promise<PaginatedResult<DeliveryCodHandover>> {
        const where = partnerId ? { delivery_partner_id: partnerId } : {};
        const [data, total] = await Promise.all([
            this.prisma.deliveryCodHandover.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: (query.page - 1) * query.limit,
                take: query.limit,
            }),
            this.prisma.deliveryCodHandover.count({ where }),
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

    /**
     * Admin-only. Validates every requested order's assignment belongs to this partner, was
     * actually collected, and hasn't already been folded into an earlier handover - idempotent in
     * the sense that re-submitting the same set a second time finds nothing left to handover (all
     * rows already have a non-null `handover_id`) and fails cleanly rather than double-counting.
     */
    async recordHandover(
        adminId: string,
        partnerId: string,
        dto: RecordHandoverDto,
    ): Promise<DeliveryCodHandover> {
        const assignments = await this.prisma.deliveryAssignment.findMany({
            where: {
                delivery_partner_id: partnerId,
                order_id: { in: dto.orderIds },
            },
        });
        if (assignments.length !== dto.orderIds.length) {
            throw new BadRequestException(
                'One or more orders do not have a collection record for this partner.',
            );
        }
        const notCollected = assignments.filter((a) => a.cod_collected_amount === null);
        if (notCollected.length > 0) {
            throw new BadRequestException('One or more orders have not had COD collected yet.');
        }
        const alreadyHandedOver = assignments.filter((a) => a.handover_id !== null);
        if (alreadyHandedOver.length > 0) {
            throw new ConflictException(
                'One or more orders have already been included in a handover.',
            );
        }

        const totalAmount = assignments.reduce((sum, a) => sum + Number(a.cod_collected_amount), 0);

        return this.prisma.$transaction(async (tx) => {
            const handover = await tx.deliveryCodHandover.create({
                data: {
                    delivery_partner_id: partnerId,
                    amount: totalAmount,
                    recorded_by: adminId,
                    notes: dto.notes,
                },
            });
            const updated = await tx.deliveryAssignment.updateMany({
                where: { id: { in: assignments.map((a) => a.id) }, handover_id: null },
                data: { handover_id: handover.id },
            });
            if (updated.count !== assignments.length) {
                throw new ConflictException(
                    'One or more orders were included in another handover at the same time.',
                );
            }
            await this.audit.record({
                actorUserId: adminId,
                action: 'DELIVERY_COD_HANDOVER_RECORDED',
                entityType: 'delivery_cod_handover',
                entityId: handover.id,
                afterState: { partnerId, amount: totalAmount, orderIds: dto.orderIds },
            });
            await this.outbox.record(tx, {
                aggregateType: 'delivery_cod_handover',
                aggregateId: handover.id,
                eventType: 'DELIVERY_HANDOVER_RECORDED',
                payload: { partnerId, amount: totalAmount },
            });
            return handover;
        });
    }

    private async summaryForPartner(partnerId: string): Promise<{
        outstandingBalance: string;
        uncollectedAssignments: Array<{
            orderId: string;
            amount: string;
            collectedAt: Date | null;
        }>;
    }> {
        const outstanding = await this.prisma.deliveryAssignment.findMany({
            where: {
                delivery_partner_id: partnerId,
                handover_id: null,
                cod_collected_amount: { not: null },
            },
            orderBy: { cod_collected_at: 'asc' },
        });
        const outstandingBalance = outstanding
            .reduce((sum, a) => sum + Number(a.cod_collected_amount), 0)
            .toFixed(2);
        return {
            outstandingBalance,
            uncollectedAssignments: outstanding.map((a) => ({
                orderId: a.order_id,
                amount: a.cod_collected_amount!.toString(),
                collectedAt: a.cod_collected_at,
            })),
        };
    }
}
