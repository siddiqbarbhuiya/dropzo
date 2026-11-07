// Shared Prisma clients for the integration suite.
//
// `adminPrisma` connects as the Postgres superuser (DATABASE_URL) - used for fixture setup and
// for every check except the one that specifically verifies the restricted role's own
// permissions. `appPrisma` connects as the restricted `dropzo_app` role (APP_DATABASE_URL) -
// the same role the running API uses at runtime (see src/prisma/prisma.service.ts) - used only
// where a test's whole point is to prove that role's restrictions actually apply.
//
// Requires .env.test (copied from .env.test.example) to point at the separate dropzo_test
// database, and that database to already be migrated - see DEVELOPMENT-SETUP.md.
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
    throw new Error(
        'DATABASE_URL is not set - run the integration suite via `npm run test:integration` ' +
            '(apps/api/package.json), which loads .env.test automatically.',
    );
}

// Defence in depth against ever running this suite's TRUNCATE-heavy resetDatabase() against a
// real development database: fail loudly at startup, before any connection is made, unless the
// target database name is unambiguously the test one.
const targetDatabase = new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '');
if (!targetDatabase.endsWith('_test')) {
    throw new Error(
        `Refusing to run the integration suite against database "${targetDatabase}" - its name ` +
            'does not end in "_test". This suite truncates every table on every test; it must ' +
            'only ever run via `npm run test:integration`, which loads .env.test (dropzo_test), ' +
            'never .env (dropzo).',
    );
}

export const adminPrisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
});

export const appPrisma = new PrismaClient({
    datasources: { db: { url: process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL } },
});

// Every MVP table, in an FK-safe order for TRUNCATE ... CASCADE (CASCADE makes the explicit
// order mostly a documentation aid rather than a strict requirement, but listing children before
// parents keeps this readable and keeps CASCADE's effect minimal/obvious).
const ALL_TABLES = [
    'otp_challenges',
    'outbox_events',
    'notification_devices',
    'notifications',
    'audit_logs',
    'idempotency_records',
    'complaints',
    'settlement_items',
    'settlements',
    'ledger_entries',
    'ledger_transactions',
    'financial_accounts',
    'delivery_events',
    'delivery_assignments',
    'delivery_partners',
    'pickup_verifications',
    'refunds',
    'payment_webhook_events',
    'payment_status_history',
    'payments',
    'order_status_history',
    'order_items',
    'orders',
    'stock_reservation_items',
    'stock_reservations',
    'cart_items',
    'carts',
    'stock_movements',
    'stock_batches',
    'inventory',
    'store_products',
    'product_variants',
    'products',
    'categories',
    'service_zones',
    'stores',
    'merchant_staff',
    'merchants',
    'user_addresses',
    'user_sessions',
    'user_roles',
    'users',
] as const;

/** Truncates every MVP table. Call between test files (or in beforeEach) for isolation. */
export async function resetDatabase(): Promise<void> {
    const tableList = ALL_TABLES.map((t) => `"${t}"`).join(', ');
    await adminPrisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`);
}

export async function disconnectAll(): Promise<void> {
    await adminPrisma.$disconnect();
    await appPrisma.$disconnect();
}
