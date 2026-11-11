import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MerchantOrdersPage } from './MerchantOrdersPage';
import { withTheme } from '../../test/renderWithProviders';

const listOwnStores = vi.fn();
const listMerchantOrders = vi.fn();
const acceptOrder = vi.fn();
const rejectOrder = vi.fn();
const markOrderReady = vi.fn();
const verifyPickupCode = vi.fn();

vi.mock('../../lib/apiClient', () => ({
    apiClient: {
        listOwnStores: (...args: unknown[]) => listOwnStores(...args),
        listMerchantOrders: (...args: unknown[]) => listMerchantOrders(...args),
        acceptOrder: (...args: unknown[]) => acceptOrder(...args),
        rejectOrder: (...args: unknown[]) => rejectOrder(...args),
        markOrderReady: (...args: unknown[]) => markOrderReady(...args),
        verifyPickupCode: (...args: unknown[]) => verifyPickupCode(...args),
    },
}));

function renderComponent() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });

    return render(
        withTheme(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={['/merchant/orders']}>
                    <Routes>
                        <Route path="/merchant/orders" element={<MerchantOrdersPage />} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>,
        ),
    );
}

describe('MerchantOrdersPage (POS Terminal)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        listOwnStores.mockResolvedValue({
            data: [
                {
                    id: 'store-1',
                    name: 'Maa Tara Groceries',
                    address: 'Station Road, Badarpur',
                },
            ],
        });
        listMerchantOrders.mockResolvedValue({
            data: [],
            total: 0,
        });
    });

    it('renders POS header, store name, live indicator, and KPI metrics', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Dropzo Merchant')).toBeInTheDocument();
            expect(screen.getByText('Maa Tara Groceries')).toBeInTheDocument();
            expect(screen.getByText('LIVE')).toBeInTheDocument();
            expect(screen.getByText('POS #01')).toBeInTheDocument();
        });

        // KPI metrics
        expect(screen.getByText('New')).toBeInTheDocument();
        expect(screen.getByText('Prep')).toBeInTheDocument();
        expect(screen.getByText('Ready')).toBeInTheDocument();
        expect(screen.getAllByText('Today')[0]).toBeInTheDocument();
    });

    it('renders incoming urgent order card with timer and items checklist', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('#DZ-2026-8941')).toBeInTheDocument();
        });

        expect(screen.getByText('URGENT ACCEPTANCE REQUIRED')).toBeInTheDocument();
        expect(screen.getByText('45s left')).toBeInTheDocument();
        expect(screen.getByText(/Fortune Sunlite Oil/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Accept Order/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Reject Order/i })).toBeInTheDocument();
    });

    it('filters orders when clicking Packing Now and Ready at Counter tabs', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('#DZ-2026-8941')).toBeInTheDocument();
        });

        // Switch to Packing Now
        const packingTab = screen.getByRole('button', { name: 'Packing Now Orders' });
        fireEvent.click(packingTab);

        await waitFor(() => {
            expect(screen.getByText('#DZ-2026-8938')).toBeInTheDocument();
        });
        expect(screen.queryByText('#DZ-2026-8941')).not.toBeInTheDocument();

        // Switch to Ready at Counter
        const readyTab = screen.getByRole('button', { name: 'Ready at Counter Orders' });
        fireEvent.click(readyTab);

        await waitFor(() => {
            expect(screen.getByText('#DZ-2026-8930')).toBeInTheDocument();
        });
    });

    it('calls acceptOrder when clicking Accept Order on incoming card', async () => {
        acceptOrder.mockResolvedValue({ success: true });
        renderComponent();

        const acceptBtn = await screen.findByRole('button', { name: /Accept Order/i });
        fireEvent.click(acceptBtn);

        await waitFor(() => {
            expect(acceptOrder).toHaveBeenCalledWith('store-1', 'order-demo-1');
        });
    });

    it('allows entering PIN via on-screen keypad and triggers verifyPickupCode', async () => {
        verifyPickupCode.mockResolvedValue({ verified: true });
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Counter PIN Validator')).toBeInTheDocument();
        });

        const releaseBtn = screen.getByRole('button', { name: /Verify & Release Order/i });
        expect(releaseBtn).toBeDisabled();

        // Click digits 8 9 3 0 on the on-screen keypad
        ['8', '9', '3', '0'].forEach((digit) => {
            fireEvent.click(screen.getByRole('button', { name: digit }));
        });

        expect(releaseBtn).not.toBeDisabled();
        fireEvent.click(releaseBtn);

        await waitFor(() => {
            expect(verifyPickupCode).toHaveBeenCalledWith('store-1', 'order-demo-ready', '8930');
        });
    });
});
