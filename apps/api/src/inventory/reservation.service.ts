import { ConflictException, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

type Tx = Prisma.TransactionClient;

export interface ReservationLineRequest {
    inventoryId: string;
    quantity: number;
    usesBatchTracking: boolean;
}

interface BatchCandidate {
    id: string;
    on_hand_quantity: string;
    reserved_quantity: string;
}

/**
 * Stock reservation for checkout/order creation, implementing
 * docs/04-design/DATABASE-DESIGN.md's "FEFO allocation at checkout" and "Reservation lifecycle"
 * exactly. Deliberately separate from BC-007's InventoryService (which decreases on_hand_quantity
 * for receive/adjust/remove) - this only ever increments/decrements reserved_quantity, never
 * on_hand_quantity; the two never compete for the same column in the same code path.
 *
 * BC-008 reserves directly order-held (StockReservation.order_id set, cart_id left NULL) rather
 * than first cart-held then "converted" at checkout - there is no cart-side browsing reservation
 * in this implementation (see CART-CHECKOUT-DESIGN.md "Reservation lifecycle - what BC-008 actually
 * does" for the reasoning). This still produces exactly the row shape and terminal states
 * DATABASE-DESIGN.md documents; it just starts straight from the order-held state.
 */
@Injectable()
export class ReservationService {
    private readonly logger = new Logger(ReservationService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Reserves every line of an order inside the caller's transaction. Locks all involved
     * inventory rows first, in ascending `id` order - a single, consistent global order across
     * every inventory row an order touches, so two concurrent orders can never request these locks
     * in opposite orders (the same reasoning as the single-inventory FEFO lock order, extended to
     * cover an order with several different listings at once). Throws ConflictException and lets
     * the caller's transaction roll back entirely if any single line can't be fully covered -
     * never a partial reservation.
     */
    async reserveForOrder(
        tx: Tx,
        orderId: string,
        lines: ReservationLineRequest[],
        expiresAt: Date,
    ): Promise<string> {
        const sortedInventoryIds = [...new Set(lines.map((l) => l.inventoryId))].sort();
        await tx.$queryRaw`
            SELECT id FROM "inventory" WHERE id = ANY(${sortedInventoryIds}::uuid[]) ORDER BY id FOR UPDATE
        `;

        const reservation = await tx.stockReservation.create({
            data: { order_id: orderId, status: 'ACTIVE', expires_at: expiresAt },
        });

        for (const line of lines) {
            if (line.usesBatchTracking) {
                await this.reserveBatchTrackedLine(tx, reservation.id, line);
            } else {
                await this.reserveAggregateLine(tx, reservation.id, line);
            }
        }

        return reservation.id;
    }

    /**
     * Compare-and-swap ACTIVE -> RELEASED, restoring exactly the recorded quantity per item (never
     * a guess) - idempotent against a double call: once the status flips away from ACTIVE the
     * second call's updateMany matches zero rows and is a safe no-op, so a reservation can never be
     * released twice or have its quantities restored twice.
     */
    async releaseReservation(tx: Tx, reservationId: string): Promise<void> {
        const released = await tx.stockReservation.updateMany({
            where: { id: reservationId, status: 'ACTIVE' },
            data: { status: 'RELEASED', released_at: new Date() },
        });
        if (released.count === 0) {
            return;
        }

        const items = await tx.stockReservationItem.findMany({
            where: { reservation_id: reservationId },
        });
        const inventoryIds = [...new Set(items.map((i) => i.inventory_id))].sort();
        if (inventoryIds.length > 0) {
            await tx.$queryRaw`
                SELECT id FROM "inventory" WHERE id = ANY(${inventoryIds}::uuid[]) ORDER BY id FOR UPDATE
            `;
        }
        const batchIds = [
            ...new Set(items.map((i) => i.batch_id).filter((id): id is string => !!id)),
        ].sort();
        if (batchIds.length > 0) {
            await tx.$queryRaw`
                SELECT id FROM "stock_batches" WHERE id = ANY(${batchIds}::uuid[]) ORDER BY id FOR UPDATE
            `;
        }

        for (const item of items) {
            const quantity = Number(item.quantity);
            if (item.batch_id) {
                await tx.stockBatch.update({
                    where: { id: item.batch_id },
                    data: { reserved_quantity: { decrement: quantity } },
                });
            }
            await tx.inventory.update({
                where: { id: item.inventory_id },
                data: { reserved_quantity: { decrement: quantity } },
            });
        }
    }

    /**
     * Operated periodically (see CART-CHECKOUT-DESIGN.md "Reservation expiry operation" - a plain
     * database-backed job invoked via `scripts/release-expired-reservations.mjs`, no new scheduler
     * or infrastructure dependency). Each expired reservation is released in its own transaction,
     * so one failure never blocks the rest, and the order is only cancelled if it is still in its
     * pre-acceptance `CREATED` status (a compare-and-swap, never touching an order a later
     * milestone's accept/complete flow has already moved on from).
     */
    async releaseExpiredOrderReservations(): Promise<{
        released: number;
        cancelledOrders: number;
    }> {
        const expired = await this.prisma.stockReservation.findMany({
            where: { status: 'ACTIVE', order_id: { not: null }, expires_at: { lt: new Date() } },
            take: 200,
        });

        let released = 0;
        let cancelledOrders = 0;
        for (const reservation of expired) {
            try {
                const cancelledThisOne = await this.prisma.$transaction(async (tx) => {
                    await this.releaseReservation(tx, reservation.id);
                    if (!reservation.order_id) return false;
                    const cancelled = await tx.order.updateMany({
                        where: { id: reservation.order_id, status: 'CREATED' },
                        data: { status: 'CANCELLED' },
                    });
                    if (cancelled.count === 1) {
                        await tx.orderStatusHistory.create({
                            data: {
                                order_id: reservation.order_id,
                                old_status: 'CREATED',
                                new_status: 'CANCELLED',
                                reason: 'Stock reservation expired without confirmation.',
                            },
                        });
                        return true;
                    }
                    return false;
                });
                released += 1;
                if (cancelledThisOne) cancelledOrders += 1;
            } catch (error) {
                this.logger.error(`Failed to release expired reservation ${reservation.id}`, error);
            }
        }
        return { released, cancelledOrders };
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------

    private async reserveAggregateLine(
        tx: Tx,
        reservationId: string,
        line: ReservationLineRequest,
    ): Promise<void> {
        const inventory = await tx.inventory.findUniqueOrThrow({ where: { id: line.inventoryId } });
        const available = Number(inventory.on_hand_quantity) - Number(inventory.reserved_quantity);
        if (available < line.quantity) {
            throw new ConflictException('Not enough available stock to reserve that quantity.');
        }
        await tx.stockReservationItem.create({
            data: {
                reservation_id: reservationId,
                inventory_id: line.inventoryId,
                quantity: line.quantity,
            },
        });
        await tx.inventory.update({
            where: { id: line.inventoryId },
            data: { reserved_quantity: { increment: line.quantity } },
        });
    }

    /**
     * FEFO: eligible batches are locked in `expiry_date ASC NULLS LAST, id ASC` order (the exact
     * global order BC-004's test helper and BC-007's InventoryService both use) and allocated
     * greedily, excluding already-expired batches - never a reservation bypass (respects
     * `reserved_quantity`), never an expired-batch allocation.
     */
    private async reserveBatchTrackedLine(
        tx: Tx,
        reservationId: string,
        line: ReservationLineRequest,
    ): Promise<void> {
        const batches = await tx.$queryRaw<BatchCandidate[]>`
            SELECT id, on_hand_quantity, reserved_quantity
            FROM "stock_batches"
            WHERE inventory_id = ${line.inventoryId}::uuid
                AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
            ORDER BY expiry_date ASC NULLS LAST, id ASC
            FOR UPDATE
        `;

        let remaining = line.quantity;
        const allocations: Array<{ batchId: string; quantity: number }> = [];
        for (const batch of batches) {
            if (remaining <= 0) break;
            const available = Number(batch.on_hand_quantity) - Number(batch.reserved_quantity);
            if (available <= 0) continue;
            const take = Math.min(available, remaining);
            allocations.push({ batchId: batch.id, quantity: take });
            remaining -= take;
        }
        if (remaining > 0) {
            throw new ConflictException(
                'Not enough available (non-expired) stock to reserve that quantity.',
            );
        }

        for (const allocation of allocations) {
            await tx.stockReservationItem.create({
                data: {
                    reservation_id: reservationId,
                    inventory_id: line.inventoryId,
                    batch_id: allocation.batchId,
                    quantity: allocation.quantity,
                },
            });
            await tx.stockBatch.update({
                where: { id: allocation.batchId },
                data: { reserved_quantity: { increment: allocation.quantity } },
            });
        }
        await tx.inventory.update({
            where: { id: line.inventoryId },
            data: { reserved_quantity: { increment: line.quantity } },
        });
    }
}
