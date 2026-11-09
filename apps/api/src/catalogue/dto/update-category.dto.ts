import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCategoryDto } from './create-category.dto.js';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
    @ApiPropertyOptional({ description: 'Deactivate (false) or reactivate (true) this category.' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
