import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import type { Prisma, StoreProduct } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { MerchantApplicationService } from '../merchant/merchant-application.service.js';
import { StoreService } from '../merchant/store.service.js';
import type { ReceiveStockDto } from './dto/receive-stock.dto.js';
import type { AdjustStockDto } from './dto/adjust-stock.dto.js';
import type { RemoveStockDto } from './dto/remove-stock.dto.js';
import type { PaginatedResult } from '../merchant/dto/pagination.dto.js';
import type { PaginationDto } from '../merchant/dto/pagination.dto.js';

type Tx = Prisma.TransactionClient;

interface BatchCandidate {
    id: string;
    on_hand_quantity: string;
    reserved_quantity: string;
}

/**
 * quantity sign convention for stock_movements (not dictated by the schema, so documented here
 * and in INVENTORY-MANAGEMENT-DESIGN.md): RECEIVED/SOLD/DAMAGED/EXPIRED/RESERVED/RELEASED store a
 * positive magnitude, direction implied by movement_type. ADJUSTED stores the signed delta
 * (positive = correction added stock, negative = correction removed stock), since a correction
 * can go either way under the one movement_type.
 */
type MovementType = 'RECEIVED' | 'ADJUSTED' | 'DAMAGED' | 'EXPIRED';

/**
 * ReceiveStockDto's manufactureDate/expiryDate are validated with @IsDateString(), which (per
 * ISO-8601) accepts a bare date like "2026-11-09" - exactly the Swagger example format - but
 * Prisma's DateTime fields require a full date-time string and reject a bare date with
 * "premature end of input". Parsing into a real Date here (which Prisma always accepts,
 * regardless of the underlying column being @db.Date) is what actually makes the documented
 * request shape work, not just pass DTO validation.
 */
function toDateOrUndefined(value: string | undefined): Date | undefined {
    return value === undefined ? undefined : new Date(value);
}

/**
 * Stock receiving, correction, and write-off for one store's listing. Mirrors
 * docs/04-design/DATABASE-DESIGN.md's "Receiving stock"/"Damage and expiry" procedures and the
 * exact FEFO lock order BC-004 established (lock inventory, then candidate batches in
 * `expiry_date ASC NULLS LAST, id ASC`, inventory always locked first - the same global rule a
 * future reservation/checkout feature must also follow to stay deadlock-free against this code).
 */
