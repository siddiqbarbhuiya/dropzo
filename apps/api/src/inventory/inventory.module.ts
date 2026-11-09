import { Module } from '@nestjs/common';
import { MerchantModule } from '../merchant/merchant.module.js';
import { StoreProductService } from './store-product.service.js';
import { StoreProductController } from './store-product.controller.js';
import { InventoryService } from './inventory.service.js';
import { InventoryController } from './inventory.controller.js';

@Module({
    imports: [MerchantModule],
    controllers: [StoreProductController, InventoryController],
    providers: [StoreProductService, InventoryService],
    exports: [StoreProductService, InventoryService],
})
export class InventoryModule {}
