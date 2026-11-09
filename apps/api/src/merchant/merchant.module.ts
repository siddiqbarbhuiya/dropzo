import { Module } from '@nestjs/common';
import { MerchantApplicationService } from './merchant-application.service.js';
import { MerchantApplicationController } from './merchant-application.controller.js';
import { StoreService } from './store.service.js';
import { StoreController } from './store.controller.js';
import { AdminMerchantsController, AdminStoresController } from './admin-merchant.controller.js';

@Module({
    controllers: [
        MerchantApplicationController,
        StoreController,
        AdminMerchantsController,
        AdminStoresController,
    ],
    providers: [MerchantApplicationService, StoreService],
    exports: [MerchantApplicationService, StoreService],
})
export class MerchantModule {}
