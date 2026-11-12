import { Route, Routes } from 'react-router-dom';
import { HomePage } from './routes/HomePage';
import { LoginPage } from './routes/LoginPage';
import { LandingRedirect } from './routes/LandingRedirect';
import { RequireAuth } from './routes/RequireAuth';
import { StorefrontPage } from './routes/customer/StorefrontPage';
import { CheckoutPage } from './routes/customer/CheckoutPage';
import { CustomerOrdersPage } from './routes/customer/CustomerOrdersPage';
import { CustomerOrderDetailPage } from './routes/customer/CustomerOrderDetailPage';
import { MerchantOrdersPage } from './routes/merchant/MerchantOrdersPage';
import { MerchantOrderDetailPage } from './routes/merchant/MerchantOrderDetailPage';
import { MerchantInventoryPage } from './routes/merchant/MerchantInventoryPage';
import { AdminDeliveryPartnersPage } from './routes/admin/AdminDeliveryPartnersPage';
import { AdminDeliveryQueuePage } from './routes/admin/AdminDeliveryQueuePage';
import { AdminCodHandoverPage } from './routes/admin/AdminCodHandoverPage';
import { AdminMerchantApprovalsPage } from './routes/admin/AdminMerchantApprovalsPage';
import { DeliveryPartnerInboxPage } from './routes/delivery-partner/DeliveryPartnerInboxPage';

export function App() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/redirect" element={<LandingRedirect />} />
            <Route path="/stores/:storeId" element={<StorefrontPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
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
            <Route
                path="/merchant/inventory"
                element={
                    <RequireAuth role="MERCHANT_OWNER">
                        <MerchantInventoryPage />
                    </RequireAuth>
                }
            />
            <Route
                path="/admin/merchant-approvals"
                element={
                    <RequireAuth role="ADMIN">
                        <AdminMerchantApprovalsPage />
                    </RequireAuth>
                }
            />
            <Route
                path="/admin/delivery-partners"
                element={
                    <RequireAuth role="ADMIN">
                        <AdminDeliveryPartnersPage />
                    </RequireAuth>
                }
            />
            <Route
                path="/admin/delivery-partners/:partnerId/cod"
                element={
                    <RequireAuth role="ADMIN">
                        <AdminCodHandoverPage />
                    </RequireAuth>
                }
            />
            <Route
                path="/admin/delivery-queue"
                element={
                    <RequireAuth role="ADMIN">
                        <AdminDeliveryQueuePage />
                    </RequireAuth>
                }
            />
            <Route
                path="/delivery/inbox"
                element={
                    <RequireAuth role="DELIVERY_PARTNER">
                        <DeliveryPartnerInboxPage />
                    </RequireAuth>
                }
            />
        </Routes>
    );
}
