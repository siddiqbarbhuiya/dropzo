import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationDto } from '../../merchant/dto/pagination.dto.js';

export class ListDeliveryPartnersDto extends PaginationDto {
    @ApiPropertyOptional({ description: 'Filter by active (approved) status.' })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isActive?: boolean;
}
