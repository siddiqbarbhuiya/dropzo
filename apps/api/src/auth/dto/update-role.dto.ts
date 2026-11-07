import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export const ASSIGNABLE_ROLES = [
    'CUSTOMER',
    'MERCHANT_OWNER',
    'MERCHANT_STAFF',
    'DELIVERY_PARTNER',
    'ADMIN',
    'SUPER_ADMIN',
    'SUPPORT_AGENT',
] as const;

export class UpdateRoleDto {
    @ApiProperty({ enum: ASSIGNABLE_ROLES })
    @IsString()
    @IsIn(ASSIGNABLE_ROLES)
    role!: (typeof ASSIGNABLE_ROLES)[number];

    @ApiProperty({ enum: ['GRANT', 'REVOKE'] })
    @IsString()
    @IsIn(['GRANT', 'REVOKE'])
    action!: 'GRANT' | 'REVOKE';
}
