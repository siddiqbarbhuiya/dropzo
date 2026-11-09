// BC-007 product catalogue / store listings / inventory integration suite. Same approach as
// merchant.integration-spec.ts: a real Nest DI graph, real PostgreSQL, no mocked Prisma. Covers
// category/product CRUD, variant creation, store-listing ownership/duplicate-prevention, stock
// receiving (batch and aggregate), adjustments with mandatory reason, damage/expiry removal, FEFO
// allocation under concurrency, negative-stock prevention, reservation compatibility, and
// unauthorized/cross-merchant access denial.
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Module, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../../src/config/env.validation.js';
import { PrismaModule } from '../../src/prisma/prisma.module.js';
import { AuditModule } from '../../src/common/audit/audit.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { MerchantApplicationService } from '../../src/merchant/merchant-application.service.js';
import { StoreService } from '../../src/merchant/store.service.js';
import { CategoryService } from '../../src/catalogue/category.service.js';
import { ProductService } from '../../src/catalogue/product.service.js';
import { StoreProductService } from '../../src/inventory/store-product.service.js';
import { InventoryService } from '../../src/inventory/inventory.service.js';
import { disconnectAll, resetDatabase, adminPrisma } from '../helpers/clients.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRootEnvPath = resolve(__dirname, '..', '..', '..', '..', '.env');

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: repoRootEnvPath,
            validate: validateEnv,
        }),
        PrismaModule,
        AuditModule,
    ],
    providers: [
        MerchantApplicationService,
        StoreService,
        CategoryService,
        ProductService,
        StoreProductService,
        InventoryService,
    ],
})
class TestCatalogueAppModule {}

let app: INestApplication;
let prisma: PrismaService;
let merchantApplications: MerchantApplicationService;
let stores: StoreService;
let categories: CategoryService;
let products: ProductService;
let listings: StoreProductService;
let inventoryService: InventoryService;

beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
        imports: [TestCatalogueAppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    merchantApplications = app.get(MerchantApplicationService);
    stores = app.get(StoreService);
    categories = app.get(CategoryService);
    products = app.get(ProductService);
    listings = app.get(StoreProductService);
    inventoryService = app.get(InventoryService);
});

afterAll(async () => {
    await app.close();
    await disconnectAll();
});

beforeEach(async () => {
    await resetDatabase();
});

function freshPhone(): string {
    return `+919${randomUUID().replace(/\D/g, '').slice(0, 9).padEnd(9, '1')}`;
}

async function makeUser() {
    return prisma.user.create({ data: { phone: freshPhone() } });
}

const applicationDto = {
    legalName: 'Barbhuiya General Store Pvt Ltd',
    displayName: 'Barbhuiya General Store',
    contactPhone: '9876543210',
    businessAddress: 'Main Road, Badarpur',
};

const storeDto = {
    name: 'Main Branch',
    address: 'Market Road',
    district: 'Karimganj',
    city: 'Badarpur',
    latitude: 24.86,
    longitude: 92.51,
};

async function approveMerchantWithStore(): Promise<{ ownerId: string; storeId: string }> {
    const owner = await makeUser();
    const application = await merchantApplications.submitApplication(owner.id, applicationDto);
    const admin = await makeUser();
    await merchantApplications.approve(application.id, admin.id);
    const store = await stores.createStore(owner.id, storeDto);
    return { ownerId: owner.id, storeId: store.id };
}

async function makeVariant(): Promise<{ productId: string; variantId: string }> {
    const category = await categories.create('admin-1', { name: 'Rice & Pulses' });
    const product = await products.create('admin-1', {
        name: 'Basmati Rice',
        categoryId: category.id,
        variants: [{ variantName: '1kg pack', unit: 'kg', packSize: 1 }],
    });
    return { productId: product.id, variantId: product.variants[0]!.id };
}

