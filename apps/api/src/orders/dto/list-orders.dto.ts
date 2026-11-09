import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../../merchant/dto/pagination.dto.js';

export const ORDER_STATUS_FILTERS = [
    'CREATED',
    'PAYMENT_PENDING',
    'CONFIRMED',
    'ACCEPTED',
    'PREPARING',
    'READY',
    'PICKED_UP',
    'ASSIGNED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'COMPLETED',
    'REJECTED',
    'CANCELLED',
    'PAYMENT_FAILED',
    'REFUND_PENDING',
    'REFUNDED',
    'DELIVERY_FAILED',
] as const;

export class ListOrdersDto extends PaginationDto {
    @ApiPropertyOptional({ enum: ORDER_STATUS_FILTERS })
    @IsOptional()
    @IsIn(ORDER_STATUS_FILTERS)
    status?: (typeof ORDER_STATUS_FILTERS)[number];
}
