import { Module } from '@nestjs/common';
import { CategoryService } from './category.service.js';
import { CategoryController, AdminCategoryController } from './category.controller.js';
import { ProductService } from './product.service.js';
import { ProductController, AdminProductController } from './product.controller.js';

@Module({
    controllers: [
        CategoryController,
        AdminCategoryController,
        ProductController,
        AdminProductController,
    ],
    providers: [CategoryService, ProductService],
    exports: [CategoryService, ProductService],
})
export class CatalogueModule {}
