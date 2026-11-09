import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Product, ProductVariant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
import type { ListProductsDto } from './dto/list-products.dto.js';
import type {
    CreateProductVariantDto,
    UpdateProductVariantDto,
} from './dto/product-variant.dto.js';
import type { PaginatedResult } from '../merchant/dto/pagination.dto.js';

type ProductWithVariants = Product & { variants: ProductVariant[] };

/**
 * Global product master + variants (e.g. the same rice product sold as 1kg/5kg/10kg packs are one
 * Product with several ProductVariant rows, never separate unrelated global products - see
 * PRODUCT-CATALOGUE-DESIGN.md). Admin-managed; reads are public.
 */
@Injectable()
export class ProductService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
    ) {}

    async create(adminUserId: string, dto: CreateProductDto): Promise<ProductWithVariants> {
        const product = await this.prisma.$transaction(async (tx) => {
            const created = await tx.product.create({
                data: {
                    name: dto.name,
                    brand: dto.brand,
                    description: dto.description,
                    category_id: dto.categoryId,
                    is_food: dto.isFood ?? false,
                    storage_type: dto.storageType,
                    attributes: (dto.attributes ?? {}) as Prisma.InputJsonValue,
                },
            });
            for (const variant of dto.variants ?? []) {
                await tx.productVariant.create({
                    data: {
                        product_id: created.id,
                        variant_name: variant.variantName,
                        unit: variant.unit,
                        pack_size: variant.packSize,
                        sku: variant.sku,
                        barcode: variant.barcode,
                    },
                });
            }
            return created;
        });
        await this.audit.record({
            actorUserId: adminUserId,
            action: 'PRODUCT_CREATED',
            entityType: 'product',
            entityId: product.id,
        });
        return this.getByIdOrThrow(product.id);
    }

    async update(
        adminUserId: string,
        id: string,
        dto: UpdateProductDto,
    ): Promise<ProductWithVariants> {
        await this.getByIdOrThrow(id);
        await this.prisma.product.update({
            where: { id },
            data: {
                name: dto.name,
                brand: dto.brand,
                description: dto.description,
                category_id: dto.categoryId,
                is_food: dto.isFood,
                storage_type: dto.storageType,
                attributes: dto.attributes as Prisma.InputJsonValue | undefined,
                is_active: dto.isActive,
            },
        });
        await this.audit.record({
            actorUserId: adminUserId,
            action: 'PRODUCT_UPDATED',
            entityType: 'product',
            entityId: id,
        });
        return this.getByIdOrThrow(id);
    }

    async addVariant(
        adminUserId: string,
        productId: string,
        dto: CreateProductVariantDto,
    ): Promise<ProductVariant> {
        await this.getByIdOrThrow(productId);
        try {
            const variant = await this.prisma.productVariant.create({
                data: {
                    product_id: productId,
                    variant_name: dto.variantName,
                    unit: dto.unit,
                    pack_size: dto.packSize,
                    sku: dto.sku,
                    barcode: dto.barcode,
                },
            });
            await this.audit.record({
                actorUserId: adminUserId,
                action: 'PRODUCT_VARIANT_CREATED',
                entityType: 'product_variant',
                entityId: variant.id,
            });
            return variant;
        } catch {
            throw new ConflictException('A variant with this SKU already exists.');
        }
    }

    async updateVariant(
        adminUserId: string,
        productId: string,
        variantId: string,
        dto: UpdateProductVariantDto,
    ): Promise<ProductVariant> {
        const variant = await this.getVariantOrThrow(productId, variantId);
        const updated = await this.prisma.productVariant.update({
            where: { id: variant.id },
            data: {
                variant_name: dto.variantName,
                unit: dto.unit,
                pack_size: dto.packSize,
                sku: dto.sku,
                barcode: dto.barcode,
                is_active: dto.isActive,
            },
        });
        await this.audit.record({
            actorUserId: adminUserId,
            action: 'PRODUCT_VARIANT_UPDATED',
            entityType: 'product_variant',
            entityId: variant.id,
        });
        return updated;
    }

    async list(query: ListProductsDto): Promise<PaginatedResult<ProductWithVariants>> {
        const where: Prisma.ProductWhereInput = {
            ...(query.categoryId ? { category_id: query.categoryId } : {}),
            ...(query.brand ? { brand: { equals: query.brand, mode: 'insensitive' } } : {}),
            ...(query.search
                ? {
                      OR: [
                          { name: { contains: query.search, mode: 'insensitive' } },
                          { brand: { contains: query.search, mode: 'insensitive' } },
                      ],
                  }
                : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                include: { variants: true },
                orderBy: { name: 'asc' },
                skip: (query.page - 1) * query.limit,
                take: query.limit,
            }),
            this.prisma.product.count({ where }),
        ]);
        return {
            data,
            meta: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / query.limit)),
            },
        };
    }

    async getByIdOrThrow(id: string): Promise<ProductWithVariants> {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: { variants: true },
        });
        if (!product) {
            throw new NotFoundException('Product not found.');
        }
        return product;
    }

    async getVariantOrThrow(productId: string, variantId: string): Promise<ProductVariant> {
        const variant = await this.prisma.productVariant.findFirst({
            where: { id: variantId, product_id: productId },
        });
        if (!variant) {
            throw new NotFoundException('Product variant not found.');
        }
        return variant;
    }
}
