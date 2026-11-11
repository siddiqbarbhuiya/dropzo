import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsOptional,
    IsString,
    IsUUID,
    Length,
} from 'class-validator';

export class RecordHandoverDto {
    @ApiProperty()
    @IsUUID()
    deliveryPartnerId!: string;

    @ApiProperty({ description: 'Order ids of the collected-but-not-yet-handed-over assignments.' })
    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique()
    @IsUUID('4', { each: true })
    orderIds!: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @Length(0, 2000)
    notes?: string;
}
