import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { PrepareCheckoutDto } from './prepare-checkout.dto.js';

export class CreateOrderDto extends PrepareCheckoutDto {
    @ApiProperty({
        example: 249.0,
        description:
            'The total the customer last saw (from the checkout-preview response). The server ' +
            'always recomputes the authoritative total itself and never charges this value - it is ' +
            'compared only to detect a stale cart (a price or availability change since preview), ' +
            'surfaced as a clear conflict rather than silently charging the new total.',
    })
    @IsNumber()
    @Min(0)
    expectedTotalAmount!: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    customerNotes?: string;
}
