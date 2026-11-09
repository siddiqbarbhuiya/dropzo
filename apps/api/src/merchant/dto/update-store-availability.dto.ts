import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateStoreAvailabilityDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    supportsPickup?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    supportsDelivery?: boolean;
}
