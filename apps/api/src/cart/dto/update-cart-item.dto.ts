import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdateCartItemDto {
    @ApiProperty({ example: 3, description: 'The absolute new quantity (not a delta).' })
    @IsNumber()
    @Min(0.001)
    quantity!: number;
}
