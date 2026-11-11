import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export interface OutboxEventInput {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: Prisma.InputJsonValue;
}

/**
 * Transactional outbox writes only (`docs/04-design/DATABASE-DESIGN.md`'s "Outbox and
 * notification reliability"): an `outbox_events` row is inserted in the *same* database
 * transaction as the business change it describes, via the same `tx` the caller already holds -
 * never a bare, out-of-transaction insert. This is the first application code in the repository
 * to write to this table; there is still no dispatch worker that claims `PENDING` rows and
 * actually sends a push notification - see `docs/04-design/PICKUP-WORKFLOW-DESIGN.md`'s
 * "Notifications" section and `TECHNICAL-DEBT.md` for what remains. Writing the event
 * transactionally is deliberately decoupled from ever delivering it - no external call (FCM or
 * otherwise) happens here or anywhere near a transaction.
 */
@Injectable()
export class OutboxService {
    async record(tx: Tx, event: OutboxEventInput): Promise<void> {
        await tx.outboxEvent.create({
            data: {
                aggregate_type: event.aggregateType,
                aggregate_id: event.aggregateId,
                event_type: event.eventType,
                payload: event.payload,
            },
        });
    }
}
