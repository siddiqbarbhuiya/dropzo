import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/**
 * Global so every feature module can inject PrismaService without re-importing this module -
 * standard NestJS+Prisma wiring, not a business module. See docs/05-engineering's
 * dropzo-database-prisma skill and docs/04-design/DATABASE-DESIGN.md for the schema this serves.
 */
@Global()
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule {}
