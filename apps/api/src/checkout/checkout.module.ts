import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { FulfilmentValidationService } from './fulfilment-validation.service.js';
import { CheckoutService } from './checkout.service.js';
import { CheckoutController } from './checkout.controller.js';

@Module({
    imports: [CartModule, InventoryModule],
    controllers: [CheckoutController],
    providers: [FulfilmentValidationService, CheckoutService],
    exports: [CheckoutService],
})
export class CheckoutModule {}
