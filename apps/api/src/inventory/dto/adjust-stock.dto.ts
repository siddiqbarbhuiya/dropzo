import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Length, NotEquals } from 'class-validator';

/**
 * A manual correction, not routine receiving/selling - e.g. a stocktake found more or less than
 * the system shows. Always requires a reason (recorded on the stock_movements row) and is always
 * an ADJUSTED movement, positive or negative.
 */
export class AdjustStockDto {
    @ApiProperty({
        example: -3,
        description:
            "Signed change to apply, in the unit's quantity. Positive increases stock, negative decreases it.",
    })
    @IsNumber()
    @NotEquals(0)
    quantityDelta!: number;

    @ApiProperty({ example: 'Stocktake count correction - 3 units unaccounted for.' })
    @IsString()
    @Length(3, 2000)
    reason!: string;

    @ApiPropertyOptional({
        description:
            'For a batch-tracked listing, adjust this specific batch. If omitted on a ' +
            'decrease, the earliest-expiring eligible batch(es) are chosen (FEFO).',
    })
    @IsOptional()
    @IsUUID()
    batchId?: string;
}
