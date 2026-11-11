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
    'CREATED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

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
    };
}

export type ApiClient = ReturnType<typeof createApiClient>;
