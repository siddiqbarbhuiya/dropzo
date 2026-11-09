import { Global, Module } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service.js';

/** Global like AuditModule/PrismaModule - any future idempotent-sensitive endpoint can use it. */
@Global()
@Module({
    providers: [IdempotencyService],
    exports: [IdempotencyService],
})
export class IdempotencyModule {}
