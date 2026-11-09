// BC-008 customer cart / checkout / stock reservation / COD order creation integration suite.
// Same approach as the BC-006/BC-007 suites: a real Nest DI graph, real PostgreSQL, no mocked
// Prisma. Covers cart CRUD and cross-store rejection, checkout price/stock validation, COD order
// creation with immutable price snapshots, idempotency (replay, conflict, concurrent dedup), FEFO
// reservation (including expired-batch exclusion and final-unit concurrency), reservation expiry
// release, and cross-customer access denial.
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Module, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../../src/config/env.validation.js';
import { PrismaModule } from '../../src/prisma/prisma.module.js';
import { AuditModule } from '../../src/common/audit/audit.module.js';
import { IdempotencyModule } from '../../src/common/idempotency/idempotency.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { MerchantApplicationService } from '../../src/merchant/merchant-application.service.js';
import { StoreService } from '../../src/merchant/store.service.js';
import { CategoryService } from '../../src/catalogue/category.service.js';
import { ProductService } from '../../src/catalogue/product.service.js';
import { InventoryModule } from '../../src/inventory/inventory.module.js';
import { StoreProductService } from '../../src/inventory/store-product.service.js';
import { InventoryService } from '../../src/inventory/inventory.service.js';
import { ReservationService } from '../../src/inventory/reservation.service.js';
import { CartModule } from '../../src/cart/cart.module.js';
import { CartService } from '../../src/cart/cart.service.js';
import { CheckoutModule } from '../../src/checkout/checkout.module.js';
import { CheckoutService } from '../../src/checkout/checkout.service.js';
import { OrdersModule } from '../../src/orders/orders.module.js';
import { OrdersService } from '../../src/orders/orders.service.js';
import { disconnectAll, resetDatabase } from '../helpers/clients.js';

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
        IdempotencyModule,
        InventoryModule,
        CartModule,
        CheckoutModule,
        OrdersModule,
    ],
    providers: [MerchantApplicationService, StoreService, CategoryService, ProductService],
})
class TestCommerceAppModule {}

let app: INestApplication;
let prisma: PrismaService;
let merchantApplications: MerchantApplicationService;
let stores: StoreService;
let categories: CategoryService;
let products: ProductService;
let listings: StoreProductService;
let inventoryService: InventoryService;
let reservations: ReservationService;
let cart: CartService;
let checkout: CheckoutService;
let orders: OrdersService;

beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
        imports: [TestCommerceAppModule],
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
    reservations = app.get(ReservationService);
    cart = app.get(CartService);
    checkout = app.get(CheckoutService);
    orders = app.get(OrdersService);
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

async function makeCustomer() {
    const user = await prisma.user.create({ data: { phone: freshPhone() } });
    await prisma.userRole.create({ data: { user_id: user.id, role: 'CUSTOMER' } });
    return user;
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
    supportsDelivery: true,
};

async function makeStoreWithListing(
    opts: { usesBatchTracking?: boolean; sellingPrice?: number } = {},
) {
    const owner = await prisma.user.create({ data: { phone: freshPhone() } });
    const application = await merchantApplications.submitApplication(owner.id, applicationDto);
    const admin = await prisma.user.create({ data: { phone: freshPhone() } });
    await merchantApplications.approve(application.id, admin.id);
    const store = await stores.createStore(owner.id, storeDto);
    await stores.updateStatusByAdmin(store.id, 'ACTIVE', admin.id);

    const category = await categories.create(admin.id, { name: 'Rice & Pulses' });
    const product = await products.create(admin.id, {
        name: 'Basmati Rice',
        categoryId: category.id,
        variants: [
            { variantName: '1kg pack', unit: 'kg', packSize: 1, sku: `SKU-${randomUUID()}` },
        ],
    });
    const variantId = product.variants[0]!.id;
    const listing = await listings.createListing(owner.id, store.id, {
        variantId,
        sellingPrice: opts.sellingPrice ?? 100,
        usesBatchTracking: opts.usesBatchTracking ?? false,
    });
    return { owner, store, listing, variantId };
}

