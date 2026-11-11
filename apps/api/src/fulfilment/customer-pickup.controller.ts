import { Controller, ForbiddenException, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/auth.types.js';
import { OrdersService } from '../orders/orders.service.js';
import { PickupVerificationService } from './pickup-verification.service.js';

/**
 * Customer-facing pickup code retrieval. Ownership is resolved through `OrdersService.getOwnOrder`
 * (scoped to `customer_id = <authenticated user>`, 404 for any order that isn't theirs) *before*
 * ever touching `PickupVerificationService` - another customer's code can never be reached, and the
 * code is never revealed unless the order is currently `READY`.
 */
@ApiTags('customer-pickup')
@Controller('customers/me/orders/:orderId/pickup-code')
@Roles('CUSTOMER')
export class CustomerPickupController {
    constructor(
        private readonly orders: OrdersService,
        private readonly pickupVerification: PickupVerificationService,
    ) {}

    @Get()
    @ApiOperation({
        summary: "Get the pickup code for one of the caller's own orders, when READY for pickup.",
    })
    @ApiOkResponse({ description: 'The code (if still viewable) and its expiry.' })
    async getCode(@Param('orderId') orderId: string, @CurrentUser() user: RequestUser) {
        const order = await this.orders.getOwnOrder(user.id, orderId);
        if (order.status !== 'READY') {
            throw new ForbiddenException('This order is not ready for pickup yet.');
        }
        return this.pickupVerification.getOwnCode(order.id);
    }
}
