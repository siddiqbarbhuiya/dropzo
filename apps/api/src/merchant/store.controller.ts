import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/auth.types.js';
import { StoreService } from './store.service.js';
import { CreateStoreDto } from './dto/create-store.dto.js';
import { UpdateStoreDto } from './dto/update-store.dto.js';
import { UpdateStoreHoursDto } from './dto/update-store-hours.dto.js';
import { UpdateStoreAvailabilityDto } from './dto/update-store-availability.dto.js';
import { UpdateStoreStatusDto } from './dto/update-store-status.dto.js';
import { PaginationDto } from './dto/pagination.dto.js';

/**
 * Merchant-facing store management, scoped under the caller's own merchant (resolved from the
 * authenticated user, never a client-supplied merchant id - see StoreService). `@Roles
 * ('MERCHANT_OWNER')` is the role-layer check; StoreService's merchant-id resolution plus its
 * `getOwnedOrThrow` are the resource-ownership check underneath it - both are required, neither
 * alone (see docs/05-engineering/SECURITY-STANDARDS.md).
 */
@ApiTags('merchant')
@Controller('merchants/me/stores')
@Roles('MERCHANT_OWNER')
export class StoreController {
    constructor(private readonly stores: StoreService) {}

    @Post()
    @ApiOperation({ summary: 'Create a store. Only an APPROVED merchant may create one.' })
    @ApiOkResponse({ description: 'The created store.' })
    async create(@Body() dto: CreateStoreDto, @CurrentUser() user: RequestUser) {
        return this.stores.createStore(user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: "List the caller's own stores." })
    @ApiOkResponse({ description: 'Paginated list of stores.' })
    async list(@Query() pagination: PaginationDto, @CurrentUser() user: RequestUser) {
        return this.stores.listOwnStores(user.id, pagination);
    }

    @Get(':storeId')
    @ApiOperation({ summary: "Get one of the caller's own stores." })
    @ApiOkResponse({ description: 'The store.' })
    async getOne(@Param('storeId') storeId: string, @CurrentUser() user: RequestUser) {
        return this.stores.getOwnStore(user.id, storeId);
    }

    @Patch(':storeId')
    @ApiOperation({ summary: 'Update store details.' })
    @ApiOkResponse({ description: 'The updated store.' })
    async update(
        @Param('storeId') storeId: string,
        @Body() dto: UpdateStoreDto,
        @CurrentUser() user: RequestUser,
    ) {
        return this.stores.updateStore(user.id, storeId, dto);
    }

    @Patch(':storeId/hours')
    @ApiOperation({ summary: "Update a store's operating hours." })
    @ApiOkResponse({ description: 'The updated store.' })
    async updateHours(
        @Param('storeId') storeId: string,
        @Body() dto: UpdateStoreHoursDto,
        @CurrentUser() user: RequestUser,
    ) {
        return this.stores.updateHours(user.id, storeId, dto.openingHours);
    }

    @Patch(':storeId/availability')
    @ApiOperation({ summary: "Update a store's pickup/delivery availability." })
    @ApiOkResponse({ description: 'The updated store.' })
    async updateAvailability(
        @Param('storeId') storeId: string,
        @Body() dto: UpdateStoreAvailabilityDto,
        @CurrentUser() user: RequestUser,
    ) {
        return this.stores.updateAvailability(user.id, storeId, dto);
    }

    @Patch(':storeId/status')
    @ApiOperation({
        summary:
            'Activate/pause/close a store. ACTIVE/PAUSED/CLOSED self-service only - ' +
            'approval into ACTIVE from PENDING and SUSPENDED enforcement are admin-only.',
    })
    @ApiOkResponse({ description: 'The updated store.' })
    async updateStatus(
        @Param('storeId') storeId: string,
        @Body() dto: UpdateStoreStatusDto,
        @CurrentUser() user: RequestUser,
    ) {
        return this.stores.updateStatusByMerchant(user.id, storeId, dto.status);
    }
}
