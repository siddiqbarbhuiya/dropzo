import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreateCategoryDto {
    @ApiProperty({ example: 'Rice & Pulses' })
    @IsString()
    @Length(1, 120)
    name!: string;

    @ApiPropertyOptional({
        description: 'URL-safe identifier. Auto-generated from the name when omitted.',
        example: 'rice-pulses',
    })
    @IsOptional()
    @IsString()
    @Length(1, 140)
    slug?: string;

    @ApiPropertyOptional({ description: 'Parent category id, for a subcategory.' })
    @IsOptional()
    @IsUUID()
    parentId?: string;

    @ApiPropertyOptional({ default: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;
}
