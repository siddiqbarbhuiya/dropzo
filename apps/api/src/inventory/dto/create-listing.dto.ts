import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateListingDto {
    @ApiProperty({ description: 'The global ProductVariant being listed at this store.' })
    @IsUUID()
    variantId!: string;

    @ApiProperty({ example: 120.0 })
    @IsNumber()
    @Min(0)
    sellingPrice!: number;

    @ApiPropertyOptional({ example: 135.0, description: 'MRP, where applicable.' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    mrp?: number;

    @ApiPropertyOptional({
        default: false,
        description:
            'Whether this listing tracks stock by expiry-dated batches (perishables) ' +
            'or as a single aggregate count (shelf-stable goods).',
    })
    @IsOptional()
    @IsBoolean()
    usesBatchTracking?: boolean;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isAvailable?: boolean;

    @ApiPropertyOptional({ default: 0, description: 'Low-stock alert threshold.' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    lowStockThreshold?: number;
}