async function receive(
    ownerId: string,
    storeId: string,
    listingId: string,
    quantity: number,
    expiryDate?: string,
) {
    return inventoryService.receiveStock(ownerId, storeId, listingId, { quantity, expiryDate });
}

describe('Cart (service + real DB)', () => {
    it('creates a cart on first add, and prices it from authoritative data', async () => {
        const customer = await makeCustomer();
        const { store, owner, listing } = await makeStoreWithListing();
        await receive(owner.id, store.id, listing.id, 10);

        const summary = await cart.addItem(customer.id, {
            storeProductId: listing.id,
            quantity: 2,
        });
        expect(summary.storeId).toBe(store.id);
        expect(summary.subtotal).toBe(200);
        expect(summary.isValid).toBe(true);
    });

    it('increments quantity on a duplicate add, and updateItem sets an absolute amount', async () => {
        const customer = await makeCustomer();
        const { store, owner, listing } = await makeStoreWithListing();
        await receive(owner.id, store.id, listing.id, 10);

        await cart.addItem(customer.id, { storeProductId: listing.id, quantity: 2 });
        const afterDuplicate = await cart.addItem(customer.id, {
            storeProductId: listing.id,
            quantity: 3,
        });
        expect(afterDuplicate.items[0]!.quantity).toBe(5);

        const itemId = afterDuplicate.items[0]!.cartItemId;
        const afterUpdate = await cart.updateItemQuantity(customer.id, itemId, { quantity: 1 });
        expect(afterUpdate.items[0]!.quantity).toBe(1);
    });

    it('rejects adding an item from a different store with a clear conflict, never a silent merge', async () => {
        const customer = await makeCustomer();
        const storeA = await makeStoreWithListing();
        const storeB = await makeStoreWithListing();
        await receive(storeA.owner.id, storeA.store.id, storeA.listing.id, 10);
        await receive(storeB.owner.id, storeB.store.id, storeB.listing.id, 10);

        await cart.addItem(customer.id, { storeProductId: storeA.listing.id, quantity: 1 });
        await expect(
            cart.addItem(customer.id, { storeProductId: storeB.listing.id, quantity: 1 }),
        ).rejects.toThrow();
    });

    it('removing the last item frees the cart to start fresh with a different store', async () => {
        const customer = await makeCustomer();
        const storeA = await makeStoreWithListing();
        const storeB = await makeStoreWithListing();
        await receive(storeA.owner.id, storeA.store.id, storeA.listing.id, 10);
        await receive(storeB.owner.id, storeB.store.id, storeB.listing.id, 10);

        const added = await cart.addItem(customer.id, {
            storeProductId: storeA.listing.id,
            quantity: 1,
        });
        await cart.removeItem(customer.id, added.items[0]!.cartItemId);

        await expect(
            cart.addItem(customer.id, { storeProductId: storeB.listing.id, quantity: 1 }),
        ).resolves.toMatchObject({ storeId: storeB.store.id });
    });
});

