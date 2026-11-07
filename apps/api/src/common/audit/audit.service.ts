import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface AuditEventInput {
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    beforeState?: Prisma.InputJsonValue | null;
    afterState?: Prisma.InputJsonValue | null;
}

/**
 * Writes to audit_logs (see DATABASE-DESIGN.md, NFR-SEC-003). A logging failure must never break
 * the request it's auditing - catch and log locally rather than letting it propagate, since an
 * audit trail gap is far less harmful than an outage caused by the audit trail itself.
 */
@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private readonly prisma: PrismaService) {}

    async record(event: AuditEventInput): Promise<void> {
        try {
            await this.prisma.auditLog.create({
                data: {
                    actor_user_id: event.actorUserId ?? undefined,
                    action: event.action,
                    entity_type: event.entityType,
                    entity_id: event.entityId,
                    before_state: event.beforeState ?? undefined,
                    after_state: event.afterState ?? undefined,
                },
            });
        } catch (error) {
            this.logger.error(`Failed to write audit log for action "${event.action}"`, error);
        }
    }
}
