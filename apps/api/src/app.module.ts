import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuditModule } from './common/audit/audit.module.js';
import { IdempotencyModule } from './common/idempotency/idempotency.module.js';
import { LedgerModule } from './common/ledger/ledger.module.js';
import { OutboxModule } from './common/outbox/outbox.module.js';
import { AuthModule } from './auth/auth.module.js';
import { MerchantModule } from './merchant/merchant.module.js';
import { CatalogueModule } from './catalogue/catalogue.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { CartModule } from './cart/cart.module.js';
import { CheckoutModule } from './checkout/checkout.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { FulfilmentModule } from './fulfilment/fulfilment.module.js';
import { DeliveryModule } from './delivery/delivery.module.js';

// process.cwd() is apps/api regardless of how `nest start`/Jest/Nx invoke this app, so the
// repository-root .env (the single source of truth documented in DEVELOPMENT-SETUP.md) is
// resolved relative to this file's own location instead of relying on the caller's cwd.
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRootEnvPath = resolve(__dirname, '..', '..', '..', '.env');

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
        AuthModule,
        MerchantModule,
        CatalogueModule,
        InventoryModule,
        CartModule,
        CheckoutModule,
        OrdersModule,
        FulfilmentModule,
        DeliveryModule,
        HealthModule,
    ],
})
export class AppModule {}
