import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/auth.types.js';
import { DeliveryPartnerService } from './delivery-partner.service.js';
import { DeliveryCodService } from './delivery-cod.service.js';
import { CreateDeliveryPartnerDto } from './dto/create-delivery-partner.dto.js';
import { ListDeliveryPartnersDto } from './dto/list-delivery-partners.dto.js';
import { PaginationDto } from '../merchant/dto/pagination.dto.js';

/** Admin-only delivery-partner onboarding/activation. ADMIN/SUPER_ADMIN only, every decision
 * audited. See `docs/04-design/DELIVERY-PARTNER-DESIGN.md`. */
@ApiTags('admin-delivery')
@Controller('admin/delivery-partners')
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminDeliveryPartnersController {
    constructor(
        private readonly partners: DeliveryPartnerService,
        private readonly cod: DeliveryCodService,
    ) {}

    @Post()
    @ApiOperation({ summary: 'Grant DELIVERY_PARTNER to an existing user and onboard them.' })
    @ApiOkResponse({ description: 'The new delivery partner.' })
    async create(@Body() dto: CreateDeliveryPartnerDto, @CurrentUser() admin: RequestUser) {
        return this.partners.adminCreate(admin.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List delivery partners, optionally filtered by active status.' })
    @ApiOkResponse({ description: 'Paginated list of delivery partners.' })
    async list(@Query() query: ListDeliveryPartnersDto) {
        return this.partners.adminList(query);
    }

    @Get(':id')
    @ApiOperation({ summary: "Get one delivery partner's details and current assignment." })
    @ApiOkResponse({ description: 'The delivery partner.' })
    async getOne(@Param('id') id: string) {
        return this.partners.adminGetOne(id);
    }

    @Patch(':id/activate')
    @ApiOperation({ summary: 'Activate a delivery partner so they can receive assignments.' })
    @ApiOkResponse({ description: 'The updated delivery partner.' })
    async activate(@Param('id') id: string, @CurrentUser() admin: RequestUser) {
        return this.partners.adminSetActive(admin.id, id, true);
    }

    @Patch(':id/deactivate')
    @ApiOperation({
        summary: 'Deactivate a delivery partner. They stop receiving new assignments.',
    })
    @ApiOkResponse({ description: 'The updated delivery partner.' })
    async deactivate(@Param('id') id: string, @CurrentUser() admin: RequestUser) {
        return this.partners.adminSetActive(admin.id, id, false);
    }

    @Get(':id/cod-summary')
    @ApiOperation({ summary: "A partner's outstanding COD cash-in-custody balance." })
    @ApiOkResponse({
        description: 'Outstanding balance and uncollected-into-handover assignments.',
    })
    async codSummary(@Param('id') id: string) {
        return this.cod.adminGetSummary(id);
    }

    @Get(':id/cod-handovers')
    @ApiOperation({ summary: "A partner's recorded cash handovers." })
    @ApiOkResponse({ description: 'Paginated list of handovers.' })
    async codHandovers(@Param('id') id: string, @Query() query: PaginationDto) {
        return this.cod.adminListHandovers(id, query);
    }
}
