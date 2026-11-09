import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class AddCartItemDto {
    @ApiProperty({ description: 'The store_products id to add - must be active and available.' })
    @IsUUID()
    storeProductId!: string;

    @ApiProperty({ example: 2, description: "Quantity to add, in the variant's unit." })
    @IsNumber()
    @Min(0.001)
    quantity!: number;
}
