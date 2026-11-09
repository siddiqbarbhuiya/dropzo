import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/auth.types.js';
import { CategoryService } from './category.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { ListCategoriesDto } from './dto/list-categories.dto.js';

@ApiTags('catalogue')
@Controller('categories')
export class CategoryController {
    constructor(private readonly categories: CategoryService) {}

    @Public()
    @Get()
    @ApiOperation({ summary: 'List categories, optionally filtered by parent or name search.' })
    @ApiOkResponse({ description: 'Paginated list of categories.' })
    async list(@Query() query: ListCategoriesDto) {
        return this.categories.list(query);
    }

    @Public()
    @Get(':id')
    @ApiOperation({ summary: 'Get one category by id.' })
    @ApiOkResponse({ description: 'The category.' })
    async getOne(@Param('id') id: string) {
        return this.categories.getByIdOrThrow(id);
    }
}

@ApiTags('admin')
@Controller('admin/categories')
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminCategoryController {
    constructor(private readonly categories: CategoryService) {}

    @Post()
    @ApiOperation({ summary: 'Create a category or subcategory.' })
    @ApiOkResponse({ description: 'The created category.' })
    async create(@Body() dto: CreateCategoryDto, @CurrentUser() admin: RequestUser) {
        return this.categories.create(admin.id, dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update or (de)activate a category.' })
    @ApiOkResponse({ description: 'The updated category.' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateCategoryDto,
        @CurrentUser() admin: RequestUser,
    ) {
        return this.categories.update(admin.id, id, dto);
    }
}
