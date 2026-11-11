import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../../merchant/dto/pagination.dto.js';

// Only the statuses this store-facing inbox ever needs to filter by - the pickup workflow's own
// states plus the two ways an order leaves it early. Not the full `order_status` enum (delivery/
// payment-failure/refund states are a later milestone's concern for this endpoint).
export const MERCHANT_ORDER_STATUS_FILTERS = [
    'CREATED',
    'ACCEPTED',
    'PREPARING',
    'READY',
    'COMPLETED',
    'REJECTED',
    'CANCELLED',
] as const;

export class ListMerchantOrdersDto extends PaginationDto {
    @ApiPropertyOptional({ enum: MERCHANT_ORDER_STATUS_FILTERS })
    @IsOptional()
    @IsIn(MERCHANT_ORDER_STATUS_FILTERS)
    status?: (typeof MERCHANT_ORDER_STATUS_FILTERS)[number];
}
