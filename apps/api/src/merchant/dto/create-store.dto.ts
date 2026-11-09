import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEmail,
    IsLatitude,
    IsLongitude,
    IsOptional,
    IsString,
    IsTimeZone,
    IsUUID,
    Length,
    MaxLength,
} from 'class-validator';
import { StoreOperatingHoursDto } from './store-operating-hours.dto.js';

export class CreateStoreDto {
    @ApiProperty({ example: 'Barbhuiya General Store - Main Road' })
    @IsString()
    @Length(2, 200)
    name!: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(4000)
    description?: string;

    @ApiPropertyOptional({ example: '9876543210' })
    @IsOptional()
    @IsString()
    @Length(10, 20)
    contactPhone?: string;

    @ApiPropertyOptional({ example: 'store@example.com' })
    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    email?: string;

    @ApiProperty({ example: 'Main Road, near the market' })
    @IsString()
    @Length(5, 2000)
    address!: string;

    @ApiPropertyOptional({ example: 'Market Area' })
    @IsOptional()
    @IsString()
    @MaxLength(150)
    locality?: string;

    @ApiProperty({ example: 'Karimganj' })
    @IsString()
    @Length(2, 100)
    district!: string;

    @ApiProperty({ example: 'Badarpur' })
    @IsString()
    @Length(2, 100)
    city!: string;

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

    @ApiProperty({ example: 24.8656 })
    @IsLatitude()
    latitude!: number;

    @ApiProperty({ example: 92.5121 })
    @IsLongitude()
    longitude!: number;

    @ApiPropertyOptional({ example: 'Asia/Kolkata', default: 'Asia/Kolkata' })
    @IsOptional()
    @IsTimeZone()
    timezone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    serviceZoneId?: string;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    supportsPickup?: boolean;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    supportsDelivery?: boolean;

    @ApiPropertyOptional({ type: StoreOperatingHoursDto })
    @IsOptional()
    @Type(() => StoreOperatingHoursDto)
    openingHours?: StoreOperatingHoursDto;
}
