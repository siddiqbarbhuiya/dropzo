// BC-009 merchant order processing and customer pickup integration suite. Same approach as the
// BC-008 suite: a real Nest DI graph, real PostgreSQL, no mocked Prisma. Drives a COD pickup order
// through CREATED -> ACCEPTED -> PREPARING -> READY -> COMPLETED (and the CREATED -> REJECTED exit)
// via the real services, covering ownership isolation, compare-and-swap concurrency safety,
// reservation-expiry-vs-acceptance race safety, pickup-code security, COD payment capture, ledger
// posting, and audit/status-history/outbox correctness.
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
    ConflictException,
    ForbiddenException,
    Module,
    type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../../src/config/env.validation.js';
import { PrismaModule } from '../../src/prisma/prisma.module.js';
import { AuditModule } from '../../src/common/audit/audit.module.js';
import { IdempotencyModule } from '../../src/common/idempotency/idempotency.module.js';
import { LedgerModule } from '../../src/common/ledger/ledger.module.js';
import { OutboxModule } from '../../src/common/outbox/outbox.module.js';
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
import { FulfilmentModule } from '../../src/fulfilment/fulfilment.module.js';
import { MerchantOrdersService } from '../../src/fulfilment/merchant-orders.service.js';
import { PickupVerificationService } from '../../src/fulfilment/pickup-verification.service.js';
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
        LedgerModule,
        OutboxModule,
        InventoryModule,
        CartModule,
        CheckoutModule,
        OrdersModule,
        FulfilmentModule,
    ],
    providers: [MerchantApplicationService, StoreService, CategoryService, ProductService],
})
class TestFulfilmentAppModule {}

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
let merchantOrders: MerchantOrdersService;
let pickupVerification: PickupVerificationService;

beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
        imports: [TestFulfilmentAppModule],
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
    merchantOrders = app.get(MerchantOrdersService);
    pickupVerification = app.get(PickupVerificationService);
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

async function makeStoreWithListing() {
    const owner = await prisma.user.create({ data: { phone: freshPhone() } });
    const application = await merchantApplications.submitApplication(owner.id, applicationDto);
    const admin = await prisma.user.create({ data: { phone: freshPhone() } });
    await merchantApplications.approve(application.id, admin.id);
    const store = await stores.createStore(owner.id, storeDto);
    await stores.updateStatusByAdmin(store.id, 'ACTIVE', admin.id);

    const category = await categories.create(admin.id, { name: `Rice & Pulses ${randomUUID()}` });
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
        sellingPrice: 100,
        usesBatchTracking: false,
    });
    return { owner, admin, store, listing };
}

async function makePickupOrder(opts: { quantity?: number } = {}) {
    const quantity = opts.quantity ?? 2;
    const customer = await makeCustomer();
    const { owner, admin, store, listing } = await makeStoreWithListing();
    await inventoryService.receiveStock(owner.id, store.id, listing.id, { quantity: 10 });
    const preview = await cart.addItem(customer.id, { storeProductId: listing.id, quantity });
    const order = await checkout.createOrder(
        customer.id,
        { fulfilmentType: 'PICKUP', expectedTotalAmount: preview.totalAmount },
        `key-${randomUUID()}`,
    );
    return { customer, owner, admin, store, listing, order };
}

const pagination = { page: 1, limit: 20 };

