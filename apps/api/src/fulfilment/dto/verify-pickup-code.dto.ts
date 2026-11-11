import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, Length } from 'class-validator';

export class VerifyPickupCodeDto {
    @ApiProperty({ example: '482913', description: 'The 6-digit code the customer presents.' })
    @IsNumberString()
    @Length(6, 6)
    code!: string;
}
