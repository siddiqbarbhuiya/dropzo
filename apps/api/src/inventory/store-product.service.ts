import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import type { StoreProduct } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { MerchantApplicationService } from '../merchant/merchant-application.service.js';
import { StoreService } from '../merchant/store.service.js';
import type { CreateListingDto } from './dto/create-listing.dto.js';
import type { UpdateListingDto } from './dto/update-listing.dto.js';
import type { ListListingsDto } from './dto/list-listings.dto.js';
import type { PaginatedResult } from '../merchant/dto/pagination.dto.js';

/**
 * Store-owned listings connecting a global ProductVariant to one store. One product/variant may
 * be listed by many stores (each with its own price/availability - store_id+variant_id is UNIQUE,
 * so a store can never list the same variant twice); ownership is always resolved from the
 * authenticated user via StoreService.getOwnStore, never a client-supplied store id alone.
 */
@Injectable()
export class StoreProductService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly merchantApplications: MerchantApplicationService,
        private readonly stores: StoreService,
    ) {}

    async createListing(
        userId: string,
        storeId: string,
        dto: CreateListingDto,
    ): Promise<StoreProduct> {
        await this.assertActiveMerchantOwnsStore(userId, storeId);

        const variant = await this.prisma.productVariant.findUnique({
            where: { id: dto.variantId },
        });
        if (!variant || !variant.is_active) {
            throw new NotFoundException('Product variant not found or inactive.');
        }

        let listing: StoreProduct;
        try {
            listing = await this.prisma.$transaction(async (tx) => {
                const created = await tx.storeProduct.create({
                    data: {
                        store_id: storeId,
                        variant_id: dto.variantId,
                        selling_price: dto.sellingPrice,
                        mrp: dto.mrp,
                        uses_batch_tracking: dto.usesBatchTracking ?? false,
                        is_available: dto.isAvailable ?? true,
                    },
                });
                await tx.inventory.create({
                    data: {
                        store_product_id: created.id,
                        low_stock_threshold: dto.lowStockThreshold ?? 0,
                    },
                });
                return created;
            });
        } catch {
            throw new ConflictException(
                'This store already has a listing for this product variant.',
            );
        }

        await this.audit.record({
            actorUserId: userId,
            action: 'LISTING_CREATED',
            entityType: 'store_product',
            entityId: listing.id,
        });
        return listing;
    }

    async updateListing(
        userId: string,
        storeId: string,
        listingId: string,
        dto: UpdateListingDto,
    ): Promise<StoreProduct> {
        await this.assertActiveMerchantOwnsStore(userId, storeId);
        const listing = await this.getOwnedOrThrow(storeId, listingId);

        const updated = await this.prisma.$transaction(async (tx) => {
            const result = await tx.storeProduct.update({
                where: { id: listing.id },
                data: {
                    selling_price: dto.sellingPrice,
                    mrp: dto.mrp,
                    is_available: dto.isAvailable,
                },
            });
            if (dto.lowStockThreshold !== undefined) {
                await tx.inventory.update({
                    where: { store_product_id: listing.id },
                    data: { low_stock_threshold: dto.lowStockThreshold },
                });
            }
            return result;
        });

        await this.audit.record({
            actorUserId: userId,
            action: 'LISTING_UPDATED',
            entityType: 'store_product',
            entityId: listing.id,
        });
        return updated;
    }

    async listOwnListings(
        userId: string,
        storeId: string,
        query: ListListingsDto,
    ): Promise<PaginatedResult<StoreProduct>> {
        await this.stores.getOwnStore(userId, storeId);
        const where = {
            store_id: storeId,
            ...(query.isAvailable !== undefined
                ? { is_available: query.isAvailable === 'true' }
                : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.storeProduct.findMany({
                where,
                include: { variant: { include: { product: true } }, inventory: true },
                orderBy: { created_at: 'desc' },
                skip: (query.page - 1) * query.limit,
                take: query.limit,
            }),
            this.prisma.storeProduct.count({ where }),
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

    async getOwnListing(userId: string, storeId: string, listingId: string): Promise<StoreProduct> {
        await this.stores.getOwnStore(userId, storeId);
        return this.getOwnedOrThrow(storeId, listingId, {
            variant: { include: { product: true } },
            inventory: { include: { stock_batches: true } },
        });
    }

    /** Never trusts listingId alone - always re-checked against the resolved store. */
    private async getOwnedOrThrow(
        storeId: string,
        listingId: string,
        include?: Record<string, unknown>,
    ): Promise<StoreProduct> {
        const listing = await this.prisma.storeProduct.findFirst({
            where: { id: listingId, store_id: storeId },
            include,
        });
        if (!listing) {
            throw new NotFoundException('Listing not found.');
        }
        return listing;
    }

    /** Mirrors BC-006's own suspension enforcement: a suspended merchant cannot manage listings. */
    private async assertActiveMerchantOwnsStore(userId: string, storeId: string): Promise<void> {
        await this.stores.getOwnStore(userId, storeId);
        const merchant = await this.merchantApplications.getMerchantForOwner(userId);
        if (merchant.verification_status === 'SUSPENDED') {
            throw new ForbiddenException('Your merchant account is suspended.');
        }
    }
}
