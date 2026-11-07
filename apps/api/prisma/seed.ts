// Deterministic development seed (BC-004, DATABASE-DESIGN.md Stage 5).
// Safe to rerun: every write is an upsert keyed by a natural unique column, never a raw insert,
// so running this twice produces the same rows instead of duplicates or errors. Seeds no
// ledger_transactions/ledger_entries - only the platform's chart-of-accounts rows - so there is
// no risk of an unbalanced financial transaction (see DATABASE-DESIGN.md's "Financial accounting
// model"). Contains no real customer data and no real credentials.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
    // --- Platform configuration: the fixed chart of accounts (see DATABASE-DESIGN.md's
    // "Financial accounting model"). All four are platform-owned (merchant_id NULL).
    const platformAccountTypes = [
        'PLATFORM_COMMISSION_REVENUE',
        'PLATFORM_DELIVERY_REVENUE',
        'COD_CASH_CLEARING',
        'PLATFORM_CASH',
    ] as const;

    // A plain WHERE merchant_id = NULL never matches in SQL (NULL is never equal to NULL), so
    // the compound-unique upsert shortcut cannot key on these rows - find-then-create instead.
    for (const account_type of platformAccountTypes) {
        const existing = await prisma.financialAccount.findFirst({
            where: { account_type, merchant_id: null },
        });
        if (!existing) {
            await prisma.financialAccount.create({
                data: { account_type, owner_type: 'PLATFORM', merchant_id: null },
            });
        }
    }

    // --- Location
    const zone = await prisma.serviceZone.upsert({
        where: { id: '00000000-0000-0000-0000-000000000001' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'Badarpur',
            city: 'Badarpur',
            state: 'Assam',
            max_delivery_radius_km: 5,
        },
    });

    // --- Catalogue
    const groceries = await prisma.category.upsert({
        where: { slug: 'groceries' },
        update: {},
        create: { name: 'Groceries', slug: 'groceries' },
    });
    const dairyBakery = await prisma.category.upsert({
        where: { slug: 'dairy-bakery' },
        update: {},
        create: { name: 'Dairy & Bakery', slug: 'dairy-bakery', parent_id: groceries.id },
    });

    const milk = await prisma.product.upsert({
        where: { id: '00000000-0000-0000-0000-000000000101' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000101',
            category_id: dairyBakery.id,
            name: 'Amul Toned Milk',
            brand: 'Amul',
            is_food: true,
            storage_type: 'REFRIGERATED',
        },
    });
    const milkVariant = await prisma.productVariant.upsert({
        where: { sku: 'AMUL-MILK-500ML' },
        update: {},
        create: {
            product_id: milk.id,
            sku: 'AMUL-MILK-500ML',
            variant_name: '500 ml',
            unit: 'ml',
            pack_size: 500,
        },
    });

    const biscuit = await prisma.product.upsert({
        where: { id: '00000000-0000-0000-0000-000000000102' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000102',
            category_id: groceries.id,
            name: 'Parle-G Biscuits',
            brand: 'Parle',
            is_food: true,
            storage_type: 'AMBIENT',
        },
    });
    const biscuitVariant = await prisma.productVariant.upsert({
        where: { sku: 'PARLE-G-100G' },
        update: {},
        create: {
            product_id: biscuit.id,
            sku: 'PARLE-G-100G',
            variant_name: '100 g',
            unit: 'g',
            pack_size: 100,
        },
    });

    // --- Identity
    const merchantOwner = await prisma.user.upsert({
        where: { phone: '+919000000001' },
        update: {},
        create: { phone: '+919000000001', full_name: 'Badarpur Kirana Owner', is_active: true },
    });
    await prisma.userRole.upsert({
        where: { user_id_role: { user_id: merchantOwner.id, role: 'MERCHANT_OWNER' } },
        update: {},
        create: { user_id: merchantOwner.id, role: 'MERCHANT_OWNER' },
    });

    const customer = await prisma.user.upsert({
        where: { phone: '+919000000002' },
        update: {},
        create: { phone: '+919000000002', full_name: 'Test Customer', is_active: true },
    });
    await prisma.userRole.upsert({
        where: { user_id_role: { user_id: customer.id, role: 'CUSTOMER' } },
        update: {},
        create: { user_id: customer.id, role: 'CUSTOMER' },
    });

    // --- Merchant and its financial account
    const merchant = await prisma.merchant.upsert({
        where: { id: '00000000-0000-0000-0000-000000000201' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000201',
            owner_user_id: merchantOwner.id,
            legal_name: 'Badarpur Kirana Stores Pvt Ltd',
            display_name: 'Badarpur Kirana',
            contact_phone: '+919000000001',
            business_address: 'Main Road, Badarpur, Sribhumi, Assam',
            verification_status: 'VERIFIED',
        },
    });
    await prisma.financialAccount.upsert({
        where: {
            account_type_merchant_id: {
                account_type: 'MERCHANT_PAYABLE',
                merchant_id: merchant.id,
            },
        },
        update: {},
        create: {
            account_type: 'MERCHANT_PAYABLE',
            owner_type: 'MERCHANT',
            merchant_id: merchant.id,
        },
    });

    // --- Store
    // stores.location is NOT NULL, and Prisma Client cannot write an Unsupported("geography")
    // column at all (it is excluded from the generated create/update input entirely, not merely
    // defaulted) - the whole row is inserted via raw SQL instead of prisma.store.upsert().
    const storeId = '00000000-0000-0000-0000-000000000301';
    await prisma.$executeRaw`
        INSERT INTO "stores" (
            "id", "merchant_id", "name", "address", "district", "city",
            "location", "status", "supports_pickup", "supports_delivery"
        ) VALUES (
            ${storeId}::uuid, ${merchant.id}::uuid, 'Badarpur Kirana - Main Road',
            'Main Road, Badarpur, Sribhumi, Assam', 'Sribhumi', 'Badarpur',
            ST_SetSRID(ST_MakePoint(92.5986, 24.8663), 4326)::geography,
            'ACTIVE', true, false
        )
        ON CONFLICT ("id") DO NOTHING
    `;
    const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });

    // --- Store listings and inventory
    const milkListing = await prisma.storeProduct.upsert({
        where: { store_id_variant_id: { store_id: store.id, variant_id: milkVariant.id } },
        update: {},
        create: {
            store_id: store.id,
            variant_id: milkVariant.id,
            owner_type: 'MERCHANT',
            uses_batch_tracking: true,
            selling_price: 32.0,
            mrp: 34.0,
        },
    });
    const milkInventory = await prisma.inventory.upsert({
        where: { store_product_id: milkListing.id },
        update: {},
        create: {
            store_product_id: milkListing.id,
            on_hand_quantity: 50,
            low_stock_threshold: 10,
        },
    });
    await prisma.stockBatch.upsert({
        where: { id: '00000000-0000-0000-0000-000000000401' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000401',
            inventory_id: milkInventory.id,
            batch_code: 'SEED-BATCH-001',
            received_quantity: 50,
            on_hand_quantity: 50,
            expiry_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
    });

    const biscuitListing = await prisma.storeProduct.upsert({
        where: { store_id_variant_id: { store_id: store.id, variant_id: biscuitVariant.id } },
        update: {},
        create: {
            store_id: store.id,
            variant_id: biscuitVariant.id,
            owner_type: 'MERCHANT',
            uses_batch_tracking: false,
            selling_price: 10.0,
            mrp: 10.0,
        },
    });
    await prisma.inventory.upsert({
        where: { store_product_id: biscuitListing.id },
        update: {},
        create: {
            store_product_id: biscuitListing.id,
            on_hand_quantity: 200,
            low_stock_threshold: 20,
        },
    });

    console.log('Seed complete:', {
        service_zone: zone.name,
        categories: [groceries.slug, dairyBakery.slug],
        merchant: merchant.display_name,
        store: store.name,
        listings: [milkListing.id, biscuitListing.id],
        users: [merchantOwner.phone, customer.phone],
    });
}

main()
    .catch((error: unknown) => {
        console.error('Seed failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
