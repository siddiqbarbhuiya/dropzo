import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    Length,
    ValidateNested,
} from 'class-validator';
import { CreateProductVariantDto } from './product-variant.dto.js';

export class CreateProductDto {
    @ApiProperty({ example: 'Basmati Rice' })
    @IsString()
    @Length(1, 250)
    name!: string;

    @ApiPropertyOptional({ example: 'India Gate' })
    @IsOptional()
    @IsString()
    @Length(1, 150)
    brand?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @ApiPropertyOptional({ default: false, description: 'Whether this is a food product.' })
    @IsOptional()
    @IsBoolean()
    isFood?: boolean;

    @ApiPropertyOptional({ example: 'AMBIENT', description: 'e.g. AMBIENT, REFRIGERATED, FROZEN.' })
    @IsOptional()
    @IsString()
    @Length(1, 40)
    storageType?: string;

    @ApiPropertyOptional({
        description: 'Freeform additional attributes - deliberately not a rigid schema.',
        example: { cuisine: 'Indian' },
    })
    @IsOptional()
    @IsObject()
    attributes?: Record<string, unknown>;

    @ApiPropertyOptional({
        type: [CreateProductVariantDto],
        description:
            'Optionally create the first variant(s) (e.g. 1 kg, 5 kg packs) in the same call.',
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateProductVariantDto)
    variants?: CreateProductVariantDto[];
}
