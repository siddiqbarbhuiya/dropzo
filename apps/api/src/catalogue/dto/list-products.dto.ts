import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../merchant/dto/pagination.dto.js';

export class ListProductsDto extends PaginationDto {
    @ApiPropertyOptional({ description: 'Case-insensitive substring match on name or brand.' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    brand?: string;
}
