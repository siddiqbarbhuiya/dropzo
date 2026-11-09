import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional } from 'class-validator';
import { PaginationDto } from '../../merchant/dto/pagination.dto.js';

export class ListListingsDto extends PaginationDto {
    @ApiPropertyOptional({ description: 'Filter by availability.' })
    @IsOptional()
    @IsBooleanString()
    isAvailable?: string;
}
