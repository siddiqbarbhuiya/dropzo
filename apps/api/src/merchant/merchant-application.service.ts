import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import type { Merchant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import type { SubmitMerchantApplicationDto } from './dto/submit-merchant-application.dto.js';
import type { UpdateMerchantApplicationDto } from './dto/update-merchant-application.dto.js';
import type { ListMerchantApplicationsDto } from './dto/list-merchant-applications.dto.js';
import type { PaginatedResult } from './dto/pagination.dto.js';

type EditableDto = Partial<{
    legalName: string;
    displayName: string;
    businessType: string;
    contactPersonName: string;
    contactPhone: string;
    businessEmail: string;
    businessAddress: string;
    city: string;
    district: string;
    state: string;
    postalCode: string;
    businessDescription: string;
}>;

function toColumns(dto: EditableDto) {
    return {
        legal_name: dto.legalName,
        display_name: dto.displayName,
        business_type: dto.businessType,
        contact_person_name: dto.contactPersonName,
        contact_phone: dto.contactPhone,
        business_email: dto.businessEmail,
        business_address: dto.businessAddress,
        city: dto.city,
        district: dto.district,
        state: dto.state,
        postal_code: dto.postalCode,
        business_description: dto.businessDescription,
    };
}

/**
 * The merchant application lifecycle: DRAFT (reserved for a future save-as-draft flow - not
 * produced by this API yet) -> PENDING -> APPROVED | REJECTED; APPROVED -> SUSPENDED -> APPROVED
 * (reinstated); REJECTED -> PENDING (resubmission, same row - never a second merchant row for the
 * same user, enforced by merchants.owner_user_id's UNIQUE constraint). See
 * docs/04-design/MERCHANT-STORE-DESIGN.md.
 */
@Injectable()
export class MerchantApplicationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
    ) {}

    async submitApplication(userId: string, dto: SubmitMerchantApplicationDto): Promise<Merchant> {
        const existing = await this.prisma.merchant.findUnique({
            where: { owner_user_id: userId },
        });

        if (existing) {
            if (existing.verification_status !== 'REJECTED') {
                // PENDING/DRAFT: already has a live application in flight. APPROVED/SUSPENDED:
                // already has a merchant account - never a second one for the same user.
                throw new ConflictException(
                    `You already have a merchant application (status: ${existing.verification_status}).`,
                );
            }
            // Resubmission after rejection reuses the same row - a fresh review cycle, so the
            // previous decision is cleared, not accumulated.
            const resubmitted = await this.prisma.merchant.update({
                where: { id: existing.id },
                data: {
                    ...toColumns(dto),
                    verification_status: 'PENDING',
                    submitted_at: new Date(),
                    reviewed_at: null,
                    reviewed_by_user_id: null,
                    rejection_reason: null,
                },
            });
            await this.audit.record({
                actorUserId: userId,
                action: 'MERCHANT_APPLICATION_RESUBMITTED',
                entityType: 'merchant',
                entityId: resubmitted.id,
            });
            return resubmitted;
        }

        const created = await this.prisma.merchant.create({
            data: {
                owner_user_id: userId,
                ...toColumns(dto),
                legal_name: dto.legalName,
                display_name: dto.displayName,
                contact_phone: dto.contactPhone,
                business_address: dto.businessAddress,
                verification_status: 'PENDING',
                submitted_at: new Date(),
            },
        });
        await this.audit.record({
            actorUserId: userId,
            action: 'MERCHANT_APPLICATION_SUBMITTED',
            entityType: 'merchant',
            entityId: created.id,
        });
        return created;
    }

    async getOwnApplication(userId: string): Promise<Merchant> {
        return this.getByOwnerOrThrow(userId);
    }

    async updateOwnApplication(
        userId: string,
        dto: UpdateMerchantApplicationDto,
    ): Promise<Merchant> {
        const merchant = await this.getByOwnerOrThrow(userId);
        const updated = await this.prisma.merchant.update({
            where: { id: merchant.id },
            data: toColumns(dto),
        });
        await this.audit.record({
            actorUserId: userId,
            action: 'MERCHANT_APPLICATION_UPDATED',
            entityType: 'merchant',
            entityId: merchant.id,
        });
        return updated;
    }

    async getDashboardSummary(userId: string) {
        const merchant = await this.getByOwnerOrThrow(userId);
        const storeCounts = await this.prisma.store.groupBy({
            by: ['status'],
            where: { merchant_id: merchant.id },
            _count: { _all: true },
        });
        return {
            merchantId: merchant.id,
            verificationStatus: merchant.verification_status,
            displayName: merchant.display_name,
            storeCounts: Object.fromEntries(
                storeCounts.map((row) => [row.status, row._count._all]),
            ),
            totalStores: storeCounts.reduce((sum, row) => sum + row._count._all, 0),
        };
    }

    /** Throws if the user has no merchant row, and never trusts a client-supplied merchant id. */
    async requireApprovedMerchantForOwner(userId: string): Promise<Merchant> {
        const merchant = await this.getByOwnerOrThrow(userId);
        if (merchant.verification_status === 'SUSPENDED') {
            throw new ForbiddenException('Your merchant account is suspended.');
        }
        if (merchant.verification_status !== 'APPROVED') {
            throw new ForbiddenException('Your merchant application has not been approved yet.');
        }
        return merchant;
    }

    async getMerchantForOwner(userId: string): Promise<Merchant> {
        return this.getByOwnerOrThrow(userId);
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    async listApplications(query: ListMerchantApplicationsDto): Promise<PaginatedResult<Merchant>> {
        const where = query.status ? { verification_status: query.status } : {};
        const [data, total] = await Promise.all([
            this.prisma.merchant.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: (query.page - 1) * query.limit,
                take: query.limit,
            }),
            this.prisma.merchant.count({ where }),
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

    async getApplicationById(id: string): Promise<Merchant> {
        const merchant = await this.prisma.merchant.findUnique({ where: { id } });
        if (!merchant) {
            throw new NotFoundException('Merchant application not found.');
        }
        return merchant;
    }

    /**
     * Approve/reject/suspend/reinstate all use the same compare-and-swap shape: an `updateMany`
     * scoped to both the row id and its expected current status. `count === 0` means either the
     * row doesn't exist or (far more likely under concurrency) another admin's decision already
     * landed first - so two admins racing to approve and reject the same application can never
     * both succeed; the loser gets a clear 409, never a silently-overwritten decision.
     */
    private async transition(
        id: string,
        fromStatuses: string[],
        data: Record<string, unknown>,
    ): Promise<Merchant> {
        const result = await this.prisma.merchant.updateMany({
            where: { id, verification_status: { in: fromStatuses } },
            data,
        });
        if (result.count === 0) {
            const current = await this.prisma.merchant.findUnique({ where: { id } });
            if (!current) {
                throw new NotFoundException('Merchant application not found.');
            }
            throw new ConflictException(
                `Cannot apply this change: application is currently ${current.verification_status}.`,
            );
        }
        return this.prisma.merchant.findUniqueOrThrow({ where: { id } });
    }

    async approve(id: string, adminUserId: string): Promise<Merchant> {
        const merchant = await this.transition(id, ['PENDING'], {
            verification_status: 'APPROVED',
            reviewed_at: new Date(),
            reviewed_by_user_id: adminUserId,
            rejection_reason: null,
        });
        // See docs/04-design/AUTHENTICATION-DESIGN.md / SECURITY-STANDARDS.md: every protected
        // endpoint checks both role and resource ownership, so a merchant needs MERCHANT_OWNER to
        // reach merchant-facing store routes at all, not only the ownership check itself.
        await this.prisma.userRole.upsert({
            where: { user_id_role: { user_id: merchant.owner_user_id, role: 'MERCHANT_OWNER' } },
            update: {},
            create: { user_id: merchant.owner_user_id, role: 'MERCHANT_OWNER' },
        });
        await this.audit.record({
            actorUserId: adminUserId,
            action: 'MERCHANT_APPLICATION_APPROVED',
            entityType: 'merchant',
            entityId: merchant.id,
        });
        return merchant;
    }

    async reject(id: string, adminUserId: string, reason: string): Promise<Merchant> {
        const merchant = await this.transition(id, ['PENDING'], {
            verification_status: 'REJECTED',
            reviewed_at: new Date(),
            reviewed_by_user_id: adminUserId,
            rejection_reason: reason,
        });
        await this.audit.record({
            actorUserId: adminUserId,
            action: 'MERCHANT_APPLICATION_REJECTED',
            entityType: 'merchant',
            entityId: merchant.id,
            afterState: { reason },
        });
        return merchant;
    }

    async suspend(id: string, adminUserId: string, reason: string): Promise<Merchant> {
        const merchant = await this.transition(id, ['APPROVED'], {
            verification_status: 'SUSPENDED',
            reviewed_at: new Date(),
            reviewed_by_user_id: adminUserId,
            rejection_reason: reason,
        });
        await this.audit.record({
            actorUserId: adminUserId,
            action: 'MERCHANT_SUSPENDED',
            entityType: 'merchant',
            entityId: merchant.id,
            afterState: { reason },
        });
        return merchant;
    }

    async reinstate(id: string, adminUserId: string): Promise<Merchant> {
        const merchant = await this.transition(id, ['SUSPENDED'], {
            verification_status: 'APPROVED',
            reviewed_at: new Date(),
            reviewed_by_user_id: adminUserId,
            rejection_reason: null,
        });
        await this.audit.record({
            actorUserId: adminUserId,
            action: 'MERCHANT_REINSTATED',
            entityType: 'merchant',
            entityId: merchant.id,
        });
        return merchant;
    }

    private async getByOwnerOrThrow(userId: string): Promise<Merchant> {
        const merchant = await this.prisma.merchant.findUnique({
            where: { owner_user_id: userId },
        });
        if (!merchant) {
            throw new NotFoundException('No merchant application found for this account.');
        }
        return merchant;
    }
}
