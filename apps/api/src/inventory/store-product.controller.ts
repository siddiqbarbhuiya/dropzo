import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/auth.types.js';
import { StoreProductService } from './store-product.service.js';
import { CreateListingDto } from './dto/create-listing.dto.js';
import { UpdateListingDto } from './dto/update-listing.dto.js';
import { ListListingsDto } from './dto/list-listings.dto.js';

/**
 * Merchant-facing store-product (listing) management, scoped under the caller's own store
 * (resolved via StoreService.getOwnStore - see StoreProductService). Never exposes inventory
 * quantity edits here - those go through InventoryController's dedicated receive/adjust/remove
 * endpoints only (see docs/04-design/INVENTORY-MANAGEMENT-DESIGN.md).
 */
@ApiTags('merchant-listings')
@Controller('merchants/me/stores/:storeId/listings')
@Roles('MERCHANT_OWNER')
export class StoreProductController {
    constructor(private readonly listings: StoreProductService) {}

    @Post()
    @ApiOperation({ summary: 'List a product variant for sale at this store.' })
    @ApiOkResponse({ description: 'The created listing.' })
    async create(
        @Param('storeId') storeId: string,
        @Body() dto: CreateListingDto,
        @CurrentUser() user: RequestUser,
    ) {
        return this.listings.createListing(user.id, storeId, dto);
    }

    @Get()
    @ApiOperation({ summary: "List this store's own listings." })
    @ApiOkResponse({ description: 'Paginated list of listings.' })
    async list(
        @Param('storeId') storeId: string,
        @Query() query: ListListingsDto,
        @CurrentUser() user: RequestUser,
    ) {
        return this.listings.listOwnListings(user.id, storeId, query);
    }

    @Get(':listingId')
    @ApiOperation({ summary: "Get one of this store's own listings, with inventory." })
    @ApiOkResponse({ description: 'The listing.' })
    async getOne(
        @Param('storeId') storeId: string,
        @Param('listingId') listingId: string,
        @CurrentUser() user: RequestUser,
    ) {
        return this.listings.getOwnListing(user.id, storeId, listingId);
    }

    @Patch(':listingId')
    @ApiOperation({ summary: 'Update price, MRP, availability, or low-stock threshold.' })
    @ApiOkResponse({ description: 'The updated listing.' })
    async update(
        @Param('storeId') storeId: string,
        @Param('listingId') listingId: string,
        @Body() dto: UpdateListingDto,
        @CurrentUser() user: RequestUser,
    ) {
        return this.listings.updateListing(user.id, storeId, listingId, dto);
    }
}
