import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

// Matches AddCartItemDto's ceiling - see its comment for why.
const MAX_CART_ITEM_QUANTITY = 1000;

export class UpdateCartItemDto {
    @ApiProperty({ example: 3, description: 'The absolute new quantity (not a delta).' })
    @IsNumber()
    @Min(0.001)
    @Max(MAX_CART_ITEM_QUANTITY)
    quantity!: number;
}
