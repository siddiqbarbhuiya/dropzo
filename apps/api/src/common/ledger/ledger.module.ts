import { Global, Module } from '@nestjs/common';
import { LedgerService } from './ledger.service.js';

/** Global like AuditModule/IdempotencyModule - any future ledger-posting event can use it. */
@Global()
@Module({
    providers: [LedgerService],
    exports: [LedgerService],
})
export class LedgerModule {}
