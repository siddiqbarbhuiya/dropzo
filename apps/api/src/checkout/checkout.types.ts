import type { PricedCartSummary } from '../cart/cart-pricing.types.js';

export type FulfilmentErrorCode =
    | 'PICKUP_NOT_SUPPORTED'
    | 'DELIVERY_NOT_SUPPORTED'
    | 'DELIVERY_ADDRESS_REQUIRED'
    | 'DELIVERY_ZONE_NOT_CONFIGURED'
    | 'DELIVERY_ZONE_INACTIVE'
    | 'DELIVERY_OUT_OF_RANGE';

export interface CheckoutSummary extends PricedCartSummary {
    fulfilmentType: 'PICKUP' | 'DELIVERY';
    fulfilmentErrors: FulfilmentErrorCode[];
    isReadyForCheckout: boolean;
}
