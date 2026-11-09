import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Category } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import type { CreateCategoryDto } from './dto/create-category.dto.js';
import type { UpdateCategoryDto } from './dto/update-category.dto.js';
import type { ListCategoriesDto } from './dto/list-categories.dto.js';
import type { PaginatedResult } from '../merchant/dto/pagination.dto.js';

function slugify(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 140);
}

/** Global product taxonomy. Admin-managed; reads are public (catalogue browsing needs no auth). */
@Injectable()
export class CategoryService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
    ) {}

    async create(adminUserId: string, dto: CreateCategoryDto): Promise<Category> {
        const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
        if (dto.parentId) {
            await this.getByIdOrThrow(dto.parentId);
        }
        try {
            const category = await this.prisma.category.create({
                data: {
                    name: dto.name,
                    slug,
                    parent_id: dto.parentId,
                    sort_order: dto.sortOrder ?? 0,
                },
            });
            await this.audit.record({
                actorUserId: adminUserId,
                action: 'CATEGORY_CREATED',
                entityType: 'category',
                entityId: category.id,
            });
            return category;
        } catch {
            throw new ConflictException(`A category with slug "${slug}" already exists.`);
        }
    }

    async update(adminUserId: string, id: string, dto: UpdateCategoryDto): Promise<Category> {
        await this.getByIdOrThrow(id);
        if (dto.parentId) {
            if (dto.parentId === id) {
                throw new ConflictException('A category cannot be its own parent.');
            }
            await this.getByIdOrThrow(dto.parentId);
        }
        const updated = await this.prisma.category.update({
            where: { id },
            data: {
                name: dto.name,
                slug: dto.slug ? slugify(dto.slug) : undefined,
                parent_id: dto.parentId,
                sort_order: dto.sortOrder,
                is_active: dto.isActive,
            },
        });
        await this.audit.record({
            actorUserId: adminUserId,
            action: 'CATEGORY_UPDATED',
            entityType: 'category',
            entityId: id,
        });
        return updated;
    }

    async list(query: ListCategoriesDto): Promise<PaginatedResult<Category>> {
        const where = {
            ...(query.parentId ? { parent_id: query.parentId } : {}),
            ...(query.search
                ? { name: { contains: query.search, mode: 'insensitive' as const } }
                : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.category.findMany({
                where,
                orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
                skip: (query.page - 1) * query.limit,
                take: query.limit,
            }),
            this.prisma.category.count({ where }),
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

    async getByIdOrThrow(id: string): Promise<Category> {
        const category = await this.prisma.category.findUnique({ where: { id } });
        if (!category) {
            throw new NotFoundException('Category not found.');
        }
        return category;
    }
}
