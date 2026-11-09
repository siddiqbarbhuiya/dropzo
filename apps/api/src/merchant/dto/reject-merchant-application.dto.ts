import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RejectMerchantApplicationDto {
    @ApiProperty({ example: 'Business address could not be verified.' })
    @IsString()
    @Length(5, 2000)
    reason!: string;
}
