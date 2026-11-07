import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service.js';

/** Global like PrismaModule - every future module can inject AuditService without re-importing. */
@Global()
@Module({
    providers: [AuditService],
    exports: [AuditService],
})
export class AuditModule {}
