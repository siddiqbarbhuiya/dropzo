import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

// Deliberately excludes usesBatchTracking and variantId - switching a listing's tracking mode
// after it already has stock would leave existing stock_batches/inventory counters inconsistent;
// that migration (if ever needed) is a distinct, deliberate operation, not an ordinary field edit.
export class UpdateListingDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    sellingPrice?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    mrp?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isAvailable?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    lowStockThreshold?: number;
}
