import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

/** Shared shape for every action that requires a mandatory reason (reject, fail, cancel). */
export class ReasonDto {
    @ApiProperty({ example: 'Customer unreachable after three attempts.' })
    @IsString()
    @Length(3, 2000)
    reason!: string;
}
