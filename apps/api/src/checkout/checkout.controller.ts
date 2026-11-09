import { BadRequestException, Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/auth.types.js';
import { CheckoutService } from './checkout.service.js';
import { PrepareCheckoutDto } from './dto/prepare-checkout.dto.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

/**
 * Checkout preparation (read-only preview) and order creation. Order creation requires an
 * `Idempotency-Key` header - a client-generated key unique per logical checkout attempt (e.g. a
 * UUID generated once when the user taps "Place order", reused on automatic retry).
 */
@ApiTags('customer-checkout')
@Controller('checkout')
@Roles('CUSTOMER')
export class CheckoutController {
    constructor(private readonly checkout: CheckoutService) {}

    @Post('prepare')
    @ApiOperation({ summary: 'Validate and price the active cart for a chosen fulfilment method.' })
    @ApiOkResponse({ description: 'The checkout summary, including any validation errors.' })
    async prepare(@Body() dto: PrepareCheckoutDto, @CurrentUser() user: RequestUser) {
        return this.checkout.prepare(user.id, dto);
    }

    @Post()
    // A stricter per-route @Throttle() override was tried here (order creation reserves real
    // stock for 24h, so rapid repeated calls are a more direct inventory-hoarding vector than most
    // endpoints) but reverted: importing anything from @nestjs/throttler crashes Jest's own
    // `--experimental-vm-modules` worker ("Must use import to load ES Module") the moment any test
    // file transitively loads this controller - the exact, already-documented incompatibility
    // auth.integration-spec.ts's own TestAuthAppModule comment explains (real Node resolves the
    // package fine; only this project's Jest harness cannot). The app-wide ThrottlerGuard baseline
    // (30/min/IP, registered globally by AuthModule) still applies to this endpoint regardless -
    // see RISK-014/TD-017 for the stricter, checkout-specific limit as a deferred follow-up.
    @ApiOperation({ summary: 'Create an order from the active cart. Idempotent.' })
    @ApiHeader({ name: 'Idempotency-Key', required: true })
    @ApiOkResponse({ description: 'The created (or, on retry, the original) order.' })
    async createOrder(
        @Body() dto: CreateOrderDto,
        @Headers('idempotency-key') idempotencyKey: string | undefined,
        @CurrentUser() user: RequestUser,
    ) {
        if (!idempotencyKey) {
            throw new BadRequestException('The Idempotency-Key header is required.');
        }
        return this.checkout.createOrder(user.id, dto, idempotencyKey);
    }
}
