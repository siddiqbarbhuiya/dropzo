import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator.js';
import { StoreService } from './store.service.js';
import { StoreProductService } from '../inventory/store-product.service.js';
import {
    ListPublicProductsQueryDto,
    ListPublicStoresQueryDto,
    PublicProductListingDto,
    PublicStoreDto,
} from './dto/public-store.dto.js';
import type { PaginatedResult } from './dto/pagination.dto.js';

@ApiTags('stores')
@Controller('stores')
@Public()
export class PublicStoreController {
    constructor(
        private readonly stores: StoreService,
        private readonly storeProducts: StoreProductService,
    ) {}

    @Get()
    @ApiOperation({
        summary: 'List active stores in Badarpur with live opening status and SLA flags.',
    })
    @ApiOkResponse({
        description: 'Paginated list of active public stores.',
        type: PublicStoreDto,
        isArray: true,
    })
    async list(@Query() query: ListPublicStoresQueryDto): Promise<PaginatedResult<PublicStoreDto>> {
        return this.stores.listPublicStores(query);
    }

    @Get(':storeId')
    @ApiOperation({ summary: 'Get details of an active store.' })
    @ApiOkResponse({ description: 'The public store details.', type: PublicStoreDto })
    async getOne(@Param('storeId') storeId: string): Promise<PublicStoreDto> {
        return this.stores.getPublicStore(storeId);
    }

    @Get(':storeId/products')
    @ApiOperation({
        summary: 'List available product variants for a store with pricing and in-stock indicator.',
    })
    @ApiOkResponse({
        description: 'Paginated list of published store products.',
        type: PublicProductListingDto,
        isArray: true,
    })
    async listProducts(
        @Param('storeId') storeId: string,
        @Query() query: ListPublicProductsQueryDto,
    ): Promise<PaginatedResult<PublicProductListingDto>> {
        return this.storeProducts.listPublicStoreProducts(storeId, query);
    }
}
