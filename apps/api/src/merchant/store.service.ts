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
import { isStoreOpen } from './utils/store-hours.util.js';
import type { ListPublicStoresQueryDto, PublicStoreDto } from './dto/public-store.dto.js';

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

// Re-exported so Prisma's Merchant type (private to merchant-application.service.ts) isn't
// imported here just for this one field's type.
interface SuspendableMerchant {
    verification_status: string;
}

/**
 * Blocks ordinary store edits (details/hours/availability) while the owning merchant is
 * SUSPENDED - a suspension that only ever blocked store *creation* and *reactivation* left every
 * other store-mutating endpoint reachable, which defeats the point of suspending the merchant in
 * the first place. Status transitions are handled separately (`updateStatusByMerchant`), which
 * already has its own narrower check: a suspended merchant may still pause/close a store, just
 * never reactivate one.
 */
function assertNotSuspended(merchant: SuspendableMerchant): void {
    if (merchant.verification_status === 'SUSPENDED') {
        throw new ForbiddenException('Your merchant account is suspended.');
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
        if (dto.serviceZoneId) {
            await this.assertServiceZoneActive(dto.serviceZoneId);
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
                ${dto.timezone ?? 'Asia/Kolkata'}, ${dto.serviceZoneId ?? null}::uuid,
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
        assertNotSuspended(merchant);
        const store = await this.getOwnedOrThrow(merchant.id, storeId);
        if (dto.serviceZoneId) {
            await this.assertServiceZoneActive(dto.serviceZoneId);
        }

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
        assertNotSuspended(merchant);
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
        assertNotSuspended(merchant);
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

    /**
     * A store's `service_zone_id` is merchant-supplied, so it must be checked server-side rather
     * than trusted outright: the foreign key alone only stops a reference to a zone that doesn't
     * exist at all, not one that exists but has since been decommissioned (`is_active = false`).
     * Geographic containment (the store's location actually falling inside the zone) is
     * deliberately not checked here - per `DATABASE-DESIGN.md`'s "Service zones and delivery
     * eligibility", zone membership plus `max_delivery_radius_km`/`boundary` governs *customer
     * address* eligibility for a given store, not a constraint on where the store itself may sit;
     * inventing one here would be a real behaviour change beyond this task's scope, not a fix.
     */
    private async assertServiceZoneActive(serviceZoneId: string): Promise<void> {
        const zone = await this.prisma.serviceZone.findUnique({ where: { id: serviceZoneId } });
        if (!zone || !zone.is_active) {
            throw new BadRequestException(
                'The selected service zone does not exist or is not active.',
            );
        }
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

    /** Public store discovery: lists active stores belonging to approved merchants. */
    async listPublicStores(
        query: ListPublicStoresQueryDto,
    ): Promise<PaginatedResult<PublicStoreDto>> {
        const where = {
            status: 'ACTIVE' as StoreStatus,
            merchant: { verification_status: 'APPROVED' },
            ...(query.locality
                ? { locality: { contains: query.locality, mode: 'insensitive' as const } }
                : {}),
            ...(query.supportsPickup !== undefined
                ? { supports_pickup: query.supportsPickup }
                : {}),
            ...(query.supportsDelivery !== undefined
                ? { supports_delivery: query.supportsDelivery }
                : {}),
        };
        const [stores, total] = await Promise.all([
            this.prisma.store.findMany({
                where,
                orderBy: { name: 'asc' },
                skip: (query.page - 1) * query.limit,
                take: query.limit,
            }),
            this.prisma.store.count({ where }),
        ]);

        const data: PublicStoreDto[] = stores.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            address: s.address,
            locality: s.locality,
            district: s.district,
            city: s.city,
            contact_phone: s.contact_phone,
            supports_pickup: s.supports_pickup,
            supports_delivery: s.supports_delivery,
            opening_hours: s.opening_hours as StoreOperatingHoursDto | null,
            is_open: isStoreOpen(s.status, s.opening_hours as StoreOperatingHoursDto | null),
        }));

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

    /** Public store details: returns single active store. */
    async getPublicStore(storeId: string): Promise<PublicStoreDto> {
        const store = await this.prisma.store.findFirst({
            where: {
                id: storeId,
                status: 'ACTIVE',
                merchant: { verification_status: 'APPROVED' },
            },
        });
        if (!store) {
            throw new NotFoundException('Store not found or is currently inactive.');
        }
        return {
            id: store.id,
            name: store.name,
            description: store.description,
            address: store.address,
            locality: store.locality,
            district: store.district,
            city: store.city,
            contact_phone: store.contact_phone,
            supports_pickup: store.supports_pickup,
            supports_delivery: store.supports_delivery,
            opening_hours: store.opening_hours as StoreOperatingHoursDto | null,
            is_open: isStoreOpen(store.status, store.opening_hours as StoreOperatingHoursDto | null),
        };
    }
}
