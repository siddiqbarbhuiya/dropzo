import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../merchant/dto/pagination.dto.js';

export class ListCategoriesDto extends PaginationDto {
    @ApiPropertyOptional({ description: 'Only direct children of this category.' })
    @IsOptional()
    @IsUUID()
    parentId?: string;

    @ApiPropertyOptional({ description: 'Case-insensitive substring match on name.' })
    @IsOptional()
    @IsString()
    search?: string;
}
