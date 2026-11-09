import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class SubmitMerchantApplicationDto {
    @ApiProperty({ example: 'Barbhuiya General Store Pvt Ltd' })
    @IsString()
    @Length(2, 200)
    legalName!: string;

    @ApiProperty({ example: 'Barbhuiya General Store' })
    @IsString()
    @Length(2, 200)
    displayName!: string;

    @ApiPropertyOptional({ example: 'Grocery' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    businessType?: string;

    @ApiPropertyOptional({ example: 'Rahim Uddin Barbhuiya' })
    @IsOptional()
    @IsString()
    @MaxLength(150)
    contactPersonName?: string;

    @ApiProperty({ example: '9876543210', description: 'An Indian mobile number.' })
    @IsString()
    @Length(10, 20)
    contactPhone!: string;

    @ApiPropertyOptional({ example: 'store@example.com' })
    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    businessEmail?: string;

    @ApiProperty({ example: 'Main Road, near the market' })
    @IsString()
    @Length(5, 2000)
    businessAddress!: string;

    @ApiPropertyOptional({ example: 'Badarpur' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    city?: string;

    @ApiPropertyOptional({ example: 'Karimganj' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    district?: string;

    @ApiPropertyOptional({ example: 'Assam' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    state?: string;

    @ApiPropertyOptional({ example: '788801' })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    postalCode?: string;

    @ApiPropertyOptional({ example: 'We sell groceries and household essentials.' })
    @IsOptional()
    @IsString()
    @MaxLength(4000)
    businessDescription?: string;
}
