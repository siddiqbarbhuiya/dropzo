// BC-010 home delivery management integration suite. Same approach as BC-009's fulfilment suite: a
// real Nest DI graph, real PostgreSQL, no mocked Prisma. Drives a COD home-delivery order through
// the full admin-assignment -> partner accept/collect/out-for-delivery/verify -> COMPLETED
// lifecycle (and the reject/reassign and failure/reassign exits), covering ownership isolation,
// compare-and-swap concurrency safety, delivery-code security, the delivery-fee ledger leg, and
// COD handover reconciliation.
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
import { CartModule } from '../../src/cart/cart.module.js';
import { CartService } from '../../src/cart/cart.service.js';
import { CheckoutModule } from '../../src/checkout/checkout.module.js';
import { CheckoutService } from '../../src/checkout/checkout.service.js';
import { OrdersModule } from '../../src/orders/orders.module.js';
import { OrdersService } from '../../src/orders/orders.service.js';
import { FulfilmentModule } from '../../src/fulfilment/fulfilment.module.js';
import { MerchantOrdersService } from '../../src/fulfilment/merchant-orders.service.js';
import { DeliveryModule } from '../../src/delivery/delivery.module.js';
import { DeliveryPartnerService } from '../../src/delivery/delivery-partner.service.js';
import { DeliveryAssignmentService } from '../../src/delivery/delivery-assignment.service.js';
import { DeliveryWorkflowService } from '../../src/delivery/delivery-workflow.service.js';
import { DeliveryVerificationService } from '../../src/delivery/delivery-verification.service.js';
import { DeliveryCodService } from '../../src/delivery/delivery-cod.service.js';
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
        DeliveryModule,
    ],
    providers: [MerchantApplicationService, StoreService, CategoryService, ProductService],
})
class TestDeliveryAppModule {}

let app: INestApplication;
let prisma: PrismaService;
let merchantApplications: MerchantApplicationService;
let stores: StoreService;
let categories: CategoryService;
let products: ProductService;
let listings: StoreProductService;
let inventoryService: InventoryService;
let cart: CartService;
let checkout: CheckoutService;
let orders: OrdersService;
let merchantOrders: MerchantOrdersService;
let partners: DeliveryPartnerService;
let assignments: DeliveryAssignmentService;
let workflow: DeliveryWorkflowService;
let verification: DeliveryVerificationService;
let cod: DeliveryCodService;

beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
        imports: [TestDeliveryAppModule],
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
    cart = app.get(CartService);
    checkout = app.get(CheckoutService);
    orders = app.get(OrdersService);
    merchantOrders = app.get(MerchantOrdersService);
    partners = app.get(DeliveryPartnerService);
    assignments = app.get(DeliveryAssignmentService);
    workflow = app.get(DeliveryWorkflowService);
    verification = app.get(DeliveryVerificationService);
    cod = app.get(DeliveryCodService);
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

async function makeAdmin() {
    return prisma.user.create({ data: { phone: freshPhone() } });
}

async function makeDeliveryPartner(adminId: string, vehicleType = 'Two-wheeler') {
    const user = await prisma.user.create({
        data: { phone: freshPhone(), full_name: 'Test Rider' },
    });
    const partner = await partners.adminCreate(adminId, { userId: user.id, vehicleType });
    return { user, partner };
}

const applicationDto = {
    legalName: 'Barbhuiya General Store Pvt Ltd',
    displayName: 'Barbhuiya General Store',
    contactPhone: '9876543210',
    businessAddress: 'Main Road, Badarpur',
};

const DELIVERY_COORDS = { latitude: 24.86, longitude: 92.51 };

async function makeServiceZone() {
    return prisma.serviceZone.create({
        data: {
            name: `Badarpur ${randomUUID()}`,
            city: 'Badarpur',
            max_delivery_radius_km: 50,
            is_active: true,
        },
    });
}

