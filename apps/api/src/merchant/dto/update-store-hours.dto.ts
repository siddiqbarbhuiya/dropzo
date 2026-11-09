import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { StoreOperatingHoursDto } from './store-operating-hours.dto.js';

export class UpdateStoreHoursDto {
    @ApiProperty({ type: StoreOperatingHoursDto })
    @ValidateNested()
    @Type(() => StoreOperatingHoursDto)
    openingHours!: StoreOperatingHoursDto;
}
