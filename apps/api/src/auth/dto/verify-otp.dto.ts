import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MinLength } from 'class-validator';

export class VerifyOtpDto {
    @ApiProperty({ example: '9876543210' })
    @IsString()
    @MinLength(10)
    phone!: string;

    @ApiProperty({ example: '123456' })
    @IsString()
    @Length(4, 10)
    code!: string;
}
