import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/auth.types.js';
import { InventoryService } from './inventory.service.js';
import { ReceiveStockDto } from './dto/receive-stock.dto.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { RemoveStockDto } from './dto/remove-stock.dto.js';
import { PaginationDto } from '../merchant/dto/pagination.dto.js';

/**
 * Merchant-facing stock mutation for one listing. Every endpoint here is transactional, records a
 * stock_movements row with the acting user and (for adjust/remove) a mandatory reason, and never
 * allows on-hand quantity to go negative (enforced by the DB CHECK constraints from BC-004 plus
 * InventoryService's own reserved/expired-aware batch selection). Merchants must never be able to
 * change inventory quantities through the generic listing update endpoint - only through here.
 */
@ApiTags('merchant-inventory')
@Controller('merchants/me/stores/:storeId/listings/:listingId/inventory')
@Roles('MERCHANT_OWNER')
export class InventoryController {
    constructor(private readonly inventory: InventoryService) {}

    @Get()
    @ApiOperation({
        summary: 'Get current on-hand/reserved quantity and batches for this listing.',
    })
    @ApiOkResponse({ description: 'The inventory snapshot.' })
    async getSnapshot(
        @Param('storeId') storeId: string,
        @Param('listingId') listingId: string,
        @CurrentUser() user: RequestUser,
    ) {
        return this.inventory.getSnapshot(user.id, storeId, listingId);
    }

    @Post('receive')
    @ApiOperation({
        summary: 'Receive new stock (initial or additional), optionally into a batch.',
    })
    @ApiOkResponse({ description: 'The updated inventory snapshot.' })
    async receive(
        @Param('storeId') storeId: string,
        @Param('listingId') listingId: string,
        @Body() dto: ReceiveStockDto,
        @CurrentUser() user: RequestUser,
    ) {
        return this.inventory.receiveStock(user.id, storeId, listingId, dto);
    }

    @Post('adjustments')
    @ApiOperation({
        summary: 'Apply a signed stocktake/correction adjustment. Reason is mandatory.',
    })
    @ApiOkResponse({ description: 'The updated inventory snapshot.' })
    async adjust(
        @Param('storeId') storeId: string,
        @Param('listingId') listingId: string,
        @Body() dto: AdjustStockDto,
        @CurrentUser() user: RequestUser,
    ) {
        return this.inventory.adjustStock(user.id, storeId, listingId, dto);
    }

    @Post('removals')
    @ApiOperation({ summary: 'Write off damaged or expired stock. Reason is mandatory.' })
    @ApiOkResponse({ description: 'The updated inventory snapshot.' })
    async remove(
        @Param('storeId') storeId: string,
        @Param('listingId') listingId: string,
        @Body() dto: RemoveStockDto,
        @CurrentUser() user: RequestUser,
    ) {
        return this.inventory.removeStock(user.id, storeId, listingId, dto);
    }

    @Get('movements')
    @ApiOperation({ summary: "List this listing's stock movement history, newest first." })
    @ApiOkResponse({ description: 'Paginated list of stock movements.' })
    async movements(
        @Param('storeId') storeId: string,
        @Param('listingId') listingId: string,
        @Query() pagination: PaginationDto,
        @CurrentUser() user: RequestUser,
    ) {
        return this.inventory.listMovements(user.id, storeId, listingId, pagination);
    }
}
