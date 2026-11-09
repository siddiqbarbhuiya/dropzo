/** Per-item problem codes a cart/checkout summary can report - never silent, never a 500. */
export type CartLineErrorCode =
    | 'LISTING_UNAVAILABLE'
    | 'VARIANT_INACTIVE'
    | 'PRODUCT_INACTIVE'
    | 'STORE_INACTIVE'
    | 'MERCHANT_INACTIVE'
    | 'INSUFFICIENT_STOCK'
    | 'LISTING_NOT_FOUND';

export interface PricedCartLine {
    cartItemId: string;
    storeProductId: string;
    inventoryId: string | null;
    usesBatchTracking: boolean;
    productName: string;
    variantName: string;
    sku: string | null;
    unit: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    errors: CartLineErrorCode[];
}

export interface PricedCartSummary {
    cartId: string | null;
    storeId: string | null;
    storeName: string | null;
    items: PricedCartLine[];
    subtotal: number;
    totalAmount: number;
    isValid: boolean;
}
