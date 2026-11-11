import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/auth.types.js';
import { DeliveryPartnerService } from './delivery-partner.service.js';
import { DeliveryWorkflowService } from './delivery-workflow.service.js';
import { DeliveryCodService } from './delivery-cod.service.js';
import { SetAvailabilityDto } from './dto/set-availability.dto.js';

/** A delivery partner's own profile, availability, current assignment, and COD summary. */
@ApiTags('delivery-partner')
@Controller('delivery-partners/me')
@Roles('DELIVERY_PARTNER')
export class DeliveryPartnerController {
    constructor(
        private readonly partners: DeliveryPartnerService,
        private readonly workflow: DeliveryWorkflowService,
        private readonly cod: DeliveryCodService,
    ) {}

    @Get('profile')
    @ApiOperation({ summary: "Get the caller's own delivery-partner profile." })
    @ApiOkResponse({ description: 'The profile.' })
    async getProfile(@CurrentUser() user: RequestUser) {
        return this.partners.getOwnProfile(user.id);
    }

    @Patch('availability')
    @ApiOperation({ summary: 'Set own availability (online/offline).' })
    @ApiOkResponse({ description: 'The updated profile.' })
    async setAvailability(@Body() dto: SetAvailabilityDto, @CurrentUser() user: RequestUser) {
        return this.partners.setAvailability(user.id, dto);
    }

    @Get('assignments/current')
    @ApiOperation({ summary: "The caller's current (active, non-terminal) assignment, if any." })
    @ApiOkResponse({ description: 'The current assignment, or null.' })
    async getCurrentAssignment(@CurrentUser() user: RequestUser) {
        return this.workflow.getOwnCurrentAssignment(user.id);
    }

    @Get('cod-summary')
    @ApiOperation({ summary: "The caller's outstanding COD cash-in-custody balance." })
    @ApiOkResponse({
        description: 'Outstanding balance and uncollected-into-handover assignments.',
    })
    async getCodSummary(@CurrentUser() user: RequestUser) {
        return this.cod.getOwnCodSummary(user.id);
    }
}
