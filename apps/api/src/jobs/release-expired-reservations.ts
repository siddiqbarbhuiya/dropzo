// BC-008: operational entry point for releasing expired, order-held stock reservations and
// cancelling the orders they belonged to (see docs/04-design/ORDER-MANAGEMENT-DESIGN.md's
// "Reservation expiry operation"). No new scheduler or infrastructure dependency - this is a
// plain, idempotent, database-backed job meant to be invoked periodically by whatever the
// deployment environment already uses for cron-like tasks (a system crontab entry, a platform's
// own scheduled-task feature, or a scheduled CI workflow), e.g. every 15 minutes:
//   */15 * * * *  cd /path/to/dropzo/apps/api && npm run release-expired-reservations
//
// Boots the real Nest DI graph (so this calls the exact same ReservationService the running API
// uses, never a reimplementation) without starting an HTTP listener. Lives under src/ (not a
// top-level scripts/ file) and is invoked from the compiled dist/ output, same as main.ts -
// running NestJS-decorated code through the ts-node/esm loader used by prisma/seed.ts does not
// work (a known ts-node/esm + CommonJS-package resolution issue with Nest's own dependencies),
// whereas the plain compiled output runs exactly like the real application.
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../config/env.validation.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuditModule } from '../common/audit/audit.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { ReservationService } from '../inventory/reservation.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRootEnvPath = resolve(__dirname, '..', '..', '..', '..', '.env');

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: repoRootEnvPath,
            validate: validateEnv,
        }),
        PrismaModule,
        AuditModule,
        InventoryModule,
    ],
})
class ReservationJobModule {}

async function main(): Promise<void> {
    const app = await NestFactory.createApplicationContext(ReservationJobModule, {
        logger: ['error', 'warn'],
    });
    try {
        const reservations = app.get(ReservationService);
        const result = await reservations.releaseExpiredOrderReservations();
        console.log(
            `Released ${result.released} expired reservation(s); cancelled ${result.cancelledOrders} order(s).`,
        );
    } finally {
        await app.close();
    }
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
