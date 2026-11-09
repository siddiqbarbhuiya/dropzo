import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export const STOCK_REMOVAL_TYPES = ['DAMAGED', 'EXPIRED'] as const;

export class RemoveStockDto {
    @ApiProperty({ enum: STOCK_REMOVAL_TYPES })
    @IsIn(STOCK_REMOVAL_TYPES)
    type!: (typeof STOCK_REMOVAL_TYPES)[number];

    @ApiProperty({ example: 2 })
    @IsNumber()
    @Min(0.001)
    quantity!: number;

    @ApiProperty({ example: 'Crushed during shelving.' })
    @IsString()
    @Length(3, 2000)
    reason!: string;

    @ApiPropertyOptional({
        description:
            'For a batch-tracked listing, remove from this specific batch. If omitted, ' +
            'the earliest-expiring eligible batch(es) are chosen (FEFO).',
    })
    @IsOptional()
    @IsUUID()
    batchId?: string;
}
