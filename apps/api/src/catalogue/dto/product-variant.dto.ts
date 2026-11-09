import { ApiPropertyOptional, ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateProductVariantDto {
    @ApiProperty({ example: '1 kg pack' })
    @IsString()
    @Length(1, 150)
    variantName!: string;

    @ApiProperty({ example: 'kg', description: 'Unit of measurement for this sellable unit.' })
    @IsString()
    @Length(1, 30)
    unit!: string;

    @ApiPropertyOptional({ example: 1, description: 'Pack size in the given unit, e.g. 1 (kg).' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    packSize?: number;

    @ApiPropertyOptional({ example: 'SKU-RICE-1KG' })
    @IsOptional()
    @IsString()
    @Length(1, 100)
    sku?: string;

    @ApiPropertyOptional({ example: '8901234567890' })
    @IsOptional()
    @IsString()
    @Length(1, 100)
    barcode?: string;
}

export class UpdateProductVariantDto extends PartialType(CreateProductVariantDto) {
    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
