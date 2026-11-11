import { Controller, ForbiddenException, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/auth.types.js';
import { OrdersService } from '../orders/orders.service.js';
import { DeliveryAssignmentService } from './delivery-assignment.service.js';
import { DeliveryVerificationService } from './delivery-verification.service.js';

const ACTIVE_STATUSES = ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'];

/**
 * Customer-facing delivery progress and verification-code retrieval. Ownership is resolved
 * through `OrdersService.getOwnOrder` first - the same pattern `CustomerPickupController` uses -
 * so another customer's order can never be reached. Never exposes internal admin notes or partner
 * personal data beyond name/phone, and only once an assignment is active.
 */
@ApiTags('customer-delivery')
@Controller('customers/me/orders/:orderId')
@Roles('CUSTOMER')
export class CustomerDeliveryController {
    constructor(
        private readonly orders: OrdersService,
        private readonly assignments: DeliveryAssignmentService,
        private readonly verification: DeliveryVerificationService,
    ) {}

    @Get('delivery-status')
    @ApiOperation({ summary: "The caller's own delivery progress for a HOME_DELIVERY order." })
    @ApiOkResponse({ description: 'Delivery progress, with partner name/phone once assigned.' })
    async getDeliveryStatus(@Param('orderId') orderId: string, @CurrentUser() user: RequestUser) {
        const order = await this.orders.getOwnOrder(user.id, orderId);
        if (order.fulfilment_type !== 'DELIVERY') {
            throw new ForbiddenException('This order is not a home-delivery order.');
        }
        const assignment = await this.assignments.findAssignmentOrNull(order.id);
        if (!assignment || !ACTIVE_STATUSES.includes(assignment.delivery_status)) {
            return { orderStatus: order.status, assignment: null };
        }
        const partner = assignment as unknown as {
            delivery_status: string;
            picked_up_at: Date | null;
            out_for_delivery_at: Date | null;
            delivered_at: Date | null;
            delivery_partner: { user: { full_name: string | null; phone: string } };
        };
        return {
            orderStatus: order.status,
            assignment: {
                deliveryStatus: partner.delivery_status,
                partnerName: partner.delivery_partner.user.full_name,
                partnerPhone: partner.delivery_partner.user.phone,
                pickedUpAt: partner.picked_up_at,
                outForDeliveryAt: partner.out_for_delivery_at,
                deliveredAt: partner.delivered_at,
            },
        };
    }

    @Get('delivery-code')
    @ApiOperation({
        summary: "Get the delivery code for one of the caller's own orders, when OUT_FOR_DELIVERY.",
    })
    @ApiOkResponse({ description: 'The code (if still viewable) and its expiry.' })
    async getDeliveryCode(@Param('orderId') orderId: string, @CurrentUser() user: RequestUser) {
        const order = await this.orders.getOwnOrder(user.id, orderId);
        if (order.status !== 'OUT_FOR_DELIVERY') {
            throw new ForbiddenException('This order is not out for delivery yet.');
        }
        const assignment = await this.assignments.getAssignment(order.id);
        return this.verification.getOwnCode(assignment.id);
    }
}