describe('Checkout and order creation (service + real DB)', () => {
    it('creates a COD order, reserves stock, and transitions the cart to CHECKED_OUT', async () => {
        const customer = await makeCustomer();
        const { store, owner, listing } = await makeStoreWithListing();
        await receive(owner.id, store.id, listing.id, 10);
        await cart.addItem(customer.id, { storeProductId: listing.id, quantity: 2 });

        const preview = await checkout.prepare(customer.id, { fulfilmentType: 'PICKUP' });
        expect(preview.isReadyForCheckout).toBe(true);

        const order = await checkout.createOrder(
            customer.id,
            { fulfilmentType: 'PICKUP', expectedTotalAmount: preview.totalAmount },
            `key-${randomUUID()}`,
        );
        expect(order.payment_method).toBe('COD');
        expect(order.status).toBe('CREATED');

        const inventory = await prisma.inventory.findUniqueOrThrow({
            where: { store_product_id: listing.id },
        });
        expect(inventory.reserved_quantity.toNumber()).toBe(2);

        const checkedOutCart = await prisma.cart.findFirst({ where: { user_id: customer.id } });
        expect(checkedOutCart?.status).toBe('CHECKED_OUT');
    });

    it('rejects checkout when the price has changed since the customer last viewed the cart', async () => {
        const customer = await makeCustomer();
        const { store, owner, listing } = await makeStoreWithListing();
        await receive(owner.id, store.id, listing.id, 10);
        await cart.addItem(customer.id, { storeProductId: listing.id, quantity: 1 });

        await expect(
            checkout.createOrder(
                customer.id,
                { fulfilmentType: 'PICKUP', expectedTotalAmount: 1 },
                `key-${randomUUID()}`,
            ),
        ).rejects.toThrow();
    });

    it('rejects checkout when stock is insufficient, leaving inventory untouched', async () => {
        const customer = await makeCustomer();
        const { store, owner, listing } = await makeStoreWithListing();
        await receive(owner.id, store.id, listing.id, 1);
        const preview0 = await cart.addItem(customer.id, {
            storeProductId: listing.id,
            quantity: 5,
        });

        await expect(
            checkout.createOrder(
                customer.id,
                { fulfilmentType: 'PICKUP', expectedTotalAmount: preview0.totalAmount },
                `key-${randomUUID()}`,
            ),
        ).rejects.toThrow();

        const inventory = await prisma.inventory.findUniqueOrThrow({
            where: { store_product_id: listing.id },
        });
        expect(inventory.reserved_quantity.toNumber()).toBe(0);
        expect(inventory.on_hand_quantity.toNumber()).toBe(1);
        // Rolled back entirely - no partial order left behind either.
        const orderCount = await prisma.order.count({ where: { customer_id: customer.id } });
        expect(orderCount).toBe(0);
    });

    it("keeps an order's price snapshot unchanged after the catalogue price later changes", async () => {
        const customer = await makeCustomer();
        const { store, owner, listing } = await makeStoreWithListing({ sellingPrice: 100 });
        await receive(owner.id, store.id, listing.id, 10);
        const preview = await cart.addItem(customer.id, {
            storeProductId: listing.id,
            quantity: 1,
        });

        const order = await checkout.createOrder(
            customer.id,
            { fulfilmentType: 'PICKUP', expectedTotalAmount: preview.totalAmount },
            `key-${randomUUID()}`,
        );

        await prisma.storeProduct.update({
            where: { id: listing.id },
            data: { selling_price: 500 },
        });

        const reloaded = await orders.getOwnOrder(customer.id, order.id);
        const item = (
            reloaded as unknown as { items: Array<{ unit_price: { toNumber(): number } }> }
        ).items[0]!;
        expect(item.unit_price.toNumber()).toBe(100);
    });

    it('replays the original order for a duplicate idempotency-key request with the same body', async () => {
        const customer = await makeCustomer();
        const { store, owner, listing } = await makeStoreWithListing();
        await receive(owner.id, store.id, listing.id, 10);
        const preview = await cart.addItem(customer.id, {
            storeProductId: listing.id,
            quantity: 1,
        });
        const dto = { fulfilmentType: 'PICKUP' as const, expectedTotalAmount: preview.totalAmount };
        const key = `key-${randomUUID()}`;

        const first = await checkout.createOrder(customer.id, dto, key);
        const second = await checkout.createOrder(customer.id, dto, key);
        expect(second.id).toBe(first.id);

        const orderCount = await prisma.order.count({ where: { customer_id: customer.id } });
        expect(orderCount).toBe(1);
    });

    it('rejects the same idempotency key reused with a different request body', async () => {
        const customer = await makeCustomer();
        const { store, owner, listing } = await makeStoreWithListing();
        await receive(owner.id, store.id, listing.id, 10);
        const preview = await cart.addItem(customer.id, {
            storeProductId: listing.id,
            quantity: 1,
        });
        const key = `key-${randomUUID()}`;

        await checkout.createOrder(
            customer.id,
            { fulfilmentType: 'PICKUP', expectedTotalAmount: preview.totalAmount },
            key,
        );
        await expect(
            checkout.createOrder(
                customer.id,
                { fulfilmentType: 'DELIVERY', expectedTotalAmount: preview.totalAmount },
                key,
            ),
        ).rejects.toThrow();
    });

    it('creates only one order under concurrent duplicate requests with the same idempotency key', async () => {
        const customer = await makeCustomer();
        const { store, owner, listing } = await makeStoreWithListing();
        await receive(owner.id, store.id, listing.id, 10);
        const preview = await cart.addItem(customer.id, {
            storeProductId: listing.id,
            quantity: 1,
        });
        const dto = { fulfilmentType: 'PICKUP' as const, expectedTotalAmount: preview.totalAmount };
        const key = `key-${randomUUID()}`;

        const results = await Promise.allSettled([
            checkout.createOrder(customer.id, dto, key),
            checkout.createOrder(customer.id, dto, key),
        ]);
        const succeeded = results.filter((r) => r.status === 'fulfilled');
        expect(succeeded.length).toBeGreaterThanOrEqual(1);

        const orderCount = await prisma.order.count({ where: { customer_id: customer.id } });
        expect(orderCount).toBe(1);
    });

    it("never lets a customer access another customer's cart or order", async () => {
        const customerA = await makeCustomer();
        const customerB = await makeCustomer();
        const { store, owner, listing } = await makeStoreWithListing();
        await receive(owner.id, store.id, listing.id, 10);
        const preview = await cart.addItem(customerA.id, {
            storeProductId: listing.id,
            quantity: 1,
        });
        const orderA = await checkout.createOrder(
            customerA.id,
            { fulfilmentType: 'PICKUP', expectedTotalAmount: preview.totalAmount },
            `key-${randomUUID()}`,
        );

        await expect(orders.getOwnOrder(customerB.id, orderA.id)).rejects.toThrow();
        const bCart = await cart.getActiveCart(customerB.id);
        expect(bCart.cartId).toBeNull();
    });

    it('prevents new checkout once the store becomes inactive', async () => {
        const customer = await makeCustomer();
        const { store, owner, listing } = await makeStoreWithListing();
        await receive(owner.id, store.id, listing.id, 10);
        const preview = await cart.addItem(customer.id, {
            storeProductId: listing.id,
            quantity: 1,
        });

        const admin = await prisma.user.create({ data: { phone: freshPhone() } });
        await stores.updateStatusByAdmin(store.id, 'SUSPENDED', admin.id);

        await expect(
            checkout.createOrder(
                customer.id,
                { fulfilmentType: 'PICKUP', expectedTotalAmount: preview.totalAmount },
                `key-${randomUUID()}`,
            ),
        ).rejects.toThrow();
    });

    it('validates pickup and delivery independently - rejecting delivery while pickup still succeeds', async () => {
        const customer = await makeCustomer();
        const { store, owner, listing } = await makeStoreWithListing();
        await receive(owner.id, store.id, listing.id, 10);
        await cart.addItem(customer.id, { storeProductId: listing.id, quantity: 1 });

        const deliveryPreview = await checkout.prepare(customer.id, { fulfilmentType: 'DELIVERY' });
        expect(deliveryPreview.isReadyForCheckout).toBe(false);

        const pickupPreview = await checkout.prepare(customer.id, { fulfilmentType: 'PICKUP' });
        expect(pickupPreview.isReadyForCheckout).toBe(true);
    });

    it('two customers competing for the final available unit: only one succeeds', async () => {
        const customerA = await makeCustomer();
        const customerB = await makeCustomer();
        const { store, owner, listing } = await makeStoreWithListing();
        await receive(owner.id, store.id, listing.id, 1);

        const previewA = await cart.addItem(customerA.id, {
            storeProductId: listing.id,
            quantity: 1,
        });
        const previewB = await cart.addItem(customerB.id, {
            storeProductId: listing.id,
            quantity: 1,
        });

        const results = await Promise.allSettled([
            checkout.createOrder(
                customerA.id,
                { fulfilmentType: 'PICKUP', expectedTotalAmount: previewA.totalAmount },
                `key-${randomUUID()}`,
            ),
            checkout.createOrder(
                customerB.id,
                { fulfilmentType: 'PICKUP', expectedTotalAmount: previewB.totalAmount },
                `key-${randomUUID()}`,
            ),
        ]);
        const succeeded = results.filter((r) => r.status === 'fulfilled');
        const failed = results.filter((r) => r.status === 'rejected');
        expect(succeeded).toHaveLength(1);
        expect(failed).toHaveLength(1);

        const inventory = await prisma.inventory.findUniqueOrThrow({
            where: { store_product_id: listing.id },
        });
        expect(inventory.reserved_quantity.toNumber()).toBe(1);
    });

    it('allocates a batch-tracked order via FEFO, excluding expired batches', async () => {
        const customer = await makeCustomer();
        const { store, owner, listing } = await makeStoreWithListing({ usesBatchTracking: true });
        await receive(owner.id, store.id, listing.id, 5, '2020-01-01'); // already expired
        await receive(owner.id, store.id, listing.id, 5, '2026-12-01');

        const preview = await cart.addItem(customer.id, {
            storeProductId: listing.id,
            quantity: 3,
        });
        await checkout.createOrder(
            customer.id,
            { fulfilmentType: 'PICKUP', expectedTotalAmount: preview.totalAmount },
            `key-${randomUUID()}`,
        );

        const snapshotBatches = await prisma.stockBatch.findMany({
            where: { inventory: { store_product_id: listing.id } },
            orderBy: { expiry_date: 'asc' },
        });
        const expiredBatch = snapshotBatches.find(
            (b) => b.expiry_date && b.expiry_date.getTime() < Date.now(),
        );
        const freshBatch = snapshotBatches.find(
            (b) => b.expiry_date && b.expiry_date.getTime() > Date.now(),
        );
        expect(expiredBatch?.reserved_quantity.toNumber()).toBe(0);
        expect(freshBatch?.reserved_quantity.toNumber()).toBe(3);
    });

    it('releases an expired reservation safely and cancels the still-CREATED order', async () => {
        const customer = await makeCustomer();
        const { store, owner, listing } = await makeStoreWithListing();
        await receive(owner.id, store.id, listing.id, 10);
        const preview = await cart.addItem(customer.id, {
            storeProductId: listing.id,
            quantity: 2,
        });
        const order = await checkout.createOrder(
            customer.id,
            { fulfilmentType: 'PICKUP', expectedTotalAmount: preview.totalAmount },
            `key-${randomUUID()}`,
        );

        await prisma.stockReservation.updateMany({
            where: { order_id: order.id },
            data: { expires_at: new Date(Date.now() - 1000) },
        });

        const result = await reservations.releaseExpiredOrderReservations();
        expect(result.released).toBe(1);
        expect(result.cancelledOrders).toBe(1);

        const inventory = await prisma.inventory.findUniqueOrThrow({
            where: { store_product_id: listing.id },
        });
        expect(inventory.reserved_quantity.toNumber()).toBe(0);

        const reloadedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
        expect(reloadedOrder.status).toBe('CANCELLED');

        // Releasing again is a safe no-op - never double-restores quantities.
        const second = await reservations.releaseExpiredOrderReservations();
        expect(second.released).toBe(0);
    });

    it('cart cleanup after successful order creation never damages order history', async () => {
        const customer = await makeCustomer();
        const { store, owner, listing } = await makeStoreWithListing();
        await receive(owner.id, store.id, listing.id, 10);
        const preview = await cart.addItem(customer.id, {
            storeProductId: listing.id,
            quantity: 1,
        });
        const order = await checkout.createOrder(
            customer.id,
            { fulfilmentType: 'PICKUP', expectedTotalAmount: preview.totalAmount },
            `key-${randomUUID()}`,
        );

        // No active cart remains to clear (it transitioned to CHECKED_OUT, not deleted) - clearing
        // is a safe no-op, and the order's own items/history must stay fully intact regardless.
        await cart.clearCart(customer.id);

        const reloaded = await orders.getOwnOrder(customer.id, order.id);
        expect((reloaded as unknown as { items: unknown[] }).items).toHaveLength(1);
    });
});
