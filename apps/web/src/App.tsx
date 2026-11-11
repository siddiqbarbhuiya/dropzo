import { Route, Routes } from 'react-router-dom';
import { LoginPage } from './routes/LoginPage';
import { LandingRedirect } from './routes/LandingRedirect';
import { RequireAuth } from './routes/RequireAuth';
import { CustomerOrdersPage } from './routes/customer/CustomerOrdersPage';
import { CustomerOrderDetailPage } from './routes/customer/CustomerOrderDetailPage';
import { MerchantOrdersPage } from './routes/merchant/MerchantOrdersPage';
import { MerchantOrderDetailPage } from './routes/merchant/MerchantOrderDetailPage';

export function App() {
    return (
        <Routes>
            <Route path="/" element={<LandingRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
                path="/orders"
                element={
                    <RequireAuth role="CUSTOMER">
                        <CustomerOrdersPage />
                    </RequireAuth>
                }
            />
            <Route
                path="/orders/:orderId"
                element={
                    <RequireAuth role="CUSTOMER">
                        <CustomerOrderDetailPage />
                    </RequireAuth>
                }
            />
            <Route
                path="/merchant/orders"
                element={
                    <RequireAuth role="MERCHANT_OWNER">
                        <MerchantOrdersPage />
                    </RequireAuth>
                }
            />
            <Route
                path="/merchant/stores/:storeId/orders/:orderId"
                element={
                    <RequireAuth role="MERCHANT_OWNER">
                        <MerchantOrderDetailPage />
                    </RequireAuth>
                }
            />
        </Routes>
    );
}
