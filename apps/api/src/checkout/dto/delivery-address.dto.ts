import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsLatitude, IsLongitude, IsOptional, IsString, Length, MaxLength } from 'class-validator';

/**
 * Inline delivery details for an order with no saved address book to draw from yet (customer
 * address CRUD is FR-LOC-001, still Planned - out of BC-008's scope). A future address-book
 * milestone can add `deliveryAddressId` support against this same shape without changing it.
 */
export class DeliveryAddressDto {
    @ApiPropertyOptional({ example: 'Priya Devi' })
    @IsString()
    @Length(2, 150)
    recipientName!: string;

    @ApiPropertyOptional({ example: '9876543210' })
    @IsString()
    @Length(10, 20)
    recipientPhone!: string;

    @ApiPropertyOptional({ example: 'House 12, Near Market Road' })
    @IsString()
    @Length(5, 2000)
    addressLine1!: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    addressLine2?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(500)
    landmark?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(150)
    locality?: string;

    @ApiPropertyOptional({ example: 'Badarpur' })
    @IsString()
    @Length(2, 100)
    city!: string;

    @ApiPropertyOptional({ example: 'Karimganj' })
    @IsString()
    @Length(2, 100)
    district!: string;

    @ApiPropertyOptional({ example: 'Assam' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    state?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(10)
    postalCode?: string;

    @ApiPropertyOptional({ example: 24.86 })
    @IsLatitude()
    latitude!: number;

    @ApiPropertyOptional({ example: 92.51 })
    @IsLongitude()
    longitude!: number;
}
