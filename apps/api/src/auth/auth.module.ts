import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { OtpModule } from './otp/otp.module.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { AdminRolesController } from './admin-roles.controller.js';
import { TokenService } from './token.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { MerchantAccessGuard } from './guards/merchant-access.guard.js';

@Module({
    imports: [
        OtpModule,
        JwtModule.register({}), // secret/options are passed per-call in TokenService
        ThrottlerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            // A global, in-memory, per-IP baseline (defence in depth only - see
            // docs/04-design/AUTHENTICATION-DESIGN.md for why the OTP endpoints' own
            // database-backed limits in OtpService are the authoritative control, not this).
            useFactory: () => [{ ttl: 60_000, limit: 30 }],
        }),
    ],
    controllers: [AuthController, AdminRolesController],
    providers: [
        AuthService,
        TokenService,
        MerchantAccessGuard,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
    ],
    exports: [TokenService, MerchantAccessGuard],
})
export class AuthModule {}
