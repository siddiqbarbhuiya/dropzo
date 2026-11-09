import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class SuspendMerchantDto {
    @ApiProperty({ example: 'Repeated customer complaints under investigation.' })
    @IsString()
    @Length(5, 2000)
    reason!: string;
}
