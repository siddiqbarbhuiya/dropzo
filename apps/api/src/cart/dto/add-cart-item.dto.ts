import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Max, Min } from 'class-validator';

// A generous but finite ceiling on a single cart line - large enough for any genuine grocery
// order, small enough to bound how much stock one line item can tie up in a single request
// (flagged by automated security review: unbounded quantity has no natural limit otherwise, since
// stock sufficiency alone doesn't stop a request for an implausibly large amount of a small-stock
// item from being retried until it succeeds).
const MAX_CART_ITEM_QUANTITY = 1000;

export class AddCartItemDto {
    @ApiProperty({ description: 'The store_products id to add - must be active and available.' })
    @IsUUID()
    storeProductId!: string;

    @ApiProperty({ example: 2, description: "Quantity to add, in the variant's unit." })
    @IsNumber()
    @Min(0.001)
    @Max(MAX_CART_ITEM_QUANTITY)
    quantity!: number;
}
