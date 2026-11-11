import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, hasRole } from '../store/useAuthStore';

export function RequireAuth({ children, role }: { children: ReactNode; role?: string }) {
    const tokens = useAuthStore((state) => state.tokens);
    const user = useAuthStore((state) => state.user);
    const location = useLocation();

    if (!tokens) {
        const redirectParam =
            location.pathname !== '/'
                ? `?redirect=${encodeURIComponent(location.pathname + location.search)}`
                : '';
        return <Navigate to={`/login${redirectParam}`} replace />;
    }
    if (role && !hasRole(user, role)) {
        return <Navigate to="/" replace />;
    }
    return <>{children}</>;
}
