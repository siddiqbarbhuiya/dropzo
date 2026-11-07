// Database integrity checks (BC-004-IMPLEMENTATION-PLAN.md Stage 9, "Database integrity and
// concurrency tests") - every MVP table exists, FKs/unique/CHECK constraints and the two partial
// unique indexes actually reject bad data. Requires a migrated dropzo_test database - see
// DEVELOPMENT-SETUP.md.
import { randomUUID } from 'node:crypto';
import { adminPrisma, disconnectAll, resetDatabase } from '../helpers/clients.js';

const EXPECTED_TABLES = [
    'users',
    'user_roles',
    'user_sessions',
    'user_addresses',
    'merchants',
    'merchant_staff',
    'stores',
    'service_zones',
    'categories',
    'products',
    'product_variants',
    'store_products',
    'inventory',
    'stock_batches',
    'stock_movements',
    'carts',
    'cart_items',
    'stock_reservations',
    'stock_reservation_items',
    'orders',
    'order_items',
    'order_status_history',
    'payments',
    'payment_status_history',
    'payment_webhook_events',
    'refunds',
    'pickup_verifications',
    'delivery_partners',
    'delivery_assignments',
    'delivery_events',
    'financial_accounts',
    'ledger_transactions',
    'ledger_entries',
    'settlements',
    'settlement_items',
    'notifications',
    'notification_devices',
    'complaints',
    'audit_logs',
    'idempotency_records',
    'outbox_events',
];

async function createUser() {
    return adminPrisma.user.create({ data: { phone: `+91${randomUUID().slice(0, 9)}` } });
}

describe('schema integrity', () => {
    afterAll(async () => {
        await disconnectAll();
    });

    beforeEach(async () => {
        await resetDatabase();
    });

    it('has exactly the 41 MVP-required tables (coupons/coupon_redemptions excluded)', async () => {
        expect(EXPECTED_TABLES).toHaveLength(41);
        const rows = await adminPrisma.$queryRaw<Array<{ table_name: string }>>`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `;
        const tableNames = rows.map((r) => r.table_name);
        for (const table of EXPECTED_TABLES) {
            expect(tableNames).toContain(table);
        }
        expect(tableNames).not.toContain('coupons');
        expect(tableNames).not.toContain('coupon_redemptions');
    });

    it('rejects an insert that violates a foreign key', async () => {
        await expect(
            adminPrisma.merchant.create({
                data: {
                    owner_user_id: randomUUID(),
                    legal_name: 'x',
                    display_name: 'x',
                    contact_phone: '1',
                    business_address: 'x',
                },
            }),
        ).rejects.toThrow();
    });

    it('rejects a duplicate on an ordinary unique constraint (users.phone)', async () => {
        await adminPrisma.user.create({ data: { phone: '+919111111111' } });
        await expect(
            adminPrisma.user.create({ data: { phone: '+919111111111' } }),
        ).rejects.toThrow();
    });

    it('rejects a CHECK violation (store_products.selling_price >= 0)', async () => {
        const owner = await createUser();
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

        await expect(
            adminPrisma.storeProduct.create({
                data: { store_id: storeId, variant_id: variant.id, selling_price: -1 },
            }),
        ).rejects.toThrow();
    });

    it('allows at most one ACTIVE stock_reservation per cart (partial unique index)', async () => {
        const user = await createUser();
        const owner = await createUser();
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
        const cart = await adminPrisma.cart.create({
            data: { user_id: user.id, store_id: storeId },
        });

        await adminPrisma.stockReservation.create({
            data: { cart_id: cart.id, expires_at: new Date(Date.now() + 60_000) },
        });

        await expect(
            adminPrisma.stockReservation.create({
                data: { cart_id: cart.id, expires_at: new Date(Date.now() + 60_000) },
            }),
        ).rejects.toThrow();
    });

    it('rejects a second platform-owned financial_account of the same type (NULL-merchant partial unique index)', async () => {
        await adminPrisma.financialAccount.create({
            data: { account_type: 'PLATFORM_CASH', owner_type: 'PLATFORM', merchant_id: null },
        });
        await expect(
            adminPrisma.financialAccount.create({
                data: { account_type: 'PLATFORM_CASH', owner_type: 'PLATFORM', merchant_id: null },
            }),
        ).rejects.toThrow();
    });
});
