import { PartialType } from '@nestjs/swagger';
import { SubmitMerchantApplicationDto } from './submit-merchant-application.dto.js';

// Every field the merchant may edit about their own business profile. Deliberately excludes
// verificationStatus, commissionPercent, ownerUserId, reviewedAt/By, rejectionReason - none of
// those are ever client-settable (see MerchantApplicationService.updateOwnApplication).
export class UpdateMerchantApplicationDto extends PartialType(SubmitMerchantApplicationDto) {}
