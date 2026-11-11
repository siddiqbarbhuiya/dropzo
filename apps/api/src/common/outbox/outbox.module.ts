import { Global, Module } from '@nestjs/common';
import { OutboxService } from './outbox.service.js';

/** Global like AuditModule/IdempotencyModule/LedgerModule. */
@Global()
@Module({
    providers: [OutboxService],
    exports: [OutboxService],
})
export class OutboxModule {}
