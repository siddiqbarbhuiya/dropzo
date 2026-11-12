import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DeliveryPartner, DeliveryAssignment, Order } from '@dropzo/api-client';
import { AdminDeliveryQueuePage } from './AdminDeliveryQueuePage';
import { withTheme } from '../../test/renderWithProviders';
import { apiClient } from '../../lib/apiClient';

vi.mock('../../lib/apiClient', () => ({
    apiClient: {
        listEligibleDeliveryOrders: vi.fn(),
        listDeliveryPartners: vi.fn(),
        assignDelivery: vi.fn(),
        recordCodHandover: vi.fn(),
    },
}));

function renderPage() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });
    return render(
        withTheme(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <AdminDeliveryQueuePage />
                </MemoryRouter>
            </QueryClientProvider>,
        ),
    );
}

describe('AdminDeliveryQueuePage', () => {
    it('lists eligible orders and lets an admin pick a partner to assign', async () => {
        vi.mocked(apiClient.listEligibleDeliveryOrders).mockResolvedValue({
            data: [
                {
                    id: 'order-1',
                    order_number: 'DZ1',
                    status: 'READY',
                    total_amount: '200.00',
                    items: [],
                } as unknown as Order,
            ],
            meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
        });
        vi.mocked(apiClient.listDeliveryPartners).mockResolvedValue({
            data: [
                {
                    id: 'partner-1',
                    vehicle_type: 'Bike',
                    is_available: true,
                    user: { id: 'u-1', full_name: 'Rider One', phone: '9999999999' },
                } as DeliveryPartner,
            ],
            meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
        });
        vi.mocked(apiClient.assignDelivery).mockResolvedValue({
            id: 'asgn-1',
            order_id: 'order-1',
            delivery_status: 'ASSIGNED',
            assigned_at: new Date().toISOString(),
            accepted_at: null,
            rejected_at: null,
            rejected_reason: null,
            picked_up_at: null,
            picked_up_confirmed_by_merchant_at: null,
            out_for_delivery_at: null,
            delivered_at: null,
            failed_at: null,
            failed_reason: null,
            cod_amount_due: '200.00',
            cod_collected_amount: null,
            cod_collected_at: null,
        } as DeliveryAssignment);

        renderPage();

        await waitFor(() => expect(screen.getByText(/DZ1/)).toBeInTheDocument());

        expect(screen.getByText(/Rider One/)).toBeInTheDocument();
        // The assign button starts disabled until a partner is selected
        const assignBtn = screen.getByRole('button', { name: /Assign Delivery Partner/i });
        expect(assignBtn).toBeDisabled();

        // Select partner
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'partner-1' } });
        expect(assignBtn).toBeEnabled();

        // Click assign
        fireEvent.click(assignBtn);
        await waitFor(() => {
            expect(apiClient.assignDelivery).toHaveBeenCalledWith('order-1', 'partner-1');
        });
    });

    it('renders KPI metrics and Badarpur Dispatcher header correctly', async () => {
        vi.mocked(apiClient.listEligibleDeliveryOrders).mockResolvedValue({
            data: [],
            meta: { page: 1, limit: 50, total: 0, totalPages: 1 },
        });
        vi.mocked(apiClient.listDeliveryPartners).mockResolvedValue({
            data: [],
            meta: { page: 1, limit: 100, total: 0, totalPages: 1 },
        });

        renderPage();

        await waitFor(() =>
            expect(screen.getByText('Badarpur Town Zone Dispatch Queue')).toBeInTheDocument(),
        );
        expect(screen.getByText('Platform Dispatch Hub')).toBeInTheDocument();
        expect(screen.getByText('Orders Awaiting Dispatch')).toBeInTheDocument();
        expect(screen.getByText('Available Riders in Zone')).toBeInTheDocument();
        expect(screen.getByText('In-Transit Trips')).toBeInTheDocument();
        expect(screen.getByText('Pending COD in Custody')).toBeInTheDocument();
        expect(screen.getByText('Kabir Ahmed')).toBeInTheDocument();
    });

    it('opens and closes the Hub Cash Safe Deposit Ledger modal', async () => {
        vi.mocked(apiClient.listEligibleDeliveryOrders).mockResolvedValue({
            data: [],
            meta: { page: 1, limit: 50, total: 0, totalPages: 1 },
        });
        vi.mocked(apiClient.listDeliveryPartners).mockResolvedValue({
            data: [],
            meta: { page: 1, limit: 100, total: 0, totalPages: 1 },
        });

        renderPage();

        await waitFor(() =>
            expect(
                screen.getByRole('button', { name: /Open Safe Deposit Ledger/i }),
            ).toBeInTheDocument(),
        );

        fireEvent.click(screen.getByRole('button', { name: /Open Safe Deposit Ledger/i }));
        expect(screen.getByText('Hub Safe Deposit Ledger')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Close/i }));
        expect(screen.queryByText('Hub Safe Deposit Ledger')).not.toBeInTheDocument();
    });
});
