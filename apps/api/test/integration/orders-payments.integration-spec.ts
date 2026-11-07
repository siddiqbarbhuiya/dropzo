// Order/payment idempotency and history (BC-004-IMPLEMENTATION-PLAN.md Stage 9, 9.4).
import { randomUUID } from 'node:crypto';
import { adminPrisma, disconnectAll, resetDatabase } from '../helpers/clients.js';

async function createOrderFixture() {
    const customer = await adminPrisma.user.create({
        data: { phone: `+91${randomUUID().slice(0, 9)}` },
    });
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
    return { customer, storeId };
}

async function createOrder(customerId: string, storeId: string, idempotencyKey: string) {
    return adminPrisma.order.create({
        data: {
            order_number: randomUUID(),
            customer_id: customerId,
            store_id: storeId,
            store_name_snapshot: 'x',
            store_address_snapshot: 'x',
            fulfilment_type: 'PICKUP',
            subtotal: 100,
            total_amount: 100,
            payment_method: 'COD',
            idempotency_key: idempotencyKey,
        },
    });
}

describe('order and payment idempotency', () => {
    afterAll(async () => {
        await disconnectAll();
    });

    beforeEach(async () => {
        await resetDatabase();
    });

    it('rejects a second order with the same (customer_id, idempotency_key)', async () => {
        const { customer, storeId } = await createOrderFixture();
        await createOrder(customer.id, storeId, 'checkout-key-1');
        await expect(createOrder(customer.id, storeId, 'checkout-key-1')).rejects.toThrow();
    });

    it('allows the same idempotency_key for a different customer (scoped, not global)', async () => {
        const { customer, storeId } = await createOrderFixture();
        const otherCustomer = await adminPrisma.user.create({
            data: { phone: `+91${randomUUID().slice(0, 9)}` },
        });
        await createOrder(customer.id, storeId, 'shared-key');
        await expect(createOrder(otherCustomer.id, storeId, 'shared-key')).resolves.toBeDefined();
    });

    it('processes a duplicate payment webhook event exactly once (unique (provider, provider_event_id))', async () => {
        await adminPrisma.paymentWebhookEvent.create({
            data: { provider: 'razorpay', provider_event_id: 'evt_1', payload: {} },
        });
        await expect(
            adminPrisma.paymentWebhookEvent.create({
                data: { provider: 'razorpay', provider_event_id: 'evt_1', payload: {} },
            }),
        ).rejects.toThrow();
    });

    it('records an append-only payment status history trail', async () => {
        const { customer, storeId } = await createOrderFixture();
        const order = await createOrder(customer.id, storeId, 'pay-key-1');
        const payment = await adminPrisma.payment.create({
            data: { order_id: order.id, amount: 100, provider: 'COD' },
        });
        await adminPrisma.paymentStatusHistory.create({
            data: { payment_id: payment.id, new_status: 'PENDING', source: 'SYSTEM' },
        });
        await adminPrisma.paymentStatusHistory.create({
            data: {
                payment_id: payment.id,
                old_status: 'PENDING',
                new_status: 'CAPTURED',
                source: 'SYSTEM',
            },
        });
        const history = await adminPrisma.paymentStatusHistory.findMany({
            where: { payment_id: payment.id },
            orderBy: { created_at: 'asc' },
        });
        expect(history.map((h) => h.new_status)).toEqual(['PENDING', 'CAPTURED']);
    });
});
