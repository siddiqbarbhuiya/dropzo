import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokens, CurrentUser } from '@dropzo/api-client';

interface AuthState {
    tokens: AuthTokens | null;
    user: CurrentUser | null;
    setSession: (tokens: AuthTokens, user: CurrentUser | null) => void;
    setUser: (user: CurrentUser) => void;
    clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            tokens: null,
            user: null,
            setSession: (tokens, user) => set({ tokens, user }),
            setUser: (user) => set({ user }),
            clearSession: () => set({ tokens: null, user: null }),
        }),
        { name: 'dropzo-auth' },
    ),
);

export function hasRole(user: CurrentUser | null, role: string): boolean {
    return user?.roles.includes(role) ?? false;
}
