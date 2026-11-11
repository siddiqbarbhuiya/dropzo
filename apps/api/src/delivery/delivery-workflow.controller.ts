import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/auth.types.js';
import { DeliveryWorkflowService } from './delivery-workflow.service.js';
import { ReasonDto } from './dto/reason.dto.js';
import { VerifyDeliveryCodeDto } from './dto/verify-delivery-code.dto.js';

/** A delivery partner's own actions on one of their assignments, scoped by order id. Every action
 * is re-checked against the caller's own `delivery_partners` row - see
 * `DeliveryWorkflowService.assertOwnAssignment`. */
@ApiTags('delivery-partner')
@Controller('delivery-partners/me/assignments/:orderId')
@Roles('DELIVERY_PARTNER')
export class DeliveryWorkflowController {
    constructor(private readonly workflow: DeliveryWorkflowService) {}

    @Get()
    @ApiOperation({ summary: "Get one of the caller's own assignments, with its event history." })
    @ApiOkResponse({ description: 'The assignment.' })
    async getOne(@Param('orderId') orderId: string, @CurrentUser() user: RequestUser) {
        return this.workflow.getOwnAssignment(user.id, orderId);
    }

    @Patch('accept')
    @ApiOperation({ summary: 'Accept a newly assigned delivery.' })
    @ApiOkResponse({ description: 'The updated assignment.' })
    async accept(@Param('orderId') orderId: string, @CurrentUser() user: RequestUser) {
        return this.workflow.accept(user.id, orderId);
    }

    @Patch('reject')
    @ApiOperation({ summary: 'Reject a newly assigned delivery with a mandatory reason.' })
    @ApiOkResponse({ description: 'The updated assignment.' })
    async reject(
        @Param('orderId') orderId: string,
        @Body() dto: ReasonDto,
        @CurrentUser() user: RequestUser,
    ) {
        return this.workflow.reject(user.id, orderId, dto);
    }

    @Patch('collect')
    @ApiOperation({ summary: 'Confirm the order was collected from the merchant.' })
    @ApiOkResponse({ description: 'The updated assignment.' })
    async collect(@Param('orderId') orderId: string, @CurrentUser() user: RequestUser) {
        return this.workflow.markCollected(user.id, orderId);
    }

    @Patch('out-for-delivery')
    @ApiOperation({
        summary: 'Mark the order out for delivery. Generates the delivery verification code.',
    })
    @ApiOkResponse({ description: 'The updated assignment.' })
    async outForDelivery(@Param('orderId') orderId: string, @CurrentUser() user: RequestUser) {
        return this.workflow.markOutForDelivery(user.id, orderId);
    }

    @Post('verify-delivery')
    // Stricter than the app-wide default, same reasoning as CheckoutController/
    // MerchantOrdersController's pickup-verification throttle - brute-forcing a 6-digit code.
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @ApiOperation({
        summary: 'Verify the customer-presented delivery code and complete the order.',
    })
    @ApiOkResponse({ description: 'Verification result; the order only on success.' })
    async verifyDelivery(
        @Param('orderId') orderId: string,
        @Body() dto: VerifyDeliveryCodeDto,
        @CurrentUser() user: RequestUser,
    ) {
        return this.workflow.completeDelivery(user.id, orderId, dto);
    }

    @Patch('fail')
    @ApiOperation({ summary: 'Report a failed delivery attempt with a mandatory reason.' })
    @ApiOkResponse({ description: 'The updated assignment.' })
    async fail(
        @Param('orderId') orderId: string,
        @Body() dto: ReasonDto,
        @CurrentUser() user: RequestUser,
    ) {
        return this.workflow.reportFailure(user.id, orderId, dto);
    }
}