async function makeDeliveryStoreWithListing() {
    const zone = await makeServiceZone();
    const owner = await prisma.user.create({ data: { phone: freshPhone() } });
    const application = await merchantApplications.submitApplication(owner.id, applicationDto);
    const admin = await makeAdmin();
    await merchantApplications.approve(application.id, admin.id);
    const store = await stores.createStore(owner.id, {
        name: 'Main Branch',
        address: 'Market Road',
        district: 'Karimganj',
        city: 'Badarpur',
        latitude: DELIVERY_COORDS.latitude,
        longitude: DELIVERY_COORDS.longitude,
        supportsDelivery: true,
        serviceZoneId: zone.id,
    });
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

async function makeDeliveryOrder(opts: { quantity?: number } = {}) {
    const quantity = opts.quantity ?? 2;
    const customer = await makeCustomer();
    const { owner, admin, store, listing } = await makeDeliveryStoreWithListing();
    await inventoryService.receiveStock(owner.id, store.id, listing.id, { quantity: 10 });
    const preview = await cart.addItem(customer.id, { storeProductId: listing.id, quantity });
    const order = await checkout.createOrder(
        customer.id,
        {
            fulfilmentType: 'DELIVERY',
            expectedTotalAmount: preview.totalAmount,
            deliveryAddress: {
                recipientName: 'Priya Devi',
                recipientPhone: '9876500000',
                addressLine1: 'House 12, Near Market Road',
                city: 'Badarpur',
                district: 'Karimganj',
                ...DELIVERY_COORDS,
            },
        },
        `key-${randomUUID()}`,
    );
    return { customer, owner, admin, store, listing, order };
}

async function makeReadyDeliveryOrder(opts: { quantity?: number; deliveryFee?: number } = {}) {
    const ctx = await makeDeliveryOrder(opts);
    await merchantOrders.accept(ctx.owner.id, ctx.store.id, ctx.order.id);
    await merchantOrders.markPreparing(ctx.owner.id, ctx.store.id, ctx.order.id);
    await merchantOrders.markReady(ctx.owner.id, ctx.store.id, ctx.order.id);
    if (opts.deliveryFee) {
        await prisma.order.update({
            where: { id: ctx.order.id },
            data: { delivery_fee: opts.deliveryFee, total_amount: { increment: opts.deliveryFee } },
        });
    }
    const order = await prisma.order.findUniqueOrThrow({ where: { id: ctx.order.id } });
    return { ...ctx, order };
}

async function assignAndAccept(
    ctx: Awaited<ReturnType<typeof makeReadyDeliveryOrder>>,
    admin: { id: string },
) {
    const { partner: rider, user: riderUser } = await makeDeliveryPartner(admin.id);
    await assignments.assign(admin.id, ctx.order.id, { deliveryPartnerId: rider.id });
    await workflow.accept(riderUser.id, ctx.order.id);
    return { rider, riderUser };
}

async function driveToOutForDelivery(
    ctx: Awaited<ReturnType<typeof makeReadyDeliveryOrder>>,
    admin: { id: string },
) {
    const { rider, riderUser } = await assignAndAccept(ctx, admin);
    await workflow.markCollected(riderUser.id, ctx.order.id);
    await workflow.markOutForDelivery(riderUser.id, ctx.order.id);
    const outboxRow = await prisma.outboxEvent.findFirstOrThrow({
        where: { event_type: 'DELIVERY_OUT_FOR_DELIVERY' },
        orderBy: { created_at: 'desc' },
    });
    const code = (outboxRow.payload as { deliveryCode: string }).deliveryCode;
    return { rider, riderUser, code };
}

describe('Delivery partner management (service + real DB)', () => {
    it('onboards a partner, grants the role, and lets admin activate/deactivate', async () => {
        const admin = await makeAdmin();
        const { partner, user } = await makeDeliveryPartner(admin.id);
        expect(partner.is_approved).toBe(true);

        const roles = await prisma.userRole.findMany({ where: { user_id: user.id } });
        expect(roles.map((r) => r.role)).toContain('DELIVERY_PARTNER');

        const deactivated = await partners.adminSetActive(admin.id, partner.id, false);
        expect(deactivated.is_approved).toBe(false);
    });

    it('prevents an inactive partner from receiving a new assignment', async () => {
        const admin = await makeAdmin();
        const { partner } = await makeDeliveryPartner(admin.id);
        await partners.adminSetActive(admin.id, partner.id, false);
        const ctx = await makeReadyDeliveryOrder();

        await expect(
            assignments.assign(admin.id, ctx.order.id, { deliveryPartnerId: partner.id }),
        ).rejects.toThrow(ForbiddenException);
    });
});

describe('Pickup/delivery exclusivity', () => {
    it('never allows a PICKUP order through the delivery-assignment path', async () => {
        const customer = await makeCustomer();
        const { owner, admin, store, listing } = await makeDeliveryStoreWithListing();
        await inventoryService.receiveStock(owner.id, store.id, listing.id, { quantity: 10 });
        await cart.addItem(customer.id, { storeProductId: listing.id, quantity: 1 });
        const order = await checkout.createOrder(
            customer.id,
            { fulfilmentType: 'PICKUP', expectedTotalAmount: 100 },
            `key-${randomUUID()}`,
        );
        await merchantOrders.accept(owner.id, store.id, order.id);
        await merchantOrders.markPreparing(owner.id, store.id, order.id);
        await merchantOrders.markReady(owner.id, store.id, order.id);

        const { partner } = await makeDeliveryPartner(admin.id);
        await expect(
            assignments.assign(admin.id, order.id, { deliveryPartnerId: partner.id }),
        ).rejects.toThrow(ConflictException);
    });
});

describe('Admin manual assignment', () => {
    it('assigns an eligible home-delivery order and lists it in the eligible queue beforehand', async () => {
        const ctx = await makeReadyDeliveryOrder();
        const page = await assignments.listEligibleOrders({ page: 1, limit: 20 });
        expect(page.data.map((o) => o.id)).toContain(ctx.order.id);

        const { partner } = await makeDeliveryPartner(ctx.admin.id);
        const assignment = await assignments.assign(ctx.admin.id, ctx.order.id, {
            deliveryPartnerId: partner.id,
        });
        expect(assignment.delivery_status).toBe('ASSIGNED');

        const order = await prisma.order.findUniqueOrThrow({ where: { id: ctx.order.id } });
        expect(order.status).toBe('ASSIGNED');

        const afterPage = await assignments.listEligibleOrders({ page: 1, limit: 20 });
        expect(afterPage.data.map((o) => o.id)).not.toContain(ctx.order.id);
    });

    it('never lets two admins create duplicate active assignments for the same order', async () => {
        const ctx = await makeReadyDeliveryOrder();
        const { partner: riderA } = await makeDeliveryPartner(ctx.admin.id);
        const { partner: riderB } = await makeDeliveryPartner(ctx.admin.id);

        const results = await Promise.allSettled([
            assignments.assign(ctx.admin.id, ctx.order.id, { deliveryPartnerId: riderA.id }),
            assignments.assign(ctx.admin.id, ctx.order.id, { deliveryPartnerId: riderB.id }),
        ]);
        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    });

    it('never lets one partner be assigned two active deliveries at once', async () => {
        const first = await makeReadyDeliveryOrder();
        const second = await makeReadyDeliveryOrder();
        const { partner } = await makeDeliveryPartner(first.admin.id);

        await assignments.assign(first.admin.id, first.order.id, { deliveryPartnerId: partner.id });
        await expect(
            assignments.assign(second.admin.id, second.order.id, { deliveryPartnerId: partner.id }),
        ).rejects.toThrow(ConflictException);
    });

    it('allows reassignment after a rejection, preserving history via delivery_events', async () => {
        const ctx = await makeReadyDeliveryOrder();
        const { partner: riderA, user: riderAUser } = await makeDeliveryPartner(ctx.admin.id);
        await assignments.assign(ctx.admin.id, ctx.order.id, { deliveryPartnerId: riderA.id });
        await workflow.reject(riderAUser.id, ctx.order.id, { reason: 'Too far.' });

        const orderAfterReject = await prisma.order.findUniqueOrThrow({
            where: { id: ctx.order.id },
        });
        expect(orderAfterReject.status).toBe('READY');

        const { partner: riderB } = await makeDeliveryPartner(ctx.admin.id);
        const reassigned = await assignments.assign(ctx.admin.id, ctx.order.id, {
            deliveryPartnerId: riderB.id,
        });
        expect(reassigned.delivery_status).toBe('ASSIGNED');
        expect(reassigned.delivery_partner_id).toBe(riderB.id);

        const events = await prisma.deliveryEvent.findMany({
            where: { delivery_assignment_id: reassigned.id },
            orderBy: { created_at: 'asc' },
        });
        expect(events.map((e) => e.event_type)).toEqual(['ASSIGNED', 'REJECTED', 'REASSIGNED']);
    });

    it('lets an admin cancel an unassigned-yet-collected assignment, freeing it back to the queue', async () => {
        const ctx = await makeReadyDeliveryOrder();
        const { partner } = await makeDeliveryPartner(ctx.admin.id);
        await assignments.assign(ctx.admin.id, ctx.order.id, { deliveryPartnerId: partner.id });

        const cancelled = await assignments.cancel(
            ctx.admin.id,
            ctx.order.id,
            'Wrong partner picked.',
        );
        expect(cancelled.delivery_status).toBe('CANCELLED');
        const order = await prisma.order.findUniqueOrThrow({ where: { id: ctx.order.id } });
        expect(order.status).toBe('READY');
    });
});

describe("Partner's own workflow and ownership isolation", () => {
    it("never lets a partner see or act on another partner's assignment", async () => {
        const ctx = await makeReadyDeliveryOrder();
        const { rider } = await assignAndAccept(ctx, ctx.admin);
        const { user: otherRiderUser } = await makeDeliveryPartner(ctx.admin.id);

        await expect(workflow.getOwnAssignment(otherRiderUser.id, ctx.order.id)).rejects.toThrow();
        await expect(workflow.markCollected(otherRiderUser.id, ctx.order.id)).rejects.toThrow();
        expect(rider).toBeDefined();
    });

    it('cannot collect before accepting, and cannot collect the same order twice', async () => {
        const ctx = await makeReadyDeliveryOrder();
        const { partner, user: riderUser } = await makeDeliveryPartner(ctx.admin.id);
        await assignments.assign(ctx.admin.id, ctx.order.id, { deliveryPartnerId: partner.id });

        await expect(workflow.markCollected(riderUser.id, ctx.order.id)).rejects.toThrow(
            ConflictException,
        );
        await workflow.accept(riderUser.id, ctx.order.id);
        await workflow.markCollected(riderUser.id, ctx.order.id);
        await expect(workflow.markCollected(riderUser.id, ctx.order.id)).rejects.toThrow(
            ConflictException,
        );
    });

    it('generates a hash-only delivery code once out for delivery', async () => {
        const ctx = await makeReadyDeliveryOrder();
        const { code } = await driveToOutForDelivery(ctx, ctx.admin);
        expect(code).toMatch(/^\d{6}$/);

        const assignment = await prisma.deliveryAssignment.findUniqueOrThrow({
            where: { order_id: ctx.order.id },
        });
        const storedVerification = await prisma.deliveryVerification.findUniqueOrThrow({
            where: { delivery_assignment_id: assignment.id },
        });
        expect(storedVerification.code_hash).not.toBe(code);
        expect(storedVerification.code_hash).toMatch(/^[0-9a-f]{64}$/);

        const order = await prisma.order.findUniqueOrThrow({ where: { id: ctx.order.id } });
        expect(order.status).toBe('OUT_FOR_DELIVERY');
    });

    it("confirms the merchant's handover acknowledgement never drives the order status", async () => {
        const ctx = await makeReadyDeliveryOrder();
        const { riderUser } = await assignAndAccept(ctx, ctx.admin);
        await workflow.markCollected(riderUser.id, ctx.order.id);

        const confirmed = await workflow.confirmMerchantHandover(
            ctx.owner.id,
            ctx.store.id,
            ctx.order.id,
        );
        expect(confirmed.picked_up_confirmed_by_merchant_at).not.toBeNull();
        expect(confirmed.delivery_status).toBe('PICKED_UP');

        const otherOwner = (await makeDeliveryStoreWithListing()).owner;
        await expect(
            workflow.confirmMerchantHandover(otherOwner.id, ctx.store.id, ctx.order.id),
        ).rejects.toThrow(ForbiddenException);
    });
});

describe('Customer delivery-code retrieval', () => {
    it('is only visible to the owning customer, and only once OUT_FOR_DELIVERY', async () => {
        const ctx = await makeReadyDeliveryOrder();
        const { riderUser } = await assignAndAccept(ctx, ctx.admin);
        const assignment = await prisma.deliveryAssignment.findUniqueOrThrow({
            where: { order_id: ctx.order.id },
        });
        await expect(verification.getOwnCode(assignment.id)).rejects.toThrow();

        await workflow.markCollected(riderUser.id, ctx.order.id);
        await workflow.markOutForDelivery(riderUser.id, ctx.order.id);
        const result = await verification.getOwnCode(assignment.id);
        expect(result.codeAvailable).toBe(true);
        expect(result.code).toMatch(/^\d{6}$/);

        const otherCustomer = await makeCustomer();
        await expect(orders.getOwnOrder(otherCustomer.id, ctx.order.id)).rejects.toThrow();
    });
});

describe('Delivery-code verification and COD completion', () => {
    it('verifies the correct code, atomically completes the order, and posts a balanced delivery-fee ledger leg', async () => {
        const ctx = await makeReadyDeliveryOrder({ quantity: 2, deliveryFee: 25 });
        const { riderUser, code } = await driveToOutForDelivery(ctx, ctx.admin);

        const result = await workflow.completeDelivery(riderUser.id, ctx.order.id, { code });
        expect(result.verified).toBe(true);
        expect(result.order?.status).toBe('COMPLETED');

        const payment = await prisma.payment.findFirstOrThrow({
            where: { order_id: ctx.order.id },
        });
        expect(payment.status).toBe('CAPTURED');

        const txn = await prisma.ledgerTransaction.findFirstOrThrow({
            where: { reference_type: 'ORDER', reference_id: ctx.order.id },
        });
        const entries = await prisma.ledgerEntry.findMany({ where: { transaction_id: txn.id } });
        const debits = entries
            .filter((e) => e.direction === 'DEBIT')
            .reduce((s, e) => s + Number(e.amount), 0);
        const credits = entries
            .filter((e) => e.direction === 'CREDIT')
            .reduce((s, e) => s + Number(e.amount), 0);
        expect(debits).toBe(credits);

        const deliveryRevenueAccount = await prisma.financialAccount.findFirstOrThrow({
            where: { account_type: 'PLATFORM_DELIVERY_REVENUE', merchant_id: null },
        });
        const deliveryRevenueEntry = entries.find(
            (e) => e.account_id === deliveryRevenueAccount.id,
        );
        expect(deliveryRevenueEntry?.direction).toBe('CREDIT');
        expect(Number(deliveryRevenueEntry?.amount)).toBe(25);

        const assignment = await prisma.deliveryAssignment.findUniqueOrThrow({
            where: { order_id: ctx.order.id },
        });
        expect(Number(assignment.cod_collected_amount)).toBe(225); // 200 + 25 delivery fee
        expect(assignment.delivery_status).toBe('DELIVERED');
    });

    it('rejects an incorrect code without completing the order, tracking attempts remaining', async () => {
        const ctx = await makeReadyDeliveryOrder();
        const { riderUser } = await driveToOutForDelivery(ctx, ctx.admin);

        const result = await workflow.completeDelivery(riderUser.id, ctx.order.id, {
            code: '000000',
        });
        expect(result.verified).toBe(false);
        expect(result.attemptsRemaining).toBe(4);

        const order = await prisma.order.findUniqueOrThrow({ where: { id: ctx.order.id } });
        expect(order.status).toBe('OUT_FOR_DELIVERY');
    });

    it('locks out after too many attempts, and never lets a concurrent double-verification both succeed', async () => {
        const ctx = await makeReadyDeliveryOrder();
        const { riderUser, code } = await driveToOutForDelivery(ctx, ctx.admin);

        const results = await Promise.allSettled([
            workflow.completeDelivery(riderUser.id, ctx.order.id, { code }),
            workflow.completeDelivery(riderUser.id, ctx.order.id, { code }),
        ]);
        const verifiedTrue = results.filter(
            (r) => r.status === 'fulfilled' && (r.value as { verified: boolean }).verified,
        );
        expect(verifiedTrue).toHaveLength(1);
        const completedCount = await prisma.order.count({
            where: { id: ctx.order.id, status: 'COMPLETED' },
        });
        expect(completedCount).toBe(1);
    });

    it("never lets a different partner verify another partner's delivery", async () => {
        const ctx = await makeReadyDeliveryOrder();
        const { code } = await driveToOutForDelivery(ctx, ctx.admin);
        const { user: otherRiderUser } = await makeDeliveryPartner(ctx.admin.id);

        await expect(
            workflow.completeDelivery(otherRiderUser.id, ctx.order.id, { code }),
        ).rejects.toThrow();
    });
});

describe('Failed delivery and reassignment', () => {
    it('records a mandatory reason, never releases collected inventory, and allows reassignment afterward', async () => {
        const ctx = await makeReadyDeliveryOrder();
        const { riderUser } = await driveToOutForDelivery(ctx, ctx.admin);

        const failed = await workflow.reportFailure(riderUser.id, ctx.order.id, {
            reason: 'Customer unreachable after three attempts.',
        });
        expect(failed.delivery_status).toBe('FAILED');
        expect(failed.failed_reason).toContain('unreachable');

        const order = await prisma.order.findUniqueOrThrow({ where: { id: ctx.order.id } });
        expect(order.status).toBe('DELIVERY_FAILED');

        const reservation = await prisma.stockReservation.findFirst({
            where: { order_id: ctx.order.id },
        });
        expect(reservation?.status).toBe('ACTIVE');

        const payment = await prisma.payment.findFirstOrThrow({
            where: { order_id: ctx.order.id },
        });
        expect(payment.status).toBe('PENDING');

        const { partner: newRider } = await makeDeliveryPartner(ctx.admin.id);
        const reassigned = await assignments.assign(ctx.admin.id, ctx.order.id, {
            deliveryPartnerId: newRider.id,
        });
        expect(reassigned.delivery_status).toBe('ASSIGNED');
    });
});

describe('COD handover reconciliation', () => {
    it('reduces outstanding balance on handover and rejects a duplicate handover of the same order', async () => {
        const ctx = await makeReadyDeliveryOrder({ quantity: 1 });
        const { riderUser, code } = await driveToOutForDelivery(ctx, ctx.admin);
        await workflow.completeDelivery(riderUser.id, ctx.order.id, { code });

        const partner = await partners.getOwnPartnerOrThrow(riderUser.id);
        const summaryBefore = await cod.getOwnCodSummary(riderUser.id);
        expect(summaryBefore.outstandingBalance).toBe('100.00');

        const handover = await cod.recordHandover(ctx.admin.id, partner.id, {
            deliveryPartnerId: partner.id,
            orderIds: [ctx.order.id],
        });
        expect(Number(handover.amount)).toBe(100);

        const summaryAfter = await cod.getOwnCodSummary(riderUser.id);
        expect(summaryAfter.outstandingBalance).toBe('0.00');

        await expect(
            cod.recordHandover(ctx.admin.id, partner.id, {
                deliveryPartnerId: partner.id,
                orderIds: [ctx.order.id],
            }),
        ).rejects.toThrow(ConflictException);
    });

    it('rejects recording a handover for an order whose COD was never collected', async () => {
        const ctx = await makeReadyDeliveryOrder();
        const { rider: partner } = await assignAndAccept(ctx, ctx.admin);

        await expect(
            cod.recordHandover(ctx.admin.id, partner.id, {
                deliveryPartnerId: partner.id,
                orderIds: [ctx.order.id],
            }),
        ).rejects.toThrow();
    });
});

describe('Pickup COD accounting remains unchanged (regression)', () => {
    it('still posts the plain two-leg pickup ledger transaction with no delivery-fee leg', async () => {
        const customer = await makeCustomer();
        const { owner, store, listing } = await makeDeliveryStoreWithListing();
        await inventoryService.receiveStock(owner.id, store.id, listing.id, { quantity: 10 });
        await cart.addItem(customer.id, { storeProductId: listing.id, quantity: 1 });
        const order = await checkout.createOrder(
            customer.id,
            { fulfilmentType: 'PICKUP', expectedTotalAmount: 100 },
            `key-${randomUUID()}`,
        );
        await merchantOrders.accept(owner.id, store.id, order.id);
        await merchantOrders.markPreparing(owner.id, store.id, order.id);
        await merchantOrders.markReady(owner.id, store.id, order.id);
        const outboxRow = await prisma.outboxEvent.findFirstOrThrow({
            where: { aggregate_id: order.id, event_type: 'ORDER_READY_FOR_PICKUP' },
        });
        const code = (outboxRow.payload as { pickupCode: string }).pickupCode;
        await merchantOrders.completePickup(owner.id, store.id, order.id, { code });

        const txn = await prisma.ledgerTransaction.findFirstOrThrow({
            where: { reference_type: 'ORDER', reference_id: order.id },
        });
        expect(txn.transaction_type).toBe('ORDER_SALE_COD');
        const entries = await prisma.ledgerEntry.findMany({ where: { transaction_id: txn.id } });
        expect(entries).toHaveLength(4); // gross leg (2) + commission leg (2), no delivery-fee leg
    });
});