@Injectable()
export class InventoryService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly merchantApplications: MerchantApplicationService,
        private readonly stores: StoreService,
    ) {}

    async receiveStock(userId: string, storeId: string, listingId: string, dto: ReceiveStockDto) {
        const listing = await this.assertOwnedListing(userId, storeId, listingId);

        return this.prisma.$transaction(async (tx) => {
            const inventory = await this.lockInventory(tx, listing.id);

            let batchId: string | null = null;
            if (listing.uses_batch_tracking) {
                if (dto.batchId) {
                    const batch = await this.lockBatchOwnedBy(tx, inventory.id, dto.batchId);
                    await tx.stockBatch.update({
                        where: { id: batch.id },
                        data: { on_hand_quantity: { increment: dto.quantity } },
                    });
                    batchId = batch.id;
                } else {
                    const created = await tx.stockBatch.create({
                        data: {
                            inventory_id: inventory.id,
                            batch_code: dto.batchCode,
                            received_quantity: dto.quantity,
                            on_hand_quantity: dto.quantity,
                            manufacture_date: toDateOrUndefined(dto.manufactureDate),
                            expiry_date: toDateOrUndefined(dto.expiryDate),
                            cost_price: dto.costPrice,
                        },
                    });
                    batchId = created.id;
                }
            }

            await tx.inventory.update({
                where: { id: inventory.id },
                data: { on_hand_quantity: { increment: dto.quantity } },
            });

            await this.recordMovement(tx, {
                inventoryId: inventory.id,
                batchId,
                movementType: 'RECEIVED',
                quantity: dto.quantity,
                createdBy: userId,
            });

            await this.audit.record({
                actorUserId: userId,
                action: 'STOCK_RECEIVED',
                entityType: 'store_product',
                entityId: listing.id,
                afterState: { quantity: dto.quantity, batchId },
            });

            return this.snapshot(tx, listing.id);
        });
    }

    /**
     * A signed correction. Increasing batch-tracked stock requires naming the batch (there is no
     * sensible default for "which batch gained inventory"); decreasing may name a batch or let
     * FEFO choose (earliest-expiring eligible batches first, excluding already-reserved and
     * already-expired quantity - never a reservation bypass, never an expired-batch allocation).
     */
    async adjustStock(userId: string, storeId: string, listingId: string, dto: AdjustStockDto) {
        const listing = await this.assertOwnedListing(userId, storeId, listingId);
        const increase = dto.quantityDelta > 0;

        return this.prisma.$transaction(async (tx) => {
            const inventory = await this.lockInventory(tx, listing.id);

            // Only a batchId that this call itself verified (via lockBatchOwnedBy, scoped to this
            // inventory) is ever recorded on the movement - dto.batchId is never trusted directly,
            // so a client-supplied id for the wrong inventory, or any id at all on a non-batch-
            // tracked listing, can never end up cross-referenced into stock_movements.batch_id.
            let checkedBatchId: string | null = null;

            if (listing.uses_batch_tracking) {
                if (increase) {
                    if (!dto.batchId) {
                        throw new BadRequestException(
                            'Increasing batch-tracked stock requires batchId - there is no default batch to add to.',
                        );
                    }
                    const batch = await this.lockBatchOwnedBy(tx, inventory.id, dto.batchId);
                    await tx.stockBatch.update({
                        where: { id: batch.id },
                        data: { on_hand_quantity: { increment: dto.quantityDelta } },
                    });
                    checkedBatchId = batch.id;
                } else if (dto.batchId) {
                    const batch = await this.lockBatchOwnedBy(tx, inventory.id, dto.batchId);
                    await tx.stockBatch.update({
                        where: { id: batch.id },
                        data: { on_hand_quantity: { decrement: -dto.quantityDelta } },
                    });
                    checkedBatchId = batch.id;
                } else {
                    await this.consumeFefo(tx, inventory.id, -dto.quantityDelta, 'AVAILABLE');
                }
            } else {
                if (dto.batchId) {
                    throw new BadRequestException(
                        'This listing is not batch-tracked - batchId must not be supplied.',
                    );
                }
                if (!increase) {
                    this.assertAvailable(inventory, -dto.quantityDelta);
                }
            }

            await tx.inventory.update({
                where: { id: inventory.id },
                data: { on_hand_quantity: { increment: dto.quantityDelta } },
            });

            await this.recordMovement(tx, {
                inventoryId: inventory.id,
                batchId: checkedBatchId,
                movementType: 'ADJUSTED',
                quantity: dto.quantityDelta,
                createdBy: userId,
                notes: dto.reason,
            });

            await this.audit.record({
                actorUserId: userId,
                action: 'STOCK_ADJUSTED',
                entityType: 'store_product',
                entityId: listing.id,
                afterState: { quantityDelta: dto.quantityDelta, reason: dto.reason },
            });

            return this.snapshot(tx, listing.id);
        });
    }

    async removeStock(userId: string, storeId: string, listingId: string, dto: RemoveStockDto) {
        const listing = await this.assertOwnedListing(userId, storeId, listingId);

        return this.prisma.$transaction(async (tx) => {
            const inventory = await this.lockInventory(tx, listing.id);

            // Same rule as adjustStock: only a batchId this call itself verified against this
            // inventory is ever recorded - dto.batchId is never trusted directly.
            let checkedBatchId: string | null = null;

            if (listing.uses_batch_tracking) {
                if (dto.batchId) {
                    const batch = await this.lockBatchOwnedBy(tx, inventory.id, dto.batchId);
                    if (dto.type === 'EXPIRED' && !this.isPastExpiry(batch)) {
                        throw new ConflictException('That batch has not expired.');
                    }
                    await tx.stockBatch.update({
                        where: { id: batch.id },
                        data: { on_hand_quantity: { decrement: dto.quantity } },
                    });
                    checkedBatchId = batch.id;
                } else {
                    await this.consumeFefo(
                        tx,
                        inventory.id,
                        dto.quantity,
                        dto.type === 'EXPIRED' ? 'EXPIRED_ONLY' : 'AVAILABLE',
                    );
                }
            } else {
                if (dto.batchId) {
                    throw new BadRequestException(
                        'This listing is not batch-tracked - batchId must not be supplied.',
                    );
                }
                this.assertAvailable(inventory, dto.quantity);
            }

            await tx.inventory.update({
                where: { id: inventory.id },
                data: { on_hand_quantity: { decrement: dto.quantity } },
            });

            await this.recordMovement(tx, {
                inventoryId: inventory.id,
                batchId: checkedBatchId,
                movementType: dto.type,
                quantity: dto.quantity,
                createdBy: userId,
                notes: dto.reason,
            });

            await this.audit.record({
                actorUserId: userId,
                action: `STOCK_${dto.type}`,
                entityType: 'store_product',
                entityId: listing.id,
                afterState: { quantity: dto.quantity, reason: dto.reason },
            });

            return this.snapshot(tx, listing.id);
        });
    }

    async getSnapshot(userId: string, storeId: string, listingId: string) {
        const listing = await this.assertOwnedListing(userId, storeId, listingId);
        return this.snapshot(this.prisma, listing.id);
    }

    async listMovements(
        userId: string,
        storeId: string,
        listingId: string,
        pagination: PaginationDto,
    ) {
        const listing = await this.assertOwnedListing(userId, storeId, listingId);
        const inventory = await this.prisma.inventory.findUniqueOrThrow({
            where: { store_product_id: listing.id },
        });
        const where = { inventory_id: inventory.id };
        const [data, total] = await Promise.all([
            this.prisma.stockMovement.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: (pagination.page - 1) * pagination.limit,
                take: pagination.limit,
            }),
            this.prisma.stockMovement.count({ where }),
        ]);
        return {
            data,
            meta: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
            },
        } satisfies PaginatedResult<unknown>;
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------

    private async snapshot(tx: Tx, storeProductId: string) {
        const inventory = await tx.inventory.findUniqueOrThrow({
            where: { store_product_id: storeProductId },
            include: { stock_batches: { orderBy: [{ expiry_date: 'asc' }, { id: 'asc' }] } },
        });
        return inventory;
    }

    private async lockInventory(tx: Tx, storeProductId: string) {
        const rows = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT i.id FROM "inventory" i
            WHERE i.store_product_id = ${storeProductId}::uuid
            FOR UPDATE
        `;
        if (rows.length === 0) {
            throw new NotFoundException('Inventory record not found for this listing.');
        }
        return tx.inventory.findUniqueOrThrow({ where: { id: rows[0]!.id } });
    }

    private async lockBatchOwnedBy(tx: Tx, inventoryId: string, batchId: string) {
        const rows = await tx.$queryRaw<
            Array<{
                id: string;
                on_hand_quantity: string;
                reserved_quantity: string;
                expiry_date: Date | null;
            }>
        >`
            SELECT id, on_hand_quantity, reserved_quantity, expiry_date FROM "stock_batches"
            WHERE id = ${batchId}::uuid AND inventory_id = ${inventoryId}::uuid
            FOR UPDATE
        `;
        if (rows.length === 0) {
            throw new NotFoundException('Batch not found for this listing.');
        }
        return rows[0]!;
    }

    private isPastExpiry(batch: { expiry_date: Date | null }): boolean {
        return batch.expiry_date !== null && batch.expiry_date.getTime() < Date.now();
    }

    /**
     * For a non-batch-tracked (aggregate) listing there are no batch rows to lock/select from, so
     * the reservation-respecting availability check that `consumeFefo` does for batch-tracked
     * listings must be done directly against the inventory row here - never a reservation bypass,
     * and a clean 409 instead of surfacing the DB's own non-negative CHECK violation as a 500.
     */
    private assertAvailable(
        inventory: { on_hand_quantity: Prisma.Decimal; reserved_quantity: Prisma.Decimal },
        quantity: number,
    ): void {
        const available = Number(inventory.on_hand_quantity) - Number(inventory.reserved_quantity);
        if (available < quantity) {
            throw new ConflictException(
                'Not enough available (non-reserved) stock to cover that quantity.',
            );
        }
    }

    /**
     * Locks candidate batches in the documented global order (`expiry_date ASC NULLS LAST, id
     * ASC`, inventory already locked by the caller before this is reached) and decrements each in
     * turn until `quantity` is covered. 'AVAILABLE' excludes already-expired batches (never
     * consume/damage-write-off against a batch that's past its own expiry via the generic path -
     * use the dedicated EXPIRED removal for that) and respects `reserved_quantity` (never a
     * reservation bypass). 'EXPIRED_ONLY' is the inverse, for the EXPIRED removal operation.
     */
    private async consumeFefo(
        tx: Tx,
        inventoryId: string,
        quantity: number,
        filter: 'AVAILABLE' | 'EXPIRED_ONLY',
    ): Promise<void> {
        const batches =
            filter === 'AVAILABLE'
                ? await tx.$queryRaw<BatchCandidate[]>`
                    SELECT id, on_hand_quantity, reserved_quantity
                    FROM "stock_batches"
                    WHERE inventory_id = ${inventoryId}::uuid
                        AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
                    ORDER BY expiry_date ASC NULLS LAST, id ASC
                    FOR UPDATE
                `
                : await tx.$queryRaw<BatchCandidate[]>`
                    SELECT id, on_hand_quantity, reserved_quantity
                    FROM "stock_batches"
                    WHERE inventory_id = ${inventoryId}::uuid
                        AND expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE
                    ORDER BY expiry_date ASC, id ASC
                    FOR UPDATE
                `;

        let remaining = quantity;
        for (const batch of batches) {
            if (remaining <= 0) break;
            const available = Number(batch.on_hand_quantity) - Number(batch.reserved_quantity);
            if (available <= 0) continue;
            const take = Math.min(available, remaining);
            await tx.stockBatch.update({
                where: { id: batch.id },
                data: { on_hand_quantity: { decrement: take } },
            });
            remaining -= take;
        }
        if (remaining > 0) {
            throw new ConflictException(
                filter === 'EXPIRED_ONLY'
                    ? 'Not enough expired stock available to remove that quantity.'
                    : 'Not enough available (non-reserved, non-expired) stock to cover that quantity.',
            );
        }
    }

    private async recordMovement(
        tx: Tx,
        args: {
            inventoryId: string;
            batchId: string | null;
            movementType: MovementType;
            quantity: number;
            createdBy: string;
            notes?: string;
        },
    ): Promise<void> {
        await tx.stockMovement.create({
            data: {
                inventory_id: args.inventoryId,
                batch_id: args.batchId ?? undefined,
                movement_type: args.movementType,
                quantity: args.quantity,
                reference_type: 'MANUAL',
                created_by: args.createdBy,
                notes: args.notes,
            },
        });
    }

    private async assertOwnedListing(
        userId: string,
        storeId: string,
        listingId: string,
    ): Promise<StoreProduct> {
        await this.stores.getOwnStore(userId, storeId);
        const merchant = await this.merchantApplications.getMerchantForOwner(userId);
        if (merchant.verification_status === 'SUSPENDED') {
            throw new ForbiddenException('Your merchant account is suspended.');
        }
        const listing = await this.prisma.storeProduct.findFirst({
            where: { id: listingId, store_id: storeId },
        });
        if (!listing) {
            throw new NotFoundException('Listing not found.');
        }
        return listing;
    }
}
