import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class ReceiveStockDto {
    @ApiProperty({ example: 50, description: "Quantity being received, in the variant's unit." })
    @IsNumber()
    @Min(0.001)
    quantity!: number;

    @ApiPropertyOptional({
        description:
            'For a batch-tracked listing: top up this existing batch instead of ' +
            'creating a new one (e.g. a second delivery of the same batch).',
    })
    @IsOptional()
    @IsUUID()
    batchId?: string;

    @ApiPropertyOptional({ example: 'LOT-2026-11-09' })
    @IsOptional()
    @IsString()
    @Length(1, 100)
    batchCode?: string;

    @ApiPropertyOptional({ example: '2026-11-09' })
    @IsOptional()
    @IsDateString()
    manufactureDate?: string;

    @ApiPropertyOptional({ example: '2027-05-09' })
    @IsOptional()
    @IsDateString()
    expiryDate?: string;

    @ApiPropertyOptional({ example: 95.5 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    costPrice?: number;
}
