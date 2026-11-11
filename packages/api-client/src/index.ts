import type { ApiHealthResponse } from '@dropzo/shared-types';

export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface CurrentUser {
    id: string;
    phone: string;
    fullName: string | null;
    isActive: boolean;
    roles: string[];
}

export interface Store {
    id: string;
    name: string;
    status: string;
}

export interface PublicStore {
    id: string;
    name: string;
    description: string | null;
    address: string;
    locality: string | null;
    district: string;
    city: string;
    contact_phone: string | null;
    supports_pickup: boolean;
    supports_delivery: boolean;
    opening_hours: Record<string, { open: string; close: string } | null> | null;
    is_open: boolean;
}

export interface PublicProductListing {
    id: string;
    store_id: string;
    product_id: string;
    product_name: string;
    product_description: string | null;
    category_id: string | null;
    category_name: string | null;
    variant_id: string;
    variant_name: string;
    sku: string | null;
    pack_size: number | null;
    unit: string | null;
    selling_price: number;
    mrp: number | null;
    in_stock: boolean;
    low_stock: boolean;
}

export interface ListPublicStoresParams {
    locality?: string;
    supportsPickup?: boolean;
    supportsDelivery?: boolean;
    page?: number;
    limit?: number;
}

export interface ListPublicProductsParams {
    categoryId?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedResult<T> {
    data: T[];
    meta: { page: number; limit: number; total: number; totalPages: number };
}

// --- Customer: Cart & Checkout types ---
export type FulfilmentType = 'PICKUP' | 'DELIVERY';

export interface DeliveryAddress {
    recipientName: string;
    recipientPhone: string;
    addressLine1: string;
    addressLine2?: string;
    landmark?: string;
    locality?: string;
    city: string;
    district: string;
    state?: string;
    postalCode?: string;
    latitude: number;
    longitude: number;
}

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

export type FulfilmentErrorCode =
    | 'PICKUP_NOT_SUPPORTED'
    | 'DELIVERY_NOT_SUPPORTED'
    | 'DELIVERY_ADDRESS_REQUIRED'
    | 'DELIVERY_ZONE_NOT_CONFIGURED'
    | 'DELIVERY_ZONE_INACTIVE'
    | 'DELIVERY_OUT_OF_RANGE';

export interface CheckoutSummary extends PricedCartSummary {
    fulfilmentType: FulfilmentType;
    fulfilmentErrors: FulfilmentErrorCode[];
    isReadyForCheckout: boolean;
}

export interface PrepareCheckoutDto {
    fulfilmentType: FulfilmentType;
    deliveryAddress?: DeliveryAddress;
}

export interface CreateOrderDto extends PrepareCheckoutDto {
    expectedTotalAmount: number;
    customerNotes?: string;
}

export type OrderStatus =
    | 'CREATED'
    | 'ACCEPTED'
    | 'PREPARING'
    | 'READY'
    | 'ASSIGNED'
    | 'PICKED_UP'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'DELIVERY_FAILED'
    | 'COMPLETED'
    | 'REJECTED'
    | 'CANCELLED';

export interface OrderItem {
    id: string;
    product_name_snapshot: string;
    variant_snapshot: string;
    sku_snapshot: string | null;
    quantity: string | number;
    unit_price: string | number;
    tax_amount: string | number;
    line_total: string | number;
}

export interface OrderStatusHistoryEntry {
    id: string;
    old_status: string | null;
    new_status: string;
    reason: string | null;
    created_at: string;
}

export interface Order {
    id: string;
    order_number: string;
    status: OrderStatus;
    total_amount: string | number;
    subtotal: string | number;
    discount_amount: string | number;
    delivery_fee: string | number;
    tax_amount: string | number;
    fulfilment_type: 'PICKUP' | 'DELIVERY';
    /** Always 'COD' today - no other payment method is implemented (see checkout.service.ts). */
    payment_method: string;
    store_name_snapshot: string;
    store_address_snapshot: string;
    delivery_recipient_name_snapshot: string | null;
    delivery_recipient_phone_snapshot: string | null;
    customer_notes: string | null;
    placed_at: string;
    estimated_ready_at: string | null;
    completed_at: string | null;
    created_at: string;
    items?: OrderItem[];
    status_history?: OrderStatusHistoryEntry[];
}

export interface PickupCodeResponse {
    expiresAt: string;
    codeAvailable: boolean;
    code: string | null;
}

export interface CompletePickupResult {
    verified: boolean;
    order?: Order;
    attemptsRemaining?: number;
}

// --- BC-010: home delivery management ---

export interface DeliveryPartnerUser {
    id: string;
    full_name: string | null;
    phone: string;
}

export interface DeliveryPartner {
    id: string;
    vehicle_type: string | null;
    is_approved: boolean;
    is_available: boolean;
    user: DeliveryPartnerUser;
}

export type DeliveryStatus =
    | 'ASSIGNED'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'PICKED_UP'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'FAILED'
    | 'CANCELLED';

export interface DeliveryEvent {
    id: string;
    event_type: string;
    notes: string | null;
    created_at: string;
}

export interface DeliveryAssignment {
    id: string;
    order_id: string;
    delivery_status: DeliveryStatus;
    assigned_at: string;
    accepted_at: string | null;
    rejected_at: string | null;
    rejected_reason: string | null;
    picked_up_at: string | null;
    picked_up_confirmed_by_merchant_at: string | null;
    out_for_delivery_at: string | null;
    delivered_at: string | null;
    failed_at: string | null;
    failed_reason: string | null;
    cod_amount_due: string | number | null;
    cod_collected_amount: string | number | null;
    cod_collected_at: string | null;
    order?: Order;
    delivery_partner?: DeliveryPartner;
    events?: DeliveryEvent[];
}

export interface DeliveryCodeResponse {
    expiresAt: string;
    codeAvailable: boolean;
    code: string | null;
}

export interface CompleteDeliveryResult {
    verified: boolean;
    order?: Order;
    attemptsRemaining?: number;
}

// --- Merchant: inventory and stock ---

export interface Product {
    id: string;
    name: string;
    brand: string | null;
}

export interface ProductVariant {
    id: string;
    sku: string | null;
    variant_name: string;
    unit: string;
    pack_size: string | number | null;
    product?: Product;
}

export interface StockBatch {
    id: string;
    batch_code: string | null;
    received_quantity: string | number;
    on_hand_quantity: string | number;
    reserved_quantity: string | number;
    received_at: string;
    manufacture_date: string | null;
    expiry_date: string | null;
    cost_price: string | number | null;
    storage_notes: string | null;
}

export interface InventorySnapshot {
    id: string;
    store_product_id: string;
    on_hand_quantity: string | number;
    reserved_quantity: string | number;
    blocked_quantity: string | number;
    low_stock_threshold: string | number;
    updated_at: string;
    stock_batches?: StockBatch[];
}

export interface StoreListing {
    id: string;
    store_id: string;
    variant_id: string;
    uses_batch_tracking: boolean;
    selling_price: string | number;
    mrp: string | number | null;
    is_available: boolean;
    created_at: string;
    variant?: ProductVariant;
    inventory?: InventorySnapshot;
}

export interface StockMovement {
    id: string;
    inventory_id: string;
    batch_id: string | null;
    movement_type: string;
    quantity: string | number;
    reference_type: string | null;
    notes: string | null;
    created_by: string | null;
    created_at: string;
}

export interface CodSummary {
    outstandingBalance: string;
    uncollectedAssignments: Array<{ orderId: string; amount: string; collectedAt: string | null }>;
}

export interface CodHandover {
    id: string;
    delivery_partner_id: string;
    amount: string | number;
    notes: string | null;
    created_at: string;
}

export interface DeliveryStatusView {
    orderStatus: OrderStatus;
    assignment: {
        deliveryStatus: DeliveryStatus;
        partnerName: string | null;
        partnerPhone: string;
        pickedUpAt: string | null;
        outForDeliveryAt: string | null;
        deliveredAt: string | null;
    } | null;
}

export interface ApiClientOptions {
    getAccessToken: () => string | null;
    onUnauthorized?: () => void;
}

export function createApiClient(baseUrl: string, options?: ApiClientOptions) {
    const root = baseUrl.replace(/\/$/, '');

    async function request<T>(
        path: string,
        init: RequestInit & { auth?: boolean } = {},
    ): Promise<T> {
        const headers = new Headers(init.headers);
        if (init.body && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
        if (init.auth !== false) {
            const token = options?.getAccessToken();
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
        }

        const response = await fetch(`${root}${path}`, { ...init, headers });
        if (response.status === 401) {
            options?.onUnauthorized?.();
        }
        if (!response.ok) {
            let message = `Request to ${path} failed with status ${response.status}`;
            try {
                const body = (await response.json()) as { error?: { message?: string } };
                if (body.error?.message) {
                    message = body.error.message;
                }
            } catch {
                // Response body wasn't JSON - keep the generic message.
            }
            throw new ApiError(message, response.status);
        }
        if (response.status === 204) {
            return undefined as T;
        }
        return (await response.json()) as T;
    }

    function getJson<T>(path: string): Promise<T> {
        return request<T>(path, { method: 'GET' });
    }

    function postJson<T>(path: string, body?: unknown, opts: { auth?: boolean } = {}): Promise<T> {
        return request<T>(path, {
            method: 'POST',
            body: body !== undefined ? JSON.stringify(body) : undefined,
            auth: opts.auth,
        });
    }

    function patchJson<T>(path: string, body?: unknown): Promise<T> {
        return request<T>(path, {
            method: 'PATCH',
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    }

    return {
        getHealth: () => request<ApiHealthResponse>('/health', { auth: false }),

        // --- Auth ---
        sendOtp: (phone: string) =>
            postJson<{ status: string; retryAfterSeconds?: number }>(
                '/auth/send-otp',
                { phone },
                { auth: false },
            ),
        verifyOtp: (phone: string, code: string) =>
            postJson<AuthTokens & { isNewAccount: boolean }>(
                '/auth/verify-otp',
                { phone, code },
                { auth: false },
            ),
        refresh: (refreshToken: string) =>
            postJson<AuthTokens>('/auth/refresh', { refreshToken }, { auth: false }),
        getMe: () => getJson<CurrentUser>('/auth/me'),

        // --- Merchant: stores ---
        listOwnStores: (params: { page?: number; limit?: number } = {}) =>
            getJson<PaginatedResult<Store>>(
                `/merchants/me/stores?${new URLSearchParams(
                    params as Record<string, string>,
                ).toString()}`,
            ),

        // --- Merchant: inventory and stock ---
        listOwnListings: (
            storeId: string,
            params: { page?: number; limit?: number; isAvailable?: boolean } = {},
        ) =>
            getJson<PaginatedResult<StoreListing>>(
                `/merchants/me/stores/${storeId}/listings?${new URLSearchParams(
                    params as unknown as Record<string, string>,
                ).toString()}`,
            ),
        getOwnListing: (storeId: string, listingId: string) =>
            getJson<StoreListing>(`/merchants/me/stores/${storeId}/listings/${listingId}`),
        updateListing: (
            storeId: string,
            listingId: string,
            dto: {
                sellingPrice?: number;
                mrp?: number;
                isAvailable?: boolean;
                lowStockThreshold?: number;
            },
        ) => patchJson<StoreListing>(`/merchants/me/stores/${storeId}/listings/${listingId}`, dto),
        getInventorySnapshot: (storeId: string, listingId: string) =>
            getJson<InventorySnapshot>(
                `/merchants/me/stores/${storeId}/listings/${listingId}/inventory`,
            ),
        receiveStock: (
            storeId: string,
            listingId: string,
            dto: {
                quantity: number;
                batchId?: string;
                batchCode?: string;
                manufactureDate?: string;
                expiryDate?: string;
                costPrice?: number;
            },
        ) =>
            postJson<InventorySnapshot>(
                `/merchants/me/stores/${storeId}/listings/${listingId}/inventory/receive`,
                dto,
            ),
        adjustStock: (
            storeId: string,
            listingId: string,
            dto: { quantityDelta: number; reason: string; batchId?: string },
        ) =>
            postJson<InventorySnapshot>(
                `/merchants/me/stores/${storeId}/listings/${listingId}/inventory/adjustments`,
                dto,
            ),
        removeStock: (
            storeId: string,
            listingId: string,
            dto: {
                type: 'DAMAGED' | 'EXPIRED';
                quantity: number;
                reason: string;
                batchId?: string;
            },
        ) =>
            postJson<InventorySnapshot>(
                `/merchants/me/stores/${storeId}/listings/${listingId}/inventory/removals`,
                dto,
            ),
        listStockMovements: (
            storeId: string,
            listingId: string,
            params: { page?: number; limit?: number } = {},
        ) =>
            getJson<PaginatedResult<StockMovement>>(
                `/merchants/me/stores/${storeId}/listings/${listingId}/inventory/movements?${new URLSearchParams(
                    params as Record<string, string>,
                ).toString()}`,
            ),

        // --- Merchant: order fulfilment ---
        listMerchantOrders: (
            storeId: string,
            params: { status?: OrderStatus; page?: number; limit?: number } = {},
        ) =>
            getJson<PaginatedResult<Order>>(
                `/merchants/me/stores/${storeId}/orders?${new URLSearchParams(
                    params as Record<string, string>,
                ).toString()}`,
            ),
        getMerchantOrder: (storeId: string, orderId: string) =>
            getJson<Order>(`/merchants/me/stores/${storeId}/orders/${orderId}`),
        acceptOrder: (storeId: string, orderId: string) =>
            patchJson<Order>(`/merchants/me/stores/${storeId}/orders/${orderId}/accept`),
        rejectOrder: (storeId: string, orderId: string, reason: string) =>
            patchJson<Order>(`/merchants/me/stores/${storeId}/orders/${orderId}/reject`, {
                reason,
            }),
        markOrderPreparing: (storeId: string, orderId: string) =>
            patchJson<Order>(`/merchants/me/stores/${storeId}/orders/${orderId}/preparing`),
        markOrderReady: (storeId: string, orderId: string) =>
            patchJson<Order>(`/merchants/me/stores/${storeId}/orders/${orderId}/ready`),
        verifyPickupCode: (storeId: string, orderId: string, code: string) =>
            postJson<CompletePickupResult>(
                `/merchants/me/stores/${storeId}/orders/${orderId}/verify-pickup`,
                { code },
            ),

        // --- Customer: orders and pickup ---
        listOwnOrders: (params: { status?: OrderStatus; page?: number; limit?: number } = {}) =>
            getJson<PaginatedResult<Order>>(
                `/customers/me/orders?${new URLSearchParams(
                    params as Record<string, string>,
                ).toString()}`,
            ),
        getOwnOrder: (idOrNumber: string) => getJson<Order>(`/customers/me/orders/${idOrNumber}`),
        getOwnPickupCode: (orderId: string) =>
            getJson<PickupCodeResponse>(`/customers/me/orders/${orderId}/pickup-code`),

        // --- Customer: cart ---
        getActiveCart: () => getJson<PricedCartSummary>('/customers/me/cart'),
        addCartItem: (dto: { storeProductId: string; quantity: number }) =>
            postJson<PricedCartSummary>('/customers/me/cart/items', dto),
        updateCartItem: (itemId: string, dto: { quantity: number }) =>
            patchJson<PricedCartSummary>(`/customers/me/cart/items/${itemId}`, dto),
        removeCartItem: (itemId: string) =>
            request<PricedCartSummary>(`/customers/me/cart/items/${itemId}`, { method: 'DELETE' }),
        clearCart: () => request<PricedCartSummary>('/customers/me/cart', { method: 'DELETE' }),

        // --- Customer: checkout ---
        prepareCheckout: (dto: PrepareCheckoutDto) =>
            postJson<CheckoutSummary>('/checkout/prepare', dto),
        createOrder: (dto: CreateOrderDto, idempotencyKey: string) =>
            request<Order>('/checkout', {
                method: 'POST',
                headers: { 'idempotency-key': idempotencyKey },
                body: JSON.stringify(dto),
            }),

        // --- Customer: delivery progress and verification code ---
        getOwnDeliveryStatus: (orderId: string) =>
            getJson<DeliveryStatusView>(`/customers/me/orders/${orderId}/delivery-status`),
        getOwnDeliveryCode: (orderId: string) =>
            getJson<DeliveryCodeResponse>(`/customers/me/orders/${orderId}/delivery-code`),

        // --- Merchant: delivery handover ---
        getMerchantDelivery: (storeId: string, orderId: string) =>
            getJson<DeliveryAssignment>(
                `/merchants/me/stores/${storeId}/orders/${orderId}/delivery`,
            ),
        confirmMerchantHandover: (storeId: string, orderId: string) =>
            patchJson<DeliveryAssignment>(
                `/merchants/me/stores/${storeId}/orders/${orderId}/delivery/confirm-handover`,
            ),

        // --- Admin: delivery-partner management ---
        createDeliveryPartner: (userId: string, vehicleType?: string) =>
            postJson<DeliveryPartner>('/admin/delivery-partners', { userId, vehicleType }),
        listDeliveryPartners: (
            params: { isActive?: boolean; page?: number; limit?: number } = {},
        ) =>
            getJson<PaginatedResult<DeliveryPartner>>(
                `/admin/delivery-partners?${new URLSearchParams(
                    params as unknown as Record<string, string>,
                ).toString()}`,
            ),
        getDeliveryPartner: (id: string) =>
            getJson<DeliveryPartner>(`/admin/delivery-partners/${id}`),
        activateDeliveryPartner: (id: string) =>
            patchJson<DeliveryPartner>(`/admin/delivery-partners/${id}/activate`),
        deactivateDeliveryPartner: (id: string) =>
            patchJson<DeliveryPartner>(`/admin/delivery-partners/${id}/deactivate`),
        getDeliveryPartnerCodSummary: (id: string) =>
            getJson<CodSummary>(`/admin/delivery-partners/${id}/cod-summary`),
        listDeliveryPartnerHandovers: (
            id: string,
            params: { page?: number; limit?: number } = {},
        ) =>
            getJson<PaginatedResult<CodHandover>>(
                `/admin/delivery-partners/${id}/cod-handovers?${new URLSearchParams(
                    params as unknown as Record<string, string>,
                ).toString()}`,
            ),

        // --- Admin: manual delivery assignment ---
        listEligibleDeliveryOrders: (params: { page?: number; limit?: number } = {}) =>
            getJson<PaginatedResult<Order>>(
                `/admin/delivery-assignments/eligible-orders?${new URLSearchParams(
                    params as Record<string, string>,
                ).toString()}`,
            ),
        getDeliveryAssignment: (orderId: string) =>
            getJson<DeliveryAssignment>(`/admin/delivery-assignments/${orderId}`),
        assignDelivery: (orderId: string, deliveryPartnerId: string) =>
            postJson<DeliveryAssignment>(`/admin/delivery-assignments/${orderId}/assign`, {
                deliveryPartnerId,
            }),
        cancelDeliveryAssignment: (orderId: string, reason: string) =>
            patchJson<DeliveryAssignment>(`/admin/delivery-assignments/${orderId}/cancel`, {
                reason,
            }),
        recordCodHandover: (deliveryPartnerId: string, orderIds: string[], notes?: string) =>
            postJson<CodHandover>('/admin/delivery-assignments/cod-handovers', {
                deliveryPartnerId,
                orderIds,
                notes,
            }),
        listCodHandovers: (params: { page?: number; limit?: number } = {}) =>
            getJson<PaginatedResult<CodHandover>>(
                `/admin/delivery-assignments/cod-handovers?${new URLSearchParams(
                    params as Record<string, string>,
                ).toString()}`,
            ),

        // --- Delivery partner: own profile and workflow ---
        getOwnDeliveryProfile: () => getJson<DeliveryPartner>('/delivery-partners/me/profile'),
        setOwnAvailability: (isAvailable: boolean) =>
            patchJson<DeliveryPartner>('/delivery-partners/me/availability', { isAvailable }),
        getOwnCurrentAssignment: () =>
            getJson<DeliveryAssignment | null>('/delivery-partners/me/assignments/current'),
        getOwnCodSummary: () => getJson<CodSummary>('/delivery-partners/me/cod-summary'),
        getOwnAssignment: (orderId: string) =>
            getJson<DeliveryAssignment>(`/delivery-partners/me/assignments/${orderId}`),
        acceptAssignment: (orderId: string) =>
            patchJson<DeliveryAssignment>(`/delivery-partners/me/assignments/${orderId}/accept`),
        rejectAssignment: (orderId: string, reason: string) =>
            patchJson<DeliveryAssignment>(`/delivery-partners/me/assignments/${orderId}/reject`, {
                reason,
            }),
        collectAssignment: (orderId: string) =>
            patchJson<DeliveryAssignment>(`/delivery-partners/me/assignments/${orderId}/collect`),
        markOutForDelivery: (orderId: string) =>
            patchJson<DeliveryAssignment>(
                `/delivery-partners/me/assignments/${orderId}/out-for-delivery`,
            ),
        verifyDeliveryCode: (orderId: string, code: string) =>
            postJson<CompleteDeliveryResult>(
                `/delivery-partners/me/assignments/${orderId}/verify-delivery`,
                { code },
            ),
        reportDeliveryFailure: (orderId: string, reason: string) =>
            patchJson<DeliveryAssignment>(`/delivery-partners/me/assignments/${orderId}/fail`, {
                reason,
            }),

        // --- Public Store & Catalogue Browsing ---
        listPublicStores: (params: ListPublicStoresParams = {}) => {
            const query = new URLSearchParams();
            if (params.locality) query.set('locality', params.locality);
            if (params.supportsPickup !== undefined)
                query.set('supportsPickup', String(params.supportsPickup));
            if (params.supportsDelivery !== undefined)
                query.set('supportsDelivery', String(params.supportsDelivery));
            if (params.page) query.set('page', String(params.page));
            if (params.limit) query.set('limit', String(params.limit));
            const qs = query.toString();
            return getJson<PaginatedResult<PublicStore>>(`/stores${qs ? `?${qs}` : ''}`);
        },
        getPublicStore: (storeId: string) => getJson<PublicStore>(`/stores/${storeId}`),
        getStoreCatalogue: (storeId: string, params: ListPublicProductsParams = {}) => {
            const query = new URLSearchParams();
            if (params.categoryId) query.set('categoryId', params.categoryId);
            if (params.search) query.set('search', params.search);
            if (params.page) query.set('page', String(params.page));
            if (params.limit) query.set('limit', String(params.limit));
            const qs = query.toString();
            return getJson<PaginatedResult<PublicProductListing>>(
                `/stores/${storeId}/products${qs ? `?${qs}` : ''}`,
            );
        },
    };
}

export type ApiClient = ReturnType<typeof createApiClient>;
