import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore, hasRole } from '../store/useAuthStore';

export function RequireAuth({ children, role }: { children: ReactNode; role?: string }) {
    const tokens = useAuthStore((state) => state.tokens);
    const user = useAuthStore((state) => state.user);

    if (!tokens) {
        return <Navigate to="/login" replace />;
    }
    if (role && !hasRole(user, role)) {
        return <Navigate to="/" replace />;
    }
    return <>{children}</>;
}
