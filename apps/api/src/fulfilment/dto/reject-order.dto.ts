import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RejectOrderDto {
    @ApiProperty({ example: 'Out of stock for one of the items.' })
    @IsString()
    @Length(3, 2000)
    reason!: string;
}
