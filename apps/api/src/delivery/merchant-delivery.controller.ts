import { Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/auth.types.js';
import { DeliveryAssignmentService } from './delivery-assignment.service.js';
import { DeliveryWorkflowService } from './delivery-workflow.service.js';

/** Merchant-facing delivery visibility and handover confirmation - informational only, never
 * authoritative for the order-status transition (see `DeliveryWorkflowService.confirmMerchantHandover`'s
 * class doc for why a merchant can never falsely mark delivery progress). */
@ApiTags('merchant-delivery')
@Controller('merchants/me/stores/:storeId/orders/:orderId/delivery')
@Roles('MERCHANT_OWNER')
export class MerchantDeliveryController {
    constructor(
        private readonly assignments: DeliveryAssignmentService,
        private readonly workflow: DeliveryWorkflowService,
    ) {}

    @Get()
    @ApiOperation({ summary: "View the delivery assignment for one of this store's orders." })
    @ApiOkResponse({ description: 'The assignment.' })
    async getOne(
        @Param('storeId') storeId: string,
        @Param('orderId') orderId: string,
        @CurrentUser() user: RequestUser,
    ) {
        return this.assignments.getOwnedByMerchant(user.id, storeId, orderId);
    }

    @Patch('confirm-handover')
    @ApiOperation({
        summary: 'Confirm the delivery partner collected this order. Informational only.',
    })
    @ApiOkResponse({ description: 'The updated assignment.' })
    async confirmHandover(
        @Param('storeId') storeId: string,
        @Param('orderId') orderId: string,
        @CurrentUser() user: RequestUser,
    ) {
        return this.workflow.confirmMerchantHandover(user.id, storeId, orderId);
    }
}
