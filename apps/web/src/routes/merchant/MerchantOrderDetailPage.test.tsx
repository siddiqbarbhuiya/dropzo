import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MerchantOrderDetailPage } from './MerchantOrderDetailPage';
import { withTheme } from '../../test/renderWithProviders';

const baseOrder = {
    id: 'order-1',
    order_number: 'DZ-1001',
    total_amount: '555.00',
    fulfilment_type: 'PICKUP' as const,
    payment_method: 'COD',
    placed_at: new Date().toISOString(),
    estimated_ready_at: null,
    customer_notes: null,
    items: [
        {
            id: 'item-1',
            product_name_snapshot: 'Fortune Sunlite Oil',
            variant_snapshot: '1L Pouch',
            sku_snapshot: null,
            quantity: '1',
            unit_price: '145.00',
            tax_amount: '0.00',
            line_total: '145.00',
        },
    ],
    status_history: [],
};

const getMerchantOrder = vi.fn();
const verifyPickupCode = vi.fn();
const acceptOrder = vi.fn();
const rejectOrder = vi.fn();

vi.mock('../../lib/apiClient', () => ({
    apiClient: {
        getMerchantOrder: (...args: unknown[]) => getMerchantOrder(...args),
        acceptOrder: (...args: unknown[]) => acceptOrder(...args),
        rejectOrder: (...args: unknown[]) => rejectOrder(...args),
        markOrderPreparing: vi.fn(),
        markOrderReady: vi.fn(),
        verifyPickupCode: (...args: unknown[]) => verifyPickupCode(...args),
        getMerchantDelivery: () => Promise.reject(new Error('no delivery')),
    },
}));

function renderPage(status: string) {
    getMerchantOrder.mockResolvedValue({ ...baseOrder, status });
    const queryClient = new QueryClient();
    return render(
        withTheme(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={['/merchant/stores/store-1/orders/order-1']}>
                    <Routes>
                        <Route
                            path="/merchant/stores/:storeId/orders/:orderId"
                            element={<MerchantOrderDetailPage />}
                        />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>,
        ),
    );
}

describe('MerchantOrderDetailPage', () => {
    it('shows Accept/Reject for a newly created order', async () => {
        renderPage('CREATED');

        await waitFor(() => expect(screen.getByText('#DZ-1001')).toBeInTheDocument());
        expect(screen.getByRole('button', { name: 'Accept Order' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Reject Order' })).toBeInTheDocument();
        expect(screen.getByText(/Fortune Sunlite Oil/)).toBeInTheDocument();
    });

    it('shows the Counter PIN Validator once the order is ready, disabled until 6 digits are entered', async () => {
        renderPage('READY');

        await waitFor(() => expect(screen.getByText('Counter PIN Validator')).toBeInTheDocument());
        const verifyButton = screen.getByRole('button', { name: /Verify & Release Order/ });
        expect(verifyButton).toBeDisabled();

        const keypadButtons = ['1', '2', '3', '4', '5', '6'].map((digit) =>
            screen.getByRole('button', { name: digit }),
        );
        keypadButtons.forEach((button) => fireEvent.click(button));

        expect(verifyButton).not.toBeDisabled();
    });

    it('calls verifyPickupCode with the entered code and shows the success message', async () => {
        verifyPickupCode.mockResolvedValue({ verified: true });
        renderPage('READY');

        await waitFor(() => expect(screen.getByText('Counter PIN Validator')).toBeInTheDocument());
        ['1', '2', '3', '4', '5', '6'].forEach((digit) =>
            fireEvent.click(screen.getByRole('button', { name: digit })),
        );
        fireEvent.click(screen.getByRole('button', { name: /Verify & Release Order/ }));

        await waitFor(() =>
            expect(verifyPickupCode).toHaveBeenCalledWith('store-1', 'order-1', '123456'),
        );
        await waitFor(() =>
            expect(screen.getByText('Pickup verified — order completed.')).toBeInTheDocument(),
        );
    });
});
