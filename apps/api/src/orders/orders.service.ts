import { Injectable, NotFoundException } from '@nestjs/common';
import type { Order } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PaginatedResult } from '../merchant/dto/pagination.dto.js';
import type { ListOrdersDto } from './dto/list-orders.dto.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ORDER_INCLUDE = {
    items: true,
    status_history: { orderBy: { created_at: 'asc' as const } },
    payments: true,
};

/**
 * Customer-facing order retrieval only - no merchant fulfilment screens, no delivery assignment
 * (BC-008 scope boundary, see ORDER-MANAGEMENT-DESIGN.md). Every lookup is scoped to the
 * authenticated customer; an order id/number belonging to another customer is never returned
 * (404, not 403, to avoid confirming the id/number exists at all).
 */
@Injectable()
export class OrdersService {
    constructor(private readonly prisma: PrismaService) {}

    async listOwnOrders(userId: string, query: ListOrdersDto): Promise<PaginatedResult<Order>> {
        const where = { customer_id: userId, ...(query.status ? { status: query.status } : {}) };
        const [data, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                include: ORDER_INCLUDE,
                orderBy: { created_at: 'desc' },
                skip: (query.page - 1) * query.limit,
                take: query.limit,
            }),
            this.prisma.order.count({ where }),
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

    async getOwnOrder(userId: string, idOrNumber: string): Promise<Order> {
        // A UUID-shaped lookup key is tried against `id`; anything else only ever makes sense as
        // an order_number - never pass a non-UUID string to a `WHERE id = ...` filter on a UUID
        // column, which Prisma would reject with a validation error (a 500) rather than a clean
        // "not found".
        const order = await this.prisma.order.findFirst({
            where: {
                customer_id: userId,
                OR: UUID_PATTERN.test(idOrNumber)
                    ? [{ id: idOrNumber }, { order_number: idOrNumber }]
                    : [{ order_number: idOrNumber }],
            },
            include: ORDER_INCLUDE,
        });
        if (!order) {
            throw new NotFoundException('Order not found.');
        }
        return order;
    }
}
