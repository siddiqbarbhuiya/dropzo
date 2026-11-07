import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * NestJS-managed Prisma client lifecycle: connect on module init, disconnect on shutdown.
 * Injected wherever database access is needed - never instantiate PrismaClient directly
 * elsewhere, so the whole application shares one connection pool.
 *
 * Connects as the restricted `dropzo_app` role (APP_DATABASE_URL), never as the migration
 * role (DATABASE_URL) - PostgreSQL never restricts a table owner via REVOKE, so running the
 * app under the same role that owns the tables would silently defeat the ledger's
 * UPDATE/DELETE revocation added in the initial migration. Falls back to DATABASE_URL only if
 * APP_DATABASE_URL is not set, so existing local setups keep working before a developer
 * re-copies .env.example.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        const url = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL;
        super({ datasources: { db: { url } } });
    }

    async onModuleInit(): Promise<void> {
        await this.$connect();
        this.logger.log('Connected to the database.');
    }

    async onModuleDestroy(): Promise<void> {
        await this.$disconnect();
        this.logger.log('Disconnected from the database.');
    }
}
