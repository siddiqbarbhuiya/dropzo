import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/auth.types.js';
import { OrdersService } from './orders.service.js';
import { ListOrdersDto } from './dto/list-orders.dto.js';

/** Customer-facing order retrieval, scoped to the authenticated customer - see OrdersService. */
@ApiTags('customer-orders')
@Controller('customers/me/orders')
@Roles('CUSTOMER')
export class OrdersController {
    constructor(private readonly orders: OrdersService) {}

    @Get()
    @ApiOperation({
        summary: "List the caller's own orders (paginated, optionally filtered by status).",
    })
    @ApiOkResponse({ description: 'Paginated list of orders.' })
    async list(@Query() query: ListOrdersDto, @CurrentUser() user: RequestUser) {
        return this.orders.listOwnOrders(user.id, query);
    }

    @Get(':idOrNumber')
    @ApiOperation({ summary: "Get one of the caller's own orders by id or order number." })
    @ApiOkResponse({ description: 'The order, with items, status history, and payments.' })
    async getOne(@Param('idOrNumber') idOrNumber: string, @CurrentUser() user: RequestUser) {
        return this.orders.getOwnOrder(user.id, idOrNumber);
    }
}
