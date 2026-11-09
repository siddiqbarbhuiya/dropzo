import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Store, StoreStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { MerchantApplicationService } from './merchant-application.service.js';
import type { CreateStoreDto } from './dto/create-store.dto.js';
import type { UpdateStoreDto } from './dto/update-store.dto.js';
import type { StoreOperatingHoursDto } from './dto/store-operating-hours.dto.js';
import { WEEKDAY_KEYS } from './dto/store-operating-hours.dto.js';
import type { PaginatedResult } from './dto/pagination.dto.js';
import type { PaginationDto } from './dto/pagination.dto.js';

// Self-service transitions a store's own merchant may make. Reopening (-> ACTIVE) additionally
// requires the merchant to currently be APPROVED (checked separately, not here) - "suspended
// merchants cannot... activate stores" per BC-006's scope. PENDING (admin approval) and SUSPENDED
// (admin enforcement) are never reachable through this table; see ADMIN_TRANSITIONS.
const MERCHANT_TRANSITIONS: Record<string, string[]> = {
    ACTIVE: ['PAUSED', 'CLOSED'],
    PAUSED: ['ACTIVE', 'CLOSED'],
};

// Admin transitions: PENDING -> ACTIVE (approve) or CLOSED (reject-equivalent - the store_status
// enum has no dedicated REJECTED value, and reusing CLOSED avoids adding one for a case BC-006
// doesn't otherwise need to distinguish from any other permanent closure); ACTIVE/PAUSED ->
// SUSPENDED (enforcement); SUSPENDED -> ACTIVE (reinstated); anything -> CLOSED.
const ADMIN_TRANSITIONS: Record<string, string[]> = {
    PENDING: ['ACTIVE', 'CLOSED'],
    ACTIVE: ['PAUSED', 'SUSPENDED', 'CLOSED'],
    PAUSED: ['ACTIVE', 'SUSPENDED', 'CLOSED'],
    SUSPENDED: ['ACTIVE', 'CLOSED'],
};

function validateHours(hours: StoreOperatingHoursDto): void {
    for (const day of WEEKDAY_KEYS) {
        const entry = hours[day];
        if (!entry) continue;
        if (entry.open >= entry.close) {
            throw new BadRequestException(`${day}: opening time must be before closing time.`);
        }
    }
}

