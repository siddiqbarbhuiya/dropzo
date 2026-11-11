import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

/** The user must already exist (registered via OTP login like any other user) - admin grants the
 * DELIVERY_PARTNER role and creates the profile row in one step, mirroring how merchant onboarding
 * never creates a bare user record itself. */
export class CreateDeliveryPartnerDto {
    @ApiProperty({ description: 'An existing user id to grant DELIVERY_PARTNER and onboard.' })
    @IsUUID()
    userId!: string;

    @ApiPropertyOptional({ example: 'Two-wheeler' })
    @IsOptional()
    @IsString()
    @Length(1, 50)
    vehicleType?: string;
}
