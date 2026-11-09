import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';

import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/auth.types.js';
import { MerchantApplicationService } from './merchant-application.service.js';
import { StoreService } from './store.service.js';
import { ListMerchantApplicationsDto } from './dto/list-merchant-applications.dto.js';
import { RejectMerchantApplicationDto } from './dto/reject-merchant-application.dto.js';
import { SuspendMerchantDto } from './dto/suspend-merchant.dto.js';
import { UpdateStoreStatusDto } from './dto/update-store-status.dto.js';
import { PaginationDto } from './dto/pagination.dto.js';

/** Admin-only merchant/store lifecycle operations. ADMIN/SUPER_ADMIN only, every decision audited. */
@ApiTags('admin')
@Controller('admin/merchants')
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminMerchantsController {
    constructor(
        private readonly merchantApplications: MerchantApplicationService,
        private readonly stores: StoreService,
    ) {}

    @Get()
    @ApiOperation({ summary: 'List merchant applications, optionally filtered by status.' })
    @ApiOkResponse({ description: 'Paginated list of applications.' })
    async list(@Query() query: ListMerchantApplicationsDto) {
        return this.merchantApplications.listApplications(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get one merchant application by id.' })
    @ApiOkResponse({ description: 'The application.' })
    async getOne(@Param('id') id: string) {
        return this.merchantApplications.getApplicationById(id);
    }

    @Patch(':id/approve')
    @ApiOperation({ summary: 'Approve a PENDING application. Grants MERCHANT_OWNER.' })
    @ApiOkResponse({ description: 'The approved application.' })
    async approve(@Param('id') id: string, @CurrentUser() admin: RequestUser) {
        return this.merchantApplications.approve(id, admin.id);
    }

    @Patch(':id/reject')
    @ApiOperation({ summary: 'Reject a PENDING application with a reason.' })
    @ApiOkResponse({ description: 'The rejected application.' })
    async reject(
        @Param('id') id: string,
        @Body() dto: RejectMerchantApplicationDto,
        @CurrentUser() admin: RequestUser,
    ) {
        return this.merchantApplications.reject(id, admin.id, dto.reason);
    }

    @Patch(':id/suspend')
    @ApiOperation({ summary: 'Suspend an APPROVED merchant with a reason.' })
    @ApiOkResponse({ description: 'The suspended merchant.' })
    async suspend(
        @Param('id') id: string,
        @Body() dto: SuspendMerchantDto,
        @CurrentUser() admin: RequestUser,
    ) {
        return this.merchantApplications.suspend(id, admin.id, dto.reason);
    }

    @Patch(':id/reinstate')
    @ApiOperation({ summary: 'Reinstate a SUSPENDED merchant back to APPROVED.' })
    @ApiOkResponse({ description: 'The reinstated merchant.' })
    async reinstate(@Param('id') id: string, @CurrentUser() admin: RequestUser) {
        return this.merchantApplications.reinstate(id, admin.id);
    }

    @Get(':id/stores')
    @ApiOperation({ summary: "List a merchant's stores." })
    @ApiOkResponse({ description: 'Paginated list of stores.' })
    async listStores(@Param('id') id: string, @Query() pagination: PaginationDto) {
        return this.stores.listMerchantStores(id, pagination);
    }
}

@ApiTags('admin')
@Controller('admin/stores')
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminStoresController {
    constructor(private readonly stores: StoreService) {}

    @Patch(':id/status')
    @ApiOperation({
        summary: "Set a store's status (approve PENDING, suspend, reinstate, or close).",
    })
    @ApiOkResponse({ description: 'The updated store.' })
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateStoreStatusDto,
        @CurrentUser() admin: RequestUser,
    ) {
        return this.stores.updateStatusByAdmin(id, dto.status, admin.id);
    }
}
