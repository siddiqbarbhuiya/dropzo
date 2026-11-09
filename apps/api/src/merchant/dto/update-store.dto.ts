import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateStoreDto } from './create-store.dto.js';

// Operating hours and pickup/delivery availability each get their own focused endpoint/DTO
// (UpdateStoreHoursDto, UpdateStoreAvailabilityDto) so a client changing one doesn't need to
// resend the other, and so each has its own clear audit action.
export class UpdateStoreDto extends PartialType(
    OmitType(CreateStoreDto, ['openingHours', 'supportsPickup', 'supportsDelivery'] as const),
) {}
