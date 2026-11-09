import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const STORE_STATUS_VALUES = ['PENDING', 'ACTIVE', 'PAUSED', 'SUSPENDED', 'CLOSED'] as const;

export class UpdateStoreStatusDto {
    @ApiProperty({ enum: STORE_STATUS_VALUES })
    @IsIn(STORE_STATUS_VALUES)
    status!: (typeof STORE_STATUS_VALUES)[number];
}
