import { createApiClient } from '@dropzo/api-client';
import { useAuthStore } from '../store/useAuthStore';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export const apiClient = createApiClient(baseUrl, {
    getAccessToken: () => useAuthStore.getState().tokens?.accessToken ?? null,
    onUnauthorized: () => useAuthStore.getState().clearSession(),
});