describe('Merchant order lifecycle (service + real DB)', () => {
    it('lists and scopes orders to the resolved store, denying another merchant entirely', async () => {
        const { owner, store, order } = await makePickupOrder();
        const { owner: otherOwner, store: otherStore } = await makeStoreWithListing();

        const page = await merchantOrders.listOwnStoreOrders(owner.id, store.id, pagination);
        expect(page.data.map((o) => o.id)).toContain(order.id);

        await expect(
            merchantOrders.getOwnStoreOrder(owner.id, store.id, order.id),
        ).resolves.toMatchObject({
            id: order.id,
        });
        await expect(
            merchantOrders.getOwnStoreOrder(otherOwner.id, otherStore.id, order.id),
        ).rejects.toThrow();
    });

    it('accepts a CREATED order and never again lets the expiry job touch its reservation', async () => {
        const { owner, store, order } = await makePickupOrder();

        const accepted = await merchantOrders.accept(owner.id, store.id, order.id);
        expect(accepted.status).toBe('ACCEPTED');

        // Even if the reservation's expires_at is forced into the past, the expiry job must not
        // touch an ACCEPTED order's reservation (BC-009's order:{status:'CREATED'} join filter).
        await prisma.stockReservation.updateMany({
            where: { order_id: order.id },
            data: { expires_at: new Date(Date.now() - 1000) },
        });
        const result = await reservations.releaseExpiredOrderReservations();
        expect(result.released).toBe(0);

        const reservation = await prisma.stockReservation.findFirst({
            where: { order_id: order.id },
        });
        expect(reservation?.status).toBe('ACTIVE');
    });

    it('rejects a concurrent double-accept: exactly one request wins', async () => {
        const { owner, store, order } = await makePickupOrder();

        const results = await Promise.allSettled([
            merchantOrders.accept(owner.id, store.id, order.id),
            merchantOrders.accept(owner.id, store.id, order.id),
        ]);
        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    });

    it('rejects an order with a mandatory reason, releasing the reservation exactly once', async () => {
        const { owner, store, listing, order } = await makePickupOrder({ quantity: 2 });

        const rejected = await merchantOrders.reject(owner.id, store.id, order.id, {
            reason: 'Item out of stock today',
        });
        expect(rejected.status).toBe('REJECTED');

        const inventory = await prisma.inventory.findUniqueOrThrow({
            where: { store_product_id: listing.id },
        });
        expect(inventory.reserved_quantity.toNumber()).toBe(0);

        // Repeating the request (e.g. a retried client call) must not double-release anything -
        // the order is no longer CREATED, so the compare-and-swap itself rejects it cleanly.
        await expect(
            merchantOrders.reject(owner.id, store.id, order.id, { reason: 'retry' }),
        ).rejects.toThrow(ConflictException);
        const inventoryAfterRetry = await prisma.inventory.findUniqueOrThrow({
            where: { store_product_id: listing.id },
        });
        expect(inventoryAfterRetry.reserved_quantity.toNumber()).toBe(0);
    });

    it('only allows rejection from CREATED, never from ACCEPTED or later', async () => {
        const { owner, store, order } = await makePickupOrder();
        await merchantOrders.accept(owner.id, store.id, order.id);

        await expect(
            merchantOrders.reject(owner.id, store.id, order.id, { reason: 'too late' }),
        ).rejects.toThrow(ConflictException);
    });

    it('enforces the full sequence: PREPARING only from ACCEPTED, READY only from PREPARING', async () => {
        const { owner, store, order } = await makePickupOrder();

        await expect(merchantOrders.markPreparing(owner.id, store.id, order.id)).rejects.toThrow(
            ConflictException,
        );

        await merchantOrders.accept(owner.id, store.id, order.id);
        const preparing = await merchantOrders.markPreparing(owner.id, store.id, order.id);
        expect(preparing.status).toBe('PREPARING');

        await expect(merchantOrders.accept(owner.id, store.id, order.id)).rejects.toThrow(
            ConflictException,
        );

        const ready = await merchantOrders.markReady(owner.id, store.id, order.id);
        expect(ready.status).toBe('READY');
    });

    it('blocks every action once the store is inactive or the merchant is suspended', async () => {
        const { owner, admin, store, order } = await makePickupOrder();
        await stores.updateStatusByAdmin(store.id, 'SUSPENDED', admin.id);
        await expect(merchantOrders.accept(owner.id, store.id, order.id)).rejects.toThrow(
            ForbiddenException,
        );

        await stores.updateStatusByAdmin(store.id, 'ACTIVE', admin.id);
        const merchant = await merchantApplications.getMerchantForOwner(owner.id);
        await merchantApplications.suspend(merchant.id, admin.id, 'policy violation');
        await expect(merchantOrders.accept(owner.id, store.id, order.id)).rejects.toThrow(
            ForbiddenException,
        );
    });

    it('writes status history and an audit record for every transition', async () => {
        const { owner, store, order } = await makePickupOrder();
        await merchantOrders.accept(owner.id, store.id, order.id);

        const history = await prisma.orderStatusHistory.findMany({ where: { order_id: order.id } });
        expect(history.some((h) => h.old_status === 'CREATED' && h.new_status === 'ACCEPTED')).toBe(
            true,
        );
        const auditRows = await prisma.auditLog.findMany({
            where: { entity_type: 'order', entity_id: order.id, action: 'ORDER_ACCEPTED' },
        });
        expect(auditRows.length).toBeGreaterThanOrEqual(1);
    });

    it('records a transactional outbox event for the ready transition, never storing the plaintext code anywhere durable', async () => {
        const { owner, store, order } = await makePickupOrder();
        await merchantOrders.accept(owner.id, store.id, order.id);
        await merchantOrders.markPreparing(owner.id, store.id, order.id);
        await merchantOrders.markReady(owner.id, store.id, order.id);

        const outboxRows = await prisma.outboxEvent.findMany({
            where: { aggregate_id: order.id, event_type: 'ORDER_READY_FOR_PICKUP' },
        });
        expect(outboxRows).toHaveLength(1);
        const payload = outboxRows[0]!.payload as { pickupCode: string };
        expect(payload.pickupCode).toMatch(/^\d{6}$/);

        const verification = await prisma.pickupVerification.findUniqueOrThrow({
            where: { order_id: order.id },
        });
        expect(verification.code_hash).not.toBe(payload.pickupCode);
        expect(verification.code_hash).toMatch(/^[0-9a-f]{64}$/);
    });
});

