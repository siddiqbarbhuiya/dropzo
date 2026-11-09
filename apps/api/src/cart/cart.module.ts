import { Module } from '@nestjs/common';
import { CartPricingService } from './cart-pricing.service.js';
import { CartService } from './cart.service.js';
import { CartController } from './cart.controller.js';

@Module({
    controllers: [CartController],
    providers: [CartPricingService, CartService],
    exports: [CartPricingService, CartService],
})
export class CartModule {}
