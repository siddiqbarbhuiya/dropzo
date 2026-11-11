import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { StoreOperatingHoursDto } from './store-operating-hours.dto.js';

export class ListPublicStoresQueryDto {
    @ApiPropertyOptional({ example: 'Badarpur', description: 'Filter by locality name.' })
    @IsOptional()
    @IsString()
    locality?: string;

    @ApiPropertyOptional({ example: true, description: 'Filter stores supporting counter pickup.' })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    supportsPickup?: boolean;

    @ApiPropertyOptional({ example: true, description: 'Filter stores supporting home delivery.' })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    supportsDelivery?: boolean;

    @ApiPropertyOptional({ example: 1, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @ApiPropertyOptional({ example: 20, default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit: number = 20;
}

export class ListPublicProductsQueryDto {
    @ApiPropertyOptional({ example: 'cat_uuid', description: 'Filter products by category ID.' })
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional({
        example: 'atta',
        description: 'Search term for product or variant name.',
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ example: 1, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @ApiPropertyOptional({ example: 30, default: 30 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit: number = 30;
}

export class PublicStoreDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    name!: string;

    @ApiPropertyOptional()
    description?: string | null;

    @ApiProperty()
    address!: string;

    @ApiPropertyOptional()
    locality?: string | null;

    @ApiProperty()
    district!: string;

    @ApiProperty()
    city!: string;

    @ApiPropertyOptional()
    contact_phone?: string | null;

    @ApiProperty()
    supports_pickup!: boolean;

    @ApiProperty()
    supports_delivery!: boolean;

    @ApiPropertyOptional()
    opening_hours?: StoreOperatingHoursDto | null;

    @ApiProperty({ description: 'Calculated store status based on operating hours and IST time.' })
    is_open!: boolean;
}

export class PublicProductListingDto {
    @ApiProperty({ description: 'Store listing ID used when adding to cart.' })
    id!: string;

    @ApiProperty()
    store_id!: string;

    @ApiProperty()
    product_id!: string;

    @ApiProperty()
    product_name!: string;

    @ApiPropertyOptional()
    product_description?: string | null;

    @ApiPropertyOptional()
    category_id?: string | null;

    @ApiPropertyOptional()
    category_name?: string | null;

    @ApiProperty()
    variant_id!: string;

    @ApiProperty()
    variant_name!: string;

    @ApiPropertyOptional()
    sku?: string | null;

    @ApiPropertyOptional()
    pack_size?: number | null;

    @ApiPropertyOptional()
    unit?: string | null;

    @ApiProperty({ example: 180.0 })
    selling_price!: number;

    @ApiPropertyOptional({ example: 200.0 })
    mrp?: number | null;

    @ApiProperty({ description: 'Whether the item has available inventory to purchase.' })
    in_stock!: boolean;

    @ApiProperty({ description: 'Whether available stock is below or at low-stock threshold.' })
    low_stock!: boolean;
}
