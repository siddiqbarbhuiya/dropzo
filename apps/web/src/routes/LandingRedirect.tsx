import { Navigate } from 'react-router-dom';
import { useAuthStore, hasRole } from '../store/useAuthStore';

export function LandingRedirect() {
    const tokens = useAuthStore((state) => state.tokens);
    const user = useAuthStore((state) => state.user);

    if (!tokens) {
        return <Navigate to="/login" replace />;
    }
    if (hasRole(user, 'MERCHANT_OWNER')) {
        return <Navigate to="/merchant/orders" replace />;
    }
    return <Navigate to="/orders" replace />;
}
