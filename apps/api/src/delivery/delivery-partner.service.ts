import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { DeliveryPartner } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import type { PaginatedResult } from '../merchant/dto/pagination.dto.js';
import type { CreateDeliveryPartnerDto } from './dto/create-delivery-partner.dto.js';
import type { ListDeliveryPartnersDto } from './dto/list-delivery-partners.dto.js';
import type { SetAvailabilityDto } from './dto/set-availability.dto.js';

const PARTNER_INCLUDE = {
    user: { select: { id: true, full_name: true, phone: true } },
};

/**
 * Delivery-partner onboarding and profile management. Deliberately minimal per the brief ("no
 * complicated KYC workflow", "no document uploads"): a partner is an existing user (registered via
 * the ordinary OTP login like any other user) that an admin grants the `DELIVERY_PARTNER` role and
 * a `delivery_partners` profile row to, in one step. `is_approved` is reused as the single
 * admin-controlled active/inactive flag - create and activate/deactivate are the same toggle,
 * avoiding a redundant `is_active` column (see `docs/04-design/DELIVERY-PARTNER-DESIGN.md`).
 * `is_available` is the partner's own, separate "I'm online" toggle.
 */
@Injectable()
export class DeliveryPartnerService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
    ) {}

    // -----------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------

    async adminCreate(
        adminId: string,
        dto: CreateDeliveryPartnerDto,
    ): Promise<
        DeliveryPartner & { user: { id: string; full_name: string | null; phone: string } }
    > {
        const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
        if (!user) {
            throw new NotFoundException('User not found.');
        }
        const existing = await this.prisma.deliveryPartner.findUnique({
            where: { user_id: dto.userId },
        });
        if (existing) {
            throw new ConflictException('This user is already a delivery partner.');
        }

        const partner = await this.prisma.$transaction(async (tx) => {
            await tx.userRole.upsert({
                where: { user_id_role: { user_id: dto.userId, role: 'DELIVERY_PARTNER' } },
                update: {},
                create: { user_id: dto.userId, role: 'DELIVERY_PARTNER' },
            });
            return tx.deliveryPartner.create({
                data: {
                    user_id: dto.userId,
                    vehicle_type: dto.vehicleType,
                    is_approved: true,
                },
                include: PARTNER_INCLUDE,
            });
        });

        await this.audit.record({
            actorUserId: adminId,
            action: 'DELIVERY_PARTNER_CREATED',
            entityType: 'delivery_partner',
            entityId: partner.id,
        });
        return partner;
    }

    async adminList(query: ListDeliveryPartnersDto): Promise<PaginatedResult<DeliveryPartner>> {
        const where = query.isActive === undefined ? {} : { is_approved: query.isActive };
        const [data, total] = await Promise.all([
            this.prisma.deliveryPartner.findMany({
                where,
                include: PARTNER_INCLUDE,
                orderBy: { created_at: 'desc' },
                skip: (query.page - 1) * query.limit,
                take: query.limit,
            }),
            this.prisma.deliveryPartner.count({ where }),
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

    async adminGetOne(id: string): Promise<DeliveryPartner> {
        const partner = await this.prisma.deliveryPartner.findUnique({
            where: { id },
            include: {
                ...PARTNER_INCLUDE,
                assignments: {
                    where: {
                        delivery_status: {
                            in: ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'],
                        },
                    },
                },
            },
        });
        if (!partner) {
            throw new NotFoundException('Delivery partner not found.');
        }
        return partner;
    }

    async adminSetActive(adminId: string, id: string, isActive: boolean): Promise<DeliveryPartner> {
        const partner = await this.prisma.deliveryPartner.findUnique({ where: { id } });
        if (!partner) {
            throw new NotFoundException('Delivery partner not found.');
        }
        const updated = await this.prisma.deliveryPartner.update({
            where: { id },
            data: { is_approved: isActive },
            include: PARTNER_INCLUDE,
        });
        await this.audit.record({
            actorUserId: adminId,
            action: isActive ? 'DELIVERY_PARTNER_ACTIVATED' : 'DELIVERY_PARTNER_DEACTIVATED',
            entityType: 'delivery_partner',
            entityId: id,
        });
        return updated;
    }

    // -----------------------------------------------------------------
    // Partner's own profile
    // -----------------------------------------------------------------

    /** Resolves the authenticated user's own `delivery_partners` row. Shared by the assignment and
     * COD services so every partner-facing operation uses the same ownership resolution. */
    async getOwnPartnerOrThrow(userId: string): Promise<DeliveryPartner> {
        const partner = await this.prisma.deliveryPartner.findUnique({
            where: { user_id: userId },
        });
        if (!partner) {
            throw new NotFoundException('You are not registered as a delivery partner.');
        }
        return partner;
    }

    async getOwnProfile(userId: string): Promise<DeliveryPartner> {
        const partner = await this.prisma.deliveryPartner.findUnique({
            where: { user_id: userId },
            include: PARTNER_INCLUDE,
        });
        if (!partner) {
            throw new NotFoundException('You are not registered as a delivery partner.');
        }
        return partner;
    }

    async setAvailability(userId: string, dto: SetAvailabilityDto): Promise<DeliveryPartner> {
        const partner = await this.getOwnPartnerOrThrow(userId);
        if (!partner.is_approved) {
            throw new ConflictException('Your delivery partner account is not active.');
        }
        return this.prisma.deliveryPartner.update({
            where: { id: partner.id },
            data: { is_available: dto.isAvailable },
        });
    }
}