@Injectable()
export class StoreService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly merchantApplications: MerchantApplicationService,
    ) {}

    async createStore(userId: string, dto: CreateStoreDto): Promise<Store> {
        const merchant = await this.merchantApplications.requireApprovedMerchantForOwner(userId);
        if (dto.openingHours) {
            validateHours(dto.openingHours);
        }

        const storeId = randomUUID();
        // location is Unsupported("geography(...)") in Prisma - PostGIS columns need a raw SQL
        // write, the same pattern the inventory-concurrency integration tests already use for
        // stores.
        await this.prisma.$executeRaw`
            INSERT INTO "stores" (
                id, merchant_id, name, description, contact_phone, email, address, locality,
                district, city, state, postal_code, location, timezone, service_zone_id,
                supports_pickup, supports_delivery, opening_hours, status
            ) VALUES (
                ${storeId}::uuid, ${merchant.id}::uuid, ${dto.name}, ${dto.description ?? null},
                ${dto.contactPhone ?? null}, ${dto.email ?? null}, ${dto.address},
                ${dto.locality ?? null}, ${dto.district}, ${dto.city},
                ${dto.state ?? 'Assam'}, ${dto.postalCode ?? null},
                ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)::geography,
                ${dto.timezone ?? 'Asia/Kolkata'}, ${dto.serviceZoneId ?? null},
                ${dto.supportsPickup ?? true}, ${dto.supportsDelivery ?? false},
                ${JSON.stringify(dto.openingHours ?? {})}::jsonb, 'PENDING'
            )
        `;

        const store = await this.prisma.store.findUniqueOrThrow({ where: { id: storeId } });
        await this.audit.record({
            actorUserId: userId,
            action: 'STORE_CREATED',
            entityType: 'store',
            entityId: store.id,
        });
        return store;
    }

    async listOwnStores(
        userId: string,
        pagination: PaginationDto,
    ): Promise<PaginatedResult<Store>> {
        const merchant = await this.merchantApplications.getMerchantForOwner(userId);
        return this.listByMerchant(merchant.id, pagination);
    }

    async getOwnStore(userId: string, storeId: string): Promise<Store> {
        const merchant = await this.merchantApplications.getMerchantForOwner(userId);
        return this.getOwnedOrThrow(merchant.id, storeId);
    }

    async updateStore(userId: string, storeId: string, dto: UpdateStoreDto): Promise<Store> {
        const merchant = await this.merchantApplications.getMerchantForOwner(userId);
        const store = await this.getOwnedOrThrow(merchant.id, storeId);

        const hasLatLng = dto.latitude !== undefined || dto.longitude !== undefined;
        if (hasLatLng && (dto.latitude === undefined || dto.longitude === undefined)) {
            throw new BadRequestException('latitude and longitude must be provided together.');
        }

        if (hasLatLng) {
            await this.prisma.$executeRaw`
                UPDATE "stores"
                SET location = ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)::geography
                WHERE id = ${storeId}::uuid
            `;
        }

        const updated = await this.prisma.store.update({
            where: { id: store.id },
            data: {
                name: dto.name,
                description: dto.description,
                contact_phone: dto.contactPhone,
                email: dto.email,
                address: dto.address,
                locality: dto.locality,
                district: dto.district,
                city: dto.city,
                state: dto.state,
                postal_code: dto.postalCode,
                timezone: dto.timezone,
                service_zone_id: dto.serviceZoneId,
            },
        });
        await this.audit.record({
            actorUserId: userId,
            action: 'STORE_UPDATED',
            entityType: 'store',
            entityId: store.id,
        });
        return updated;
    }

    async updateHours(
        userId: string,
        storeId: string,
        hours: StoreOperatingHoursDto,
    ): Promise<Store> {
        const merchant = await this.merchantApplications.getMerchantForOwner(userId);
        const store = await this.getOwnedOrThrow(merchant.id, storeId);
        validateHours(hours);

        const updated = await this.prisma.store.update({
            where: { id: store.id },
            data: { opening_hours: JSON.parse(JSON.stringify(hours)) },
        });
        await this.audit.record({
            actorUserId: userId,
            action: 'STORE_HOURS_UPDATED',
            entityType: 'store',
            entityId: store.id,
        });
        return updated;
    }

    async updateAvailability(
        userId: string,
        storeId: string,
        availability: { supportsPickup?: boolean; supportsDelivery?: boolean },
    ): Promise<Store> {
        const merchant = await this.merchantApplications.getMerchantForOwner(userId);
        const store = await this.getOwnedOrThrow(merchant.id, storeId);

        const updated = await this.prisma.store.update({
            where: { id: store.id },
            data: {
                supports_pickup: availability.supportsPickup,
                supports_delivery: availability.supportsDelivery,
            },
        });
        await this.audit.record({
            actorUserId: userId,
            action: 'STORE_AVAILABILITY_UPDATED',
            entityType: 'store',
            entityId: store.id,
        });
        return updated;
    }

    async updateStatusByMerchant(userId: string, storeId: string, status: string): Promise<Store> {
        const merchant = await this.merchantApplications.getMerchantForOwner(userId);
        const store = await this.getOwnedOrThrow(merchant.id, storeId);

        const allowed = MERCHANT_TRANSITIONS[store.status] ?? [];
        if (!allowed.includes(status)) {
            throw new BadRequestException(
                `Cannot change store status from ${store.status} to ${status}.`,
            );
        }
        if (status === 'ACTIVE' && merchant.verification_status !== 'APPROVED') {
            throw new ForbiddenException('A suspended merchant cannot activate a store.');
        }

        return this.applyStatusTransition(store, status, userId);
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    async listMerchantStores(
        merchantId: string,
        pagination: PaginationDto,
    ): Promise<PaginatedResult<Store>> {
        const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
        if (!merchant) {
            throw new NotFoundException('Merchant not found.');
        }
        return this.listByMerchant(merchantId, pagination);
    }

    async updateStatusByAdmin(
        storeId: string,
        status: string,
        adminUserId: string,
    ): Promise<Store> {
        const store = await this.prisma.store.findUnique({ where: { id: storeId } });
        if (!store) {
            throw new NotFoundException('Store not found.');
        }
        const allowed = ADMIN_TRANSITIONS[store.status] ?? [];
        if (!allowed.includes(status)) {
            throw new BadRequestException(
                `Cannot change store status from ${store.status} to ${status}.`,
            );
        }
        return this.applyStatusTransition(store, status, adminUserId);
    }

    /**
     * Compare-and-swap on `status`, the same pattern used for merchant application decisions -
     * closes the same class of concurrent-transition race (two requests racing to change one
     * store's status can never both succeed from a status that's already moved on).
     */
    private async applyStatusTransition(
        store: Store,
        newStatus: string,
        actorUserId: string,
    ): Promise<Store> {
        const result = await this.prisma.store.updateMany({
            where: { id: store.id, status: store.status },
            data: { status: newStatus as StoreStatus },
        });
        if (result.count === 0) {
            throw new ConflictException(
                "This store's status has already changed - reload and retry.",
            );
        }
        await this.audit.record({
            actorUserId,
            action: 'STORE_STATUS_CHANGED',
            entityType: 'store',
            entityId: store.id,
            beforeState: { status: store.status },
            afterState: { status: newStatus },
        });
        return this.prisma.store.findUniqueOrThrow({ where: { id: store.id } });
    }

    private async listByMerchant(
        merchantId: string,
        pagination: PaginationDto,
    ): Promise<PaginatedResult<Store>> {
        const where = { merchant_id: merchantId };
        const [data, total] = await Promise.all([
            this.prisma.store.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: (pagination.page - 1) * pagination.limit,
                take: pagination.limit,
            }),
            this.prisma.store.count({ where }),
        ]);
        return {
            data,
            meta: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
            },
        };
    }

    /** Never trusts storeId alone - always re-checked against the resolved owner's merchant_id. */
    private async getOwnedOrThrow(merchantId: string, storeId: string): Promise<Store> {
        const store = await this.prisma.store.findFirst({
            where: { id: storeId, merchant_id: merchantId },
        });
        if (!store) {
            throw new NotFoundException('Store not found.');
        }
        return store;
    }
}
