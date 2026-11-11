import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/auth.types.js';
import { MerchantOrdersService } from './merchant-orders.service.js';
import { ListMerchantOrdersDto } from './dto/list-merchant-orders.dto.js';
import { RejectOrderDto } from './dto/reject-order.dto.js';
import { VerifyPickupCodeDto } from './dto/verify-pickup-code.dto.js';

/**
 * Merchant-facing order inbox and fulfilment actions, scoped under the caller's own store
 * (resolved from the authenticated user via StoreService - see MerchantOrdersService). The pickup
 * code itself never appears in any response here - see PickupVerificationService's class doc.
 */
@ApiTags('merchant-orders')
@Controller('merchants/me/stores/:storeId/orders')
@Roles('MERCHANT_OWNER')
export class MerchantOrdersController {
    constructor(private readonly orders: MerchantOrdersService) {}

    @Get()
    @ApiOperation({
        summary: "List this store's incoming orders (paginated, filterable by status).",
    })
    @ApiOkResponse({ description: 'Paginated list of orders.' })
    async list(
        @Param('storeId') storeId: string,
        @Query() query: ListMerchantOrdersDto,
        @CurrentUser() user: RequestUser,
    ) {
        return this.orders.listOwnStoreOrders(user.id, storeId, query);
    }

    @Get(':orderId')
    @ApiOperation({ summary: "Get one of this store's orders, with items and status history." })
    @ApiOkResponse({ description: 'The order.' })
    async getOne(
        @Param('storeId') storeId: string,
        @Param('orderId') orderId: string,
        @CurrentUser() user: RequestUser,
    ) {
        return this.orders.getOwnStoreOrder(user.id, storeId, orderId);
    }

    @Patch(':orderId/accept')
    @ApiOperation({ summary: 'Accept a CREATED order.' })
    @ApiOkResponse({ description: 'The updated order.' })
    async accept(
        @Param('storeId') storeId: string,
        @Param('orderId') orderId: string,
        @CurrentUser() user: RequestUser,
    ) {
        return this.orders.accept(user.id, storeId, orderId);
    }

    @Patch(':orderId/reject')
    @ApiOperation({ summary: 'Reject a CREATED order with a mandatory reason.' })
    @ApiOkResponse({ description: 'The updated order.' })
    async reject(
        @Param('storeId') storeId: string,
        @Param('orderId') orderId: string,
        @Body() dto: RejectOrderDto,
        @CurrentUser() user: RequestUser,
    ) {
        return this.orders.reject(user.id, storeId, orderId, dto);
    }

    @Patch(':orderId/preparing')
    @ApiOperation({ summary: 'Mark an accepted order as being prepared.' })
    @ApiOkResponse({ description: 'The updated order.' })
    async markPreparing(
        @Param('storeId') storeId: string,
        @Param('orderId') orderId: string,
        @CurrentUser() user: RequestUser,
    ) {
        return this.orders.markPreparing(user.id, storeId, orderId);
    }

    @Patch(':orderId/ready')
    @ApiOperation({
        summary: 'Mark a prepared order as ready for pickup. Generates the pickup code.',
    })
    @ApiOkResponse({ description: 'The updated order.' })
    async markReady(
        @Param('storeId') storeId: string,
        @Param('orderId') orderId: string,
        @CurrentUser() user: RequestUser,
    ) {
        return this.orders.markReady(user.id, storeId, orderId);
    }

    @Post(':orderId/verify-pickup')
    // Stricter than the app-wide default - brute-forcing a 6-digit code is exactly the kind of
    // rapid-repeated-request pattern throttling exists for. @nestjs/throttler is mapped to a no-op
    // mock under Jest (test/mocks/throttler.mock.ts) - see CheckoutController for the same pattern.
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @ApiOperation({ summary: 'Verify the customer-presented pickup code and complete the order.' })
    @ApiOkResponse({ description: 'Verification result; the order only on success.' })
    async verifyPickup(
        @Param('storeId') storeId: string,
        @Param('orderId') orderId: string,
        @Body() dto: VerifyPickupCodeDto,
        @CurrentUser() user: RequestUser,
    ) {
        return this.orders.completePickup(user.id, storeId, orderId, dto);
    }
}
