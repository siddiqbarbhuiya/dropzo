import { Module } from '@nestjs/common';
import { MerchantModule } from '../merchant/merchant.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { PickupVerificationService } from './pickup-verification.service.js';
import { MerchantOrdersService } from './merchant-orders.service.js';
import { MerchantOrdersController } from './merchant-orders.controller.js';
import { CustomerPickupController } from './customer-pickup.controller.js';

@Module({
    imports: [MerchantModule, InventoryModule, OrdersModule],
    controllers: [MerchantOrdersController, CustomerPickupController],
    providers: [PickupVerificationService, MerchantOrdersService],
    exports: [PickupVerificationService, MerchantOrdersService],
})
export class FulfilmentModule {}
