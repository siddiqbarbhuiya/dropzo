// Outbox and notification idempotency (BC-004-IMPLEMENTATION-PLAN.md Stage 9, 9.5) - the
// database-side guarantees only (SKIP LOCKED claim-safety, notifications dedup). External FCM
// delivery is documented as at-least-once by design, not tested here - see DATABASE-DESIGN.md's
// "Outbox and notification reliability".
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { adminPrisma, disconnectAll, resetDatabase } from '../helpers/clients.js';

describe('outbox and notifications', () => {
    afterAll(async () => {
        await disconnectAll();
    });

    beforeEach(async () => {
        await resetDatabase();
    });

    it('a retried event cannot create a second notification row (unique source_outbox_event_id)', async () => {
        const user = await adminPrisma.user.create({
            data: { phone: `+91${randomUUID().slice(0, 9)}` },
        });
        const event = await adminPrisma.outboxEvent.create({
            data: {
                aggregate_type: 'ORDER',
                aggregate_id: randomUUID(),
                event_type: 'OrderPlaced',
                payload: {},
            },
        });

        await adminPrisma.notification.create({
            data: {
                user_id: user.id,
                channel: 'PUSH',
                title: 'Order placed',
                body: 'x',
                source_outbox_event_id: event.id,
            },
        });

        await expect(
            adminPrisma.notification.create({
                data: {
                    user_id: user.id,
                    channel: 'PUSH',
                    title: 'Order placed (retry)',
                    body: 'x',
                    source_outbox_event_id: event.id,
                },
            }),
        ).rejects.toThrow();
    });

    it('SKIP LOCKED lets two concurrent workers claim disjoint sets of pending events', async () => {
        await adminPrisma.outboxEvent.createMany({
            data: Array.from({ length: 4 }, () => ({
                aggregate_type: 'ORDER',
                aggregate_id: randomUUID(),
                event_type: 'OrderPlaced',
                payload: {},
            })),
        });

        const claim = async (prisma: PrismaClient, workerId: string, limit: number) =>
            prisma.$transaction(async (tx) => {
                const claimed = await tx.$queryRaw<Array<{ id: string }>>`
                    SELECT id FROM "outbox_events"
                    WHERE status = 'PENDING'
                    ORDER BY created_at
                    FOR UPDATE SKIP LOCKED
                    LIMIT ${limit}
                `;
                for (const row of claimed) {
                    await tx.outboxEvent.update({
                        where: { id: row.id },
                        data: { status: 'PROCESSING', claimed_by: workerId },
                    });
                }
                return claimed.map((r) => r.id);
            });

        const workerA = new PrismaClient({
            datasources: { db: { url: process.env.DATABASE_URL } },
        });
        const workerB = new PrismaClient({
            datasources: { db: { url: process.env.DATABASE_URL } },
        });

        const [claimedA, claimedB] = await Promise.all([
            claim(workerA, 'worker-a', 2),
            claim(workerB, 'worker-b', 2),
        ]);

        await workerA.$disconnect();
        await workerB.$disconnect();

        const overlap = claimedA.filter((id) => claimedB.includes(id));
        expect(overlap).toHaveLength(0);
        expect(claimedA.length + claimedB.length).toBe(4);
    });
});
