import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/auth.types.js';
import { ProductService } from './product.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ListProductsDto } from './dto/list-products.dto.js';
import { CreateProductVariantDto, UpdateProductVariantDto } from './dto/product-variant.dto.js';

@ApiTags('catalogue')
@Controller('products')
export class ProductController {
    constructor(private readonly products: ProductService) {}

    @Public()
    @Get()
    @ApiOperation({ summary: 'Search/list products with their variants.' })
    @ApiOkResponse({ description: 'Paginated list of products.' })
    async list(@Query() query: ListProductsDto) {
        return this.products.list(query);
    }

    @Public()
    @Get(':id')
    @ApiOperation({ summary: 'Get one product with its variants.' })
    @ApiOkResponse({ description: 'The product.' })
    async getOne(@Param('id') id: string) {
        return this.products.getByIdOrThrow(id);
    }
}

@ApiTags('admin')
@Controller('admin/products')
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminProductController {
    constructor(private readonly products: ProductService) {}

    @Post()
    @ApiOperation({ summary: 'Create a product, optionally with its first variant(s).' })
    @ApiOkResponse({ description: 'The created product.' })
    async create(@Body() dto: CreateProductDto, @CurrentUser() admin: RequestUser) {
        return this.products.create(admin.id, dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update or (de)activate a product.' })
    @ApiOkResponse({ description: 'The updated product.' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateProductDto,
        @CurrentUser() admin: RequestUser,
    ) {
        return this.products.update(admin.id, id, dto);
    }

    @Post(':id/variants')
    @ApiOperation({ summary: 'Add a variant (e.g. a different pack size) to a product.' })
    @ApiOkResponse({ description: 'The created variant.' })
    async addVariant(
        @Param('id') id: string,
        @Body() dto: CreateProductVariantDto,
        @CurrentUser() admin: RequestUser,
    ) {
        return this.products.addVariant(admin.id, id, dto);
    }

    @Patch(':id/variants/:variantId')
    @ApiOperation({ summary: 'Update or (de)activate a variant.' })
    @ApiOkResponse({ description: 'The updated variant.' })
    async updateVariant(
        @Param('id') id: string,
        @Param('variantId') variantId: string,
        @Body() dto: UpdateProductVariantDto,
        @CurrentUser() admin: RequestUser,
    ) {
        return this.products.updateVariant(admin.id, id, variantId, dto);
    }
}