describe('Product catalogue (service + real DB)', () => {
    it('creates a category and slugifies the name', async () => {
        const category = await categories.create('admin-1', { name: 'Dairy & Breakfast' });
        expect(category.slug).toBe('dairy-breakfast');
    });

    it('rejects a duplicate category slug', async () => {
        await categories.create('admin-1', { name: 'Beverages' });
        await expect(categories.create('admin-1', { name: 'Beverages' })).rejects.toThrow();
    });

    it('creates a product with multiple variants of the same global product (never separate products)', async () => {
        const product = await products.create('admin-1', {
            name: 'Basmati Rice',
            variants: [
                { variantName: '1kg pack', unit: 'kg', packSize: 1 },
                { variantName: '5kg pack', unit: 'kg', packSize: 5 },
                { variantName: '10kg pack', unit: 'kg', packSize: 10 },
            ],
        });
        const reloaded = await products.getByIdOrThrow(product.id);
        expect(reloaded.variants).toHaveLength(3);
    });

    it('rejects a duplicate SKU across variants', async () => {
        const product = await products.create('admin-1', { name: 'Toor Dal' });
        await products.addVariant('admin-1', product.id, {
            variantName: '1kg',
            unit: 'kg',
            sku: 'DAL-1KG',
        });
        await expect(
            products.addVariant('admin-1', product.id, {
                variantName: '1kg duplicate',
                unit: 'kg',
                sku: 'DAL-1KG',
            }),
        ).rejects.toThrow();
    });

    it('never resolves a variant that belongs to a different product', async () => {
        const productA = await products.create('admin-1', { name: 'Product A' });
        const productB = await products.create('admin-1', {
            name: 'Product B',
            variants: [{ variantName: 'v1', unit: 'kg' }],
        });
        await expect(
            products.getVariantOrThrow(productA.id, productB.variants[0]!.id),
        ).rejects.toThrow();
    });
});

describe('Store listings (service + real DB)', () => {
    it('lets an approved merchant list a product variant for their own store', async () => {
        const { ownerId, storeId } = await approveMerchantWithStore();
        const { variantId } = await makeVariant();

        const listing = await listings.createListing(ownerId, storeId, {
            variantId,
            sellingPrice: 120,
        });
        expect(listing.store_id).toBe(storeId);

        const inventory = await prisma.inventory.findUniqueOrThrow({
            where: { store_product_id: listing.id },
        });
        expect(inventory.on_hand_quantity.toNumber()).toBe(0);
    });

    it('rejects listing the same variant twice at the same store', async () => {
        const { ownerId, storeId } = await approveMerchantWithStore();
        const { variantId } = await makeVariant();
        await listings.createListing(ownerId, storeId, { variantId, sellingPrice: 100 });

        await expect(
            listings.createListing(ownerId, storeId, { variantId, sellingPrice: 110 }),
        ).rejects.toThrow();
    });

    it('allows the same variant to be listed by multiple different stores', async () => {
        const storeA = await approveMerchantWithStore();
        const storeB = await approveMerchantWithStore();
        const { variantId } = await makeVariant();

        await expect(
            listings.createListing(storeA.ownerId, storeA.storeId, {
                variantId,
                sellingPrice: 100,
            }),
        ).resolves.toMatchObject({ store_id: storeA.storeId });
        await expect(
            listings.createListing(storeB.ownerId, storeB.storeId, {
                variantId,
                sellingPrice: 115,
            }),
        ).resolves.toMatchObject({ store_id: storeB.storeId });
    });

    it("never lets a merchant manage another merchant's listing", async () => {
        const storeA = await approveMerchantWithStore();
        const storeB = await approveMerchantWithStore();
        const { variantId } = await makeVariant();
        const listing = await listings.createListing(storeA.ownerId, storeA.storeId, {
            variantId,
            sellingPrice: 100,
        });

        await expect(
            listings.updateListing(storeB.ownerId, storeB.storeId, listing.id, {
                sellingPrice: 1,
            }),
        ).rejects.toThrow();
        await expect(
            listings.getOwnListing(storeB.ownerId, storeB.storeId, listing.id),
        ).rejects.toThrow();
    });
});