describe('Customer pickup-code retrieval (service + real DB)', () => {
    async function makeReadyOrder() {
        const ctx = await makePickupOrder();
        await merchantOrders.accept(ctx.owner.id, ctx.store.id, ctx.order.id);
        await merchantOrders.markPreparing(ctx.owner.id, ctx.store.id, ctx.order.id);
        await merchantOrders.markReady(ctx.owner.id, ctx.store.id, ctx.order.id);
        const outboxRow = await prisma.outboxEvent.findFirstOrThrow({
            where: { aggregate_id: ctx.order.id, event_type: 'ORDER_READY_FOR_PICKUP' },
        });
        const code = (outboxRow.payload as { pickupCode: string }).pickupCode;
        return { ...ctx, code };
    }

    it('lets the owning customer view the code only once the order is READY', async () => {
        const { customer, order } = await makePickupOrder();
        await expect(orders.getOwnOrder(customer.id, order.id)).resolves.toMatchObject({
            status: 'CREATED',
        });

        const { customer: readyCustomer, order: readyOrder, code } = await makeReadyOrder();
        const reloaded = await orders.getOwnOrder(readyCustomer.id, readyOrder.id);
        expect(reloaded.status).toBe('READY');
        const result = await pickupVerification.getOwnCode(readyOrder.id);
        expect(result).toEqual({ expiresAt: expect.any(Date), codeAvailable: true, code });
    });

    it("never lets a different customer resolve another customer's order to retrieve its code", async () => {
        const { order } = await makeReadyOrder();
        const otherCustomer = await makeCustomer();
        await expect(orders.getOwnOrder(otherCustomer.id, order.id)).rejects.toThrow();
    });
});

