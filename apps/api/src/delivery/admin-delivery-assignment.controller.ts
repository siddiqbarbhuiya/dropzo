import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/auth.types.js';
import { DeliveryAssignmentService } from './delivery-assignment.service.js';
import { DeliveryCodService } from './delivery-cod.service.js';
import { ListEligibleOrdersDto } from './dto/list-eligible-orders.dto.js';
import { AssignDeliveryDto } from './dto/assign-delivery.dto.js';
import { ReasonDto } from './dto/reason.dto.js';
import { RecordHandoverDto } from './dto/record-handover.dto.js';
import { PaginationDto } from '../merchant/dto/pagination.dto.js';

/** Admin-controlled manual delivery assignment (ADR-0010, FR-DEL-001). ADMIN/SUPER_ADMIN only. */
@ApiTags('admin-delivery')
@Controller('admin/delivery-assignments')
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminDeliveryAssignmentsController {
    constructor(
        private readonly assignments: DeliveryAssignmentService,
        private readonly cod: DeliveryCodService,
    ) {}

    @Get('eligible-orders')
    @ApiOperation({ summary: 'List HOME_DELIVERY orders awaiting assignment or reassignment.' })
    @ApiOkResponse({ description: 'Paginated list of eligible orders.' })
    async eligibleOrders(@Query() query: ListEligibleOrdersDto) {
        return this.assignments.listEligibleOrders(query);
    }

    @Get(':orderId')
    @ApiOperation({ summary: 'Get the delivery assignment for one order, with its history.' })
    @ApiOkResponse({ description: 'The assignment.' })
    async getOne(@Param('orderId') orderId: string) {
        return this.assignments.getAssignment(orderId);
    }

    @Post(':orderId/assign')
    @ApiOperation({ summary: 'Assign (or reassign) a delivery partner to an eligible order.' })
    @ApiOkResponse({ description: 'The updated assignment.' })
    async assign(
        @Param('orderId') orderId: string,
        @Body() dto: AssignDeliveryDto,
        @CurrentUser() admin: RequestUser,
    ) {
        return this.assignments.assign(admin.id, orderId, dto);
    }

    @Patch(':orderId/cancel')
    @ApiOperation({
        summary: 'Cancel an assignment that has not yet been collected, with a reason.',
    })
    @ApiOkResponse({ description: 'The updated assignment.' })
    async cancel(
        @Param('orderId') orderId: string,
        @Body() dto: ReasonDto,
        @CurrentUser() admin: RequestUser,
    ) {
        return this.assignments.cancel(admin.id, orderId, dto.reason);
    }

    @Post('cod-handovers')
    @ApiOperation({ summary: 'Record a cash handover from a delivery partner.' })
    @ApiOkResponse({ description: 'The recorded handover.' })
    async recordHandover(@Body() dto: RecordHandoverDto, @CurrentUser() admin: RequestUser) {
        return this.cod.recordHandover(admin.id, dto.deliveryPartnerId, dto);
    }

    @Get('cod-handovers')
    @ApiOperation({ summary: 'List all recorded cash handovers.' })
    @ApiOkResponse({ description: 'Paginated list of handovers.' })
    async listHandovers(@Query() query: PaginationDto) {
        return this.cod.adminListHandovers(undefined, query);
    }
}