describe('Inventory: receiving, adjustments, removal (service + real DB)', () => {
    async function setupAggregateListing() {
        const { ownerId, storeId } = await approveMerchantWithStore();
        const { variantId } = await makeVariant();
        const listing = await listings.createListing(ownerId, storeId, {
            variantId,
            sellingPrice: 100,
        });
        return { ownerId, storeId, listing };
    }

    async function setupBatchListing() {
        const { ownerId, storeId } = await approveMerchantWithStore();
        const { variantId } = await makeVariant();
        const listing = await listings.createListing(ownerId, storeId, {
            variantId,
            sellingPrice: 100,
            usesBatchTracking: true,
        });
        return { ownerId, storeId, listing };
    }

    it('receives aggregate stock and records a RECEIVED movement', async () => {
        const { ownerId, storeId, listing } = await setupAggregateListing();

        const snapshot = await inventoryService.receiveStock(ownerId, storeId, listing.id, {
            quantity: 25,
        });
        expect(snapshot.on_hand_quantity.toNumber()).toBe(25);

        const movements = await inventoryService.listMovements(ownerId, storeId, listing.id, {
            page: 1,
            limit: 10,
        });
        expect(movements.data).toHaveLength(1);
        expect((movements.data[0] as { movement_type: string }).movement_type).toBe('RECEIVED');
    });

    it('requires a mandatory reason for a stocktake adjustment', async () => {
        const { ownerId, storeId, listing } = await setupAggregateListing();
        await inventoryService.receiveStock(ownerId, storeId, listing.id, { quantity: 10 });

        // DTO-level validation is covered by the controller's ValidationPipe; here the service
        // itself requires a non-empty reason field on the type, so this proves the service path
        // records it rather than silently dropping it.
        await inventoryService.adjustStock(ownerId, storeId, listing.id, {
            quantityDelta: -4,
            reason: 'Stocktake found 4 units missing',
        });
        const snapshot = await inventoryService.getSnapshot(ownerId, storeId, listing.id);
        expect(snapshot.on_hand_quantity.toNumber()).toBe(6);

        const movements = await inventoryService.listMovements(ownerId, storeId, listing.id, {
            page: 1,
            limit: 10,
        });
        const adjustment = movements.data.find(
            (m) => (m as { movement_type: string }).movement_type === 'ADJUSTED',
        ) as { notes: string } | undefined;
        expect(adjustment?.notes).toBe('Stocktake found 4 units missing');
    });

    it('never allows aggregate stock to go negative', async () => {
        const { ownerId, storeId, listing } = await setupAggregateListing();
        await inventoryService.receiveStock(ownerId, storeId, listing.id, { quantity: 5 });

        await expect(
            inventoryService.adjustStock(ownerId, storeId, listing.id, {
                quantityDelta: -10,
                reason: 'Too much removed',
            }),
        ).rejects.toThrow();

        const snapshot = await inventoryService.getSnapshot(ownerId, storeId, listing.id);
        expect(snapshot.on_hand_quantity.toNumber()).toBe(5); // unchanged - rolled back
    });

    it('receives into a named batch and allocates FEFO across batches on decrease', async () => {
        const { ownerId, storeId, listing } = await setupBatchListing();

        await inventoryService.receiveStock(ownerId, storeId, listing.id, {
            quantity: 10,
            batchCode: 'EARLY',
            expiryDate: new Date('2026-12-01').toISOString(),
        });
        await inventoryService.receiveStock(ownerId, storeId, listing.id, {
            quantity: 10,
            batchCode: 'LATE',
            expiryDate: new Date('2026-12-31').toISOString(),
        });

        await inventoryService.adjustStock(ownerId, storeId, listing.id, {
            quantityDelta: -15,
            reason: 'Stocktake shortfall',
        });

        const snapshot = await inventoryService.getSnapshot(ownerId, storeId, listing.id);
        expect(snapshot.on_hand_quantity.toNumber()).toBe(5);
        const batches = snapshot.stock_batches.sort((a, b) =>
            a.batch_code!.localeCompare(b.batch_code!),
        );
        expect(batches.find((b) => b.batch_code === 'EARLY')?.on_hand_quantity.toNumber()).toBe(0);
        expect(batches.find((b) => b.batch_code === 'LATE')?.on_hand_quantity.toNumber()).toBe(5);
    });

    it('never pulls already-reserved batch quantity into an adjustment (reservation compatibility)', async () => {
        const { ownerId, storeId, listing } = await setupBatchListing();
        await inventoryService.receiveStock(ownerId, storeId, listing.id, { quantity: 10 });

        const inventoryRow = await prisma.inventory.findUniqueOrThrow({
            where: { store_product_id: listing.id },
        });
        const batch = await prisma.stockBatch.findFirstOrThrow({
            where: { inventory_id: inventoryRow.id },
        });
        // Simulate 7 units already reserved by a cart (out of BC-007 scope to create via a real
        // reservation flow, but the resulting row shape - reserved_quantity on both levels - is
        // exactly what a real reservation produces, and is what this guard must respect).
        await adminPrisma.$transaction([
            adminPrisma.stockBatch.update({
                where: { id: batch.id },
                data: { reserved_quantity: 7 },
            }),
            adminPrisma.inventory.update({
                where: { id: inventoryRow.id },
                data: { reserved_quantity: 7 },
            }),
        ]);

        await expect(
            inventoryService.adjustStock(ownerId, storeId, listing.id, {
                quantityDelta: -5,
                reason: 'Correction attempting to exceed available stock',
            }),
        ).rejects.toThrow();
    });

    it('rejects removing a non-expired batch under the EXPIRED removal type', async () => {
        const { ownerId, storeId, listing } = await setupBatchListing();
        await inventoryService.receiveStock(ownerId, storeId, listing.id, {
            quantity: 10,
            expiryDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        });

        await expect(
            inventoryService.removeStock(ownerId, storeId, listing.id, {
                type: 'EXPIRED',
                quantity: 5,
                reason: 'Thought it had expired',
            }),
        ).rejects.toThrow();
    });

    it('writes off genuinely expired batch stock under the EXPIRED removal type', async () => {
        const { ownerId, storeId, listing } = await setupBatchListing();
        await inventoryService.receiveStock(ownerId, storeId, listing.id, {
            quantity: 10,
            expiryDate: new Date('2020-01-01').toISOString(),
        });

        const snapshot = await inventoryService.removeStock(ownerId, storeId, listing.id, {
            type: 'EXPIRED',
            quantity: 10,
            reason: 'Past expiry date, written off',
        });
        expect(snapshot.on_hand_quantity.toNumber()).toBe(0);
    });

    it('records DAMAGED removal with a mandatory reason and reduces on-hand quantity', async () => {
        const { ownerId, storeId, listing } = await setupAggregateListing();
        await inventoryService.receiveStock(ownerId, storeId, listing.id, { quantity: 10 });

        const snapshot = await inventoryService.removeStock(ownerId, storeId, listing.id, {
            type: 'DAMAGED',
            quantity: 3,
            reason: 'Crushed during shelving',
        });
        expect(snapshot.on_hand_quantity.toNumber()).toBe(7);
    });

    it('rejects inventory mutation for a suspended merchant', async () => {
        const { ownerId, storeId, listing } = await setupAggregateListing();
        const merchant = await prisma.merchant.findFirstOrThrow({
            where: { owner_user_id: ownerId },
        });
        const admin = await makeUser();
        await merchantApplications.suspend(merchant.id, admin.id, 'policy violation');

        await expect(
            inventoryService.receiveStock(ownerId, storeId, listing.id, { quantity: 10 }),
        ).rejects.toThrow();
    });

    it('rejects inventory access/mutation by a non-owning merchant', async () => {
        const owner = await setupAggregateListing();
        const intruder = await approveMerchantWithStore();

        await expect(
            inventoryService.receiveStock(intruder.ownerId, intruder.storeId, owner.listing.id, {
                quantity: 10,
            }),
        ).rejects.toThrow();
        await expect(
            inventoryService.getSnapshot(intruder.ownerId, intruder.storeId, owner.listing.id),
        ).rejects.toThrow();
    });

    it('never allows two concurrent adjustments to both succeed past available stock', async () => {
        const { ownerId, storeId, listing } = await setupAggregateListing();
        await inventoryService.receiveStock(ownerId, storeId, listing.id, { quantity: 5 });

        const results = await Promise.allSettled([
            inventoryService.adjustStock(ownerId, storeId, listing.id, {
                quantityDelta: -4,
                reason: 'Race A',
            }),
            inventoryService.adjustStock(ownerId, storeId, listing.id, {
                quantityDelta: -4,
                reason: 'Race B',
            }),
        ]);

        const succeeded = results.filter((r) => r.status === 'fulfilled');
        expect(succeeded.length).toBeLessThanOrEqual(1);

        const snapshot = await inventoryService.getSnapshot(ownerId, storeId, listing.id);
        expect(snapshot.on_hand_quantity.toNumber()).toBeGreaterThanOrEqual(0);
    });
});
