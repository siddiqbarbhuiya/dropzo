// Test-only helper implementing DATABASE-DESIGN.md's "FEFO allocation at checkout" procedure
// exactly (lock inventory, lock candidate batches in expiry_date ASC NULLS LAST, id ASC order,
// allocate, record reservation items, update counters - all in one transaction). This proves the
// schema's locking/concurrency behavior; it is NOT a NestJS checkout service or API endpoint -
// the real checkout business logic is a separate, future task (see TASK-TRACKER.md).
import type { Prisma, PrismaClient } from '@prisma/client';

export interface ReservationOwner {
    cart_id?: string;
    order_id?: string;
}

export interface ReservationResult {
    reservationId: string;
    allocations: Array<{ batchId: string; quantity: number }>;
}

export async function reserveFefo(
    prisma: PrismaClient,
    inventoryId: string,
    quantity: number,
    owner: ReservationOwner,
    expiresAt: Date,
): Promise<ReservationResult> {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const inventoryRows = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM "inventory" WHERE id = ${inventoryId}::uuid FOR UPDATE
        `;
        if (inventoryRows.length === 0) {
            throw new Error(`inventory ${inventoryId} not found`);
        }

        const batches = await tx.$queryRaw<
            Array<{ id: string; on_hand_quantity: string; reserved_quantity: string }>
        >`
            SELECT id, on_hand_quantity, reserved_quantity
            FROM "stock_batches"
            WHERE inventory_id = ${inventoryId}::uuid
            ORDER BY expiry_date ASC NULLS LAST, id ASC
            FOR UPDATE
        `;

        let remaining = quantity;
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
            throw new Error('insufficient stock');
        }

        const reservation = await tx.stockReservation.create({
            data: {
                cart_id: owner.cart_id,
                order_id: owner.order_id,
                expires_at: expiresAt,
            },
        });

        let totalAllocated = 0;
        for (const allocation of allocations) {
            await tx.stockReservationItem.create({
                data: {
                    reservation_id: reservation.id,
                    inventory_id: inventoryId,
                    batch_id: allocation.batchId,
                    quantity: allocation.quantity,
                },
            });
            await tx.stockBatch.update({
                where: { id: allocation.batchId },
                data: { reserved_quantity: { increment: allocation.quantity } },
            });
            totalAllocated += allocation.quantity;
        }
        await tx.inventory.update({
            where: { id: inventoryId },
            data: { reserved_quantity: { increment: totalAllocated } },
        });

        return { reservationId: reservation.id, allocations };
    });
}
