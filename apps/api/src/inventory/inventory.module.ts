import { Module } from '@nestjs/common';
import { MerchantModule } from '../merchant/merchant.module.js';
import { StoreProductService } from './store-product.service.js';
import { StoreProductController } from './store-product.controller.js';
import { InventoryService } from './inventory.service.js';
import { InventoryController } from './inventory.controller.js';
import { ReservationService } from './reservation.service.js';
import { PublicStoreController } from '../merchant/public-store.controller.js';

@Module({
    imports: [MerchantModule],
    controllers: [StoreProductController, InventoryController, PublicStoreController],
    providers: [StoreProductService, InventoryService, ReservationService],
    exports: [StoreProductService, InventoryService, ReservationService],
})
export class InventoryModule {}
