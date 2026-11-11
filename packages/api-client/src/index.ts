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

export interface PaginatedResult<T> {
    data: T[];
    meta: { page: number; limit: number; total: number; totalPages: number };
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
    quantity: string | number;
    unit_price: string | number;
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
    fulfilment_type: 'PICKUP' | 'DELIVERY';
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
    };
}

export type ApiClient = ReturnType<typeof createApiClient>;
