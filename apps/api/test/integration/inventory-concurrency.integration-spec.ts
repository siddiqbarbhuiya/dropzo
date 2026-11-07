// Inventory concurrency (BC-004-IMPLEMENTATION-PLAN.md Stage 9): no overselling under concurrent
// checkouts, FEFO allocation order, and the reserved_quantity <= on_hand_quantity CHECK.
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { adminPrisma, disconnectAll, resetDatabase } from '../helpers/clients.js';
import { reserveFefo } from '../helpers/reservation.js';

async function createStoreProduct(usesBatchTracking: boolean) {
    const owner = await adminPrisma.user.create({
        data: { phone: `+91${randomUUID().slice(0, 9)}` },
    });
    const merchant = await adminPrisma.merchant.create({
        data: {
            owner_user_id: owner.id,
            legal_name: 'x',
            display_name: 'x',
            contact_phone: '1',
            business_address: 'x',
        },
    });
    const storeId = randomUUID();
    await adminPrisma.$executeRaw`
        INSERT INTO "stores" (id, merchant_id, name, address, district, city, location, status)
        VALUES (${storeId}::uuid, ${merchant.id}::uuid, 'x', 'x', 'x', 'x',
            ST_SetSRID(ST_MakePoint(92.5, 24.8), 4326)::geography, 'ACTIVE')
    `;
    const product = await adminPrisma.product.create({ data: { name: 'x' } });
    const variant = await adminPrisma.productVariant.create({
        data: { product_id: product.id, variant_name: 'x', unit: 'g' },
    });
    const storeProduct = await adminPrisma.storeProduct.create({
        data: {
            store_id: storeId,
            variant_id: variant.id,
            selling_price: 10,
            uses_batch_tracking: usesBatchTracking,
        },
    });
    const inventory = await adminPrisma.inventory.create({
        data: { store_product_id: storeProduct.id, on_hand_quantity: 0 },
    });
    return { storeId, storeProduct, inventory, ownerUserId: owner.id };
}

// stock_reservations has a CHECK (num_nonnulls(cart_id, order_id) = 1) - every reservation needs
// a real owning cart. Each call creates a fresh cart so concurrent reservations in the same test
// don't collide with the "one ACTIVE reservation per cart" partial unique index instead of the
// stock-availability constraint actually being tested.
async function createCart(userId: string, storeId: string) {
    return adminPrisma.cart.create({ data: { user_id: userId, store_id: storeId } });
}

// Mirrors DATABASE-DESIGN.md's "Receiving stock" procedure: a RECEIVED movement creates a
// stock_batches row and increases both its own and the parent inventory row's on_hand_quantity by
// the same amount, in one transaction - inventory.on_hand_quantity must always equal
// SUM(stock_batches.on_hand_quantity) for a batch-tracked listing (see "Inventory and FEFO
// allocation"). Creating a batch without also topping up the parent row violates the
// chk_inventory_reserved_blocked_le_on_hand CHECK the moment any of that stock is reserved.
async function receiveBatch(
    inventoryId: string,
    onHandQuantity: number,
    options?: { reservedQuantity?: number; expiryDate?: Date | null },
) {
    return adminPrisma.$transaction(async (tx) => {
        const batch = await tx.stockBatch.create({
            data: {
                inventory_id: inventoryId,
                received_quantity: onHandQuantity,
                on_hand_quantity: onHandQuantity,
                reserved_quantity: options?.reservedQuantity ?? 0,
                expiry_date: options?.expiryDate,
            },
        });
        await tx.inventory.update({
            where: { id: inventoryId },
            data: {
                on_hand_quantity: { increment: onHandQuantity },
                reserved_quantity: { increment: options?.reservedQuantity ?? 0 },
            },
        });
        return batch;
    });
}

describe('inventory concurrency', () => {
    afterAll(async () => {
        await disconnectAll();
    });

    beforeEach(async () => {
        await resetDatabase();
    });

    it('rejects on_hand_quantity going negative (CHECK constraint)', async () => {
        const { inventory } = await createStoreProduct(false);
        await expect(
            adminPrisma.inventory.update({
                where: { id: inventory.id },
                data: { on_hand_quantity: -1 },
            }),
        ).rejects.toThrow();
    });

    it('allocates the earliest-expiring batch first (FEFO), id as tiebreaker', async () => {
        const { inventory, storeId, ownerUserId } = await createStoreProduct(true);
        const cart = await createCart(ownerUserId, storeId);
        const soon = await receiveBatch(inventory.id, 10, { expiryDate: new Date('2026-12-01') });
        await receiveBatch(inventory.id, 10, { expiryDate: new Date('2026-12-31') });
        await receiveBatch(inventory.id, 10, { expiryDate: null }); // no expiry - allocated last, per NULLS LAST

        const result = await reserveFefo(
            adminPrisma,
            inventory.id,
            5,
            { cart_id: cart.id },
            new Date(Date.now() + 60_000),
        );
        expect(result.allocations).toHaveLength(1);
        expect(result.allocations[0].batchId).toBe(soon.id);
        expect(result.allocations[0].quantity).toBe(5);
    });

    it('excludes a fully-depleted batch and falls through to the next in FEFO order', async () => {
        const { inventory, storeId, ownerUserId } = await createStoreProduct(true);
        const cart = await createCart(ownerUserId, storeId);
        // Fully reserved already - nothing available from this batch.
        await receiveBatch(inventory.id, 5, {
            reservedQuantity: 5,
            expiryDate: new Date('2026-12-01'),
        });
        const second = await receiveBatch(inventory.id, 10, { expiryDate: new Date('2026-12-31') });

        const result = await reserveFefo(
            adminPrisma,
            inventory.id,
            3,
            { cart_id: cart.id },
            new Date(Date.now() + 60_000),
        );
        expect(result.allocations).toEqual([{ batchId: second.id, quantity: 3 }]);
    });

    it('never allows two concurrent requests to both reserve the last unit', async () => {
        const { inventory, storeId, ownerUserId } = await createStoreProduct(true);
        await receiveBatch(inventory.id, 1);
        // Two different carts (two different customers) racing for the same last unit - using
        // the same cart for both would also hit the "one ACTIVE reservation per cart" partial
        // unique index, masking whether the stock-availability constraint is what actually won.
        const cartA = await createCart(ownerUserId, storeId);
        const cartB = await createCart(ownerUserId, storeId);

        // Two independent connections, each trying to reserve the single remaining unit.
        const clientA = new PrismaClient({
            datasources: { db: { url: process.env.DATABASE_URL } },
        });
        const clientB = new PrismaClient({
            datasources: { db: { url: process.env.DATABASE_URL } },
        });

        const results = await Promise.allSettled([
            reserveFefo(
                clientA,
                inventory.id,
                1,
                { cart_id: cartA.id },
                new Date(Date.now() + 60_000),
            ),
            reserveFefo(
                clientB,
                inventory.id,
                1,
                { cart_id: cartB.id },
                new Date(Date.now() + 60_000),
            ),
        ]);

        await clientA.$disconnect();
        await clientB.$disconnect();

        const succeeded = results.filter((r) => r.status === 'fulfilled');
        const failed = results.filter((r) => r.status === 'rejected');
        expect(succeeded).toHaveLength(1);
        expect(failed).toHaveLength(1);

        const finalBatch = await adminPrisma.stockBatch.findFirstOrThrow({
            where: { inventory_id: inventory.id },
        });
        expect(finalBatch.reserved_quantity.toNumber()).toBe(1); // exactly one unit reserved, not two
    });
});
