import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminDeliveryQueuePage } from './AdminDeliveryQueuePage';
import { withTheme } from '../../test/renderWithProviders';

vi.mock('../../lib/apiClient', () => ({
    apiClient: {
        listEligibleDeliveryOrders: () =>
            Promise.resolve({
                data: [
                    { id: 'order-1', order_number: 'DZ1', status: 'READY', total_amount: '200.00' },
                ],
                meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
            }),
        listDeliveryPartners: () =>
            Promise.resolve({
                data: [{ id: 'partner-1', user: { full_name: 'Rider One', phone: '9999999999' } }],
                meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
            }),
    },
}));

function renderPage() {
    const queryClient = new QueryClient();
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
        renderPage();

        await waitFor(() => expect(screen.getByText(/DZ1/)).toBeInTheDocument());
        expect(screen.getByRole('option', { name: 'Rider One' })).toBeInTheDocument();
        // The assign button starts disabled until a partner is selected.
        expect(screen.getByRole('button', { name: 'Assign' })).toBeDisabled();
    });
});
