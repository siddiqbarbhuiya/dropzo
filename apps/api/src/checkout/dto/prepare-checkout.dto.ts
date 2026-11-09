import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryAddressDto } from './delivery-address.dto.js';

export const FULFILMENT_TYPES = ['PICKUP', 'DELIVERY'] as const;

export class PrepareCheckoutDto {
    @ApiProperty({ enum: FULFILMENT_TYPES })
    @IsIn(FULFILMENT_TYPES)
    fulfilmentType!: (typeof FULFILMENT_TYPES)[number];

    @ApiPropertyOptional({ description: 'Required when fulfilmentType is DELIVERY.' })
    @IsOptional()
    @ValidateNested()
    @Type(() => DeliveryAddressDto)
    deliveryAddress?: DeliveryAddressDto;
}
