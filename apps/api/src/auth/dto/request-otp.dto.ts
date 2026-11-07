import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RequestOtpDto {
    @ApiProperty({
        example: '9876543210',
        description: 'An Indian mobile number, any common format.',
    })
    @IsString()
    @MinLength(10)
    phone!: string;
}
