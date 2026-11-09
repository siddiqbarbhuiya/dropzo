import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from './pagination.dto.js';

export const MERCHANT_VERIFICATION_STATUSES = [
    'DRAFT',
    'PENDING',
    'APPROVED',
    'REJECTED',
    'SUSPENDED',
] as const;

export class ListMerchantApplicationsDto extends PaginationDto {
    @ApiPropertyOptional({ enum: MERCHANT_VERIFICATION_STATUSES })
    @IsOptional()
    @IsIn(MERCHANT_VERIFICATION_STATUSES)
    status?: (typeof MERCHANT_VERIFICATION_STATUSES)[number];
}