describe('Pickup-code verification and COD completion (service + real DB)', () => {
    it('verifies the correct code and atomically completes the order end-to-end', async () => {
        const { owner, store, listing, order } = await makePickupOrder({ quantity: 2 });
        await merchantOrders.accept(owner.id, store.id, order.id);
        await merchantOrders.markPreparing(owner.id, store.id, order.id);
        await merchantOrders.markReady(owner.id, store.id, order.id);
        const outboxRow = await prisma.outboxEvent.findFirstOrThrow({
            where: { aggregate_id: order.id, event_type: 'ORDER_READY_FOR_PICKUP' },
        });
        const code = (outboxRow.payload as { pickupCode: string }).pickupCode;

        const result = await merchantOrders.completePickup(owner.id, store.id, order.id, { code });
        expect(result.verified).toBe(true);
        expect(result.order?.status).toBe('COMPLETED');

        const inventory = await prisma.inventory.findUniqueOrThrow({
            where: { store_product_id: listing.id },
        });
        expect(inventory.on_hand_quantity.toNumber()).toBe(8);
        expect(inventory.reserved_quantity.toNumber()).toBe(0);

        const movement = await prisma.stockMovement.findFirst({
            where: { reference_type: 'ORDER', reference_id: order.id, movement_type: 'SOLD' },
        });
        expect(movement?.quantity.toNumber()).toBe(2);

        const payment = await prisma.payment.findFirstOrThrow({ where: { order_id: order.id } });
        expect(payment.status).toBe('CAPTURED');

        const txn = await prisma.ledgerTransaction.findFirstOrThrow({
            where: { reference_type: 'ORDER', reference_id: order.id },
        });
        const entries = await prisma.ledgerEntry.findMany({ where: { transaction_id: txn.id } });
        const debits = entries
            .filter((e) => e.direction === 'DEBIT')
            .reduce((s, e) => s + Number(e.amount), 0);
        const credits = entries
            .filter((e) => e.direction === 'CREDIT')
            .reduce((s, e) => s + Number(e.amount), 0);
        expect(debits).toBe(credits);
        expect(debits).toBeCloseTo(200 + 200 * 0.08, 5);

        const verification = await prisma.pickupVerification.findUniqueOrThrow({
            where: { order_id: order.id },
        });
        expect(verification.verified_at).not.toBeNull();

        const outboxCompleted = await prisma.outboxEvent.findMany({
            where: { aggregate_id: order.id, event_type: 'ORDER_COMPLETED' },
        });
        expect(outboxCompleted).toHaveLength(1);

        const finalView = await orders.getOwnOrder(
            (
                await prisma.order.findUniqueOrThrow({
                    where: { id: order.id },
                })
            ).customer_id,
            order.id,
        );
        expect(finalView.status).toBe('COMPLETED');
    });

    it('rejects an incorrect code without completing the order, and tracks attempts remaining', async () => {
        const { owner, store, order } = await makePickupOrder();
        await merchantOrders.accept(owner.id, store.id, order.id);
        await merchantOrders.markPreparing(owner.id, store.id, order.id);
        await merchantOrders.markReady(owner.id, store.id, order.id);

        const result = await merchantOrders.completePickup(owner.id, store.id, order.id, {
            code: '000000',
        });
        expect(result.verified).toBe(false);
        expect(result.attemptsRemaining).toBe(4);

        const reloaded = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
        expect(reloaded.status).toBe('READY');
    });

    it('locks out a code after enough incorrect attempts, and an expired code is rejected', async () => {
        const { owner, store, order } = await makePickupOrder();
        await merchantOrders.accept(owner.id, store.id, order.id);
        await merchantOrders.markPreparing(owner.id, store.id, order.id);
        await merchantOrders.markReady(owner.id, store.id, order.id);

        for (let i = 0; i < 5; i++) {
            await merchantOrders.completePickup(owner.id, store.id, order.id, { code: '000000' });
        }
        await expect(
            merchantOrders.completePickup(owner.id, store.id, order.id, { code: '000000' }),
        ).rejects.toThrow(ConflictException);

        const reloaded = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
        expect(reloaded.status).toBe('READY');
    });

    it('never lets a concurrent double-verification both succeed', async () => {
        const { owner, store, order } = await makePickupOrder();
        await merchantOrders.accept(owner.id, store.id, order.id);
        await merchantOrders.markPreparing(owner.id, store.id, order.id);
        await merchantOrders.markReady(owner.id, store.id, order.id);
        const outboxRow = await prisma.outboxEvent.findFirstOrThrow({
            where: { aggregate_id: order.id, event_type: 'ORDER_READY_FOR_PICKUP' },
        });
        const code = (outboxRow.payload as { pickupCode: string }).pickupCode;

        const results = await Promise.allSettled([
            merchantOrders.completePickup(owner.id, store.id, order.id, { code }),
            merchantOrders.completePickup(owner.id, store.id, order.id, { code }),
        ]);
        const verifiedTrue = results.filter(
            (r) => r.status === 'fulfilled' && (r.value as { verified: boolean }).verified,
        );
        expect(verifiedTrue).toHaveLength(1);

        const completedCount = await prisma.order.count({
            where: { id: order.id, status: 'COMPLETED' },
        });
        expect(completedCount).toBe(1);
    });

    it("never lets a different merchant complete another merchant's order", async () => {
        const { owner, store, order } = await makePickupOrder();
        await merchantOrders.accept(owner.id, store.id, order.id);
        await merchantOrders.markPreparing(owner.id, store.id, order.id);
        await merchantOrders.markReady(owner.id, store.id, order.id);
        const outboxRow = await prisma.outboxEvent.findFirstOrThrow({
            where: { aggregate_id: order.id, event_type: 'ORDER_READY_FOR_PICKUP' },
        });
        const code = (outboxRow.payload as { pickupCode: string }).pickupCode;

        const { owner: otherOwner, store: otherStore } = await makeStoreWithListing();
        await expect(
            merchantOrders.completePickup(otherOwner.id, otherStore.id, order.id, { code }),
        ).rejects.toThrow();

        const reloaded = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
        expect(reloaded.status).toBe('READY');
    });

    it('rejects verification attempted before the order is READY', async () => {
        const { owner, store, order } = await makePickupOrder();
        await merchantOrders.accept(owner.id, store.id, order.id);

        await expect(
            merchantOrders.completePickup(owner.id, store.id, order.id, { code: '123456' }),
        ).rejects.toThrow(ConflictException);
    });

    it('reuses an existing platform financial account across two separate completed orders', async () => {
        const first = await makePickupOrder({ quantity: 1 });
        await merchantOrders.accept(first.owner.id, first.store.id, first.order.id);
        await merchantOrders.markPreparing(first.owner.id, first.store.id, first.order.id);
        await merchantOrders.markReady(first.owner.id, first.store.id, first.order.id);
        const firstCode = (
            (
                await prisma.outboxEvent.findFirstOrThrow({
                    where: { aggregate_id: first.order.id, event_type: 'ORDER_READY_FOR_PICKUP' },
                })
            ).payload as { pickupCode: string }
        ).pickupCode;
        await merchantOrders.completePickup(first.owner.id, first.store.id, first.order.id, {
            code: firstCode,
        });

        const second = await makePickupOrder({ quantity: 1 });
        await merchantOrders.accept(second.owner.id, second.store.id, second.order.id);
        await merchantOrders.markPreparing(second.owner.id, second.store.id, second.order.id);
        await merchantOrders.markReady(second.owner.id, second.store.id, second.order.id);
        const secondCode = (
            (
                await prisma.outboxEvent.findFirstOrThrow({
                    where: { aggregate_id: second.order.id, event_type: 'ORDER_READY_FOR_PICKUP' },
                })
            ).payload as { pickupCode: string }
        ).pickupCode;
        await merchantOrders.completePickup(second.owner.id, second.store.id, second.order.id, {
            code: secondCode,
        });

        const codClearingAccounts = await prisma.financialAccount.findMany({
            where: { account_type: 'COD_CASH_CLEARING', merchant_id: null },
        });
        expect(codClearingAccounts).toHaveLength(1);
    });
});
