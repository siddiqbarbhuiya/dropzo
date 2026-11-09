import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MerchantApplicationService } from './merchant-application.service.js';
import { SubmitMerchantApplicationDto } from './dto/submit-merchant-application.dto.js';
import { UpdateMerchantApplicationDto } from './dto/update-merchant-application.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/auth.types.js';

/**
 * Merchant-facing self-service for the applicant's own merchant application. Every method
 * resolves "which merchant" from the authenticated user's id (never a client-supplied merchant
 * id) - see MerchantApplicationService.
 */
@ApiTags('merchant')
@Controller('merchants/me')
export class MerchantApplicationController {
    constructor(private readonly merchantApplications: MerchantApplicationService) {}

    @Post()
    @ApiOperation({ summary: 'Submit (or resubmit, after rejection) a merchant application.' })
    @ApiOkResponse({ description: 'The application was created or resubmitted.' })
    async submit(@Body() dto: SubmitMerchantApplicationDto, @CurrentUser() user: RequestUser) {
        return this.merchantApplications.submitApplication(user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: "Get the caller's own merchant profile/application." })
    @ApiOkResponse({ description: 'The merchant application.' })
    async getOwn(@CurrentUser() user: RequestUser) {
        return this.merchantApplications.getOwnApplication(user.id);
    }

    @Patch()
    @ApiOperation({ summary: "Update the caller's own editable application details." })
    @ApiOkResponse({ description: 'The updated application.' })
    async updateOwn(@Body() dto: UpdateMerchantApplicationDto, @CurrentUser() user: RequestUser) {
        return this.merchantApplications.updateOwnApplication(user.id, dto);
    }

    @Get('dashboard')
    @ApiOperation({ summary: "Summary of the caller's own merchant account and stores." })
    @ApiOkResponse({ description: 'Dashboard summary.' })
    async dashboard(@CurrentUser() user: RequestUser) {
        return this.merchantApplications.getDashboardSummary(user.id);
    }
}
