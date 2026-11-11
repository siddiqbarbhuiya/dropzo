import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeliveryPartnerInboxPage } from './DeliveryPartnerInboxPage';
import { withTheme } from '../../test/renderWithProviders';

vi.mock('../../lib/apiClient', () => ({
    apiClient: {
        getOwnDeliveryProfile: () =>
            Promise.resolve({ is_approved: true, is_available: false, vehicle_type: 'Bike' }),
        getOwnCurrentAssignment: () =>
            Promise.resolve({
                order_id: 'order-1',
                delivery_status: 'ASSIGNED',
            }),
        getOwnCodSummary: () =>
            Promise.resolve({ outstandingBalance: '0.00', uncollectedAssignments: [] }),
    },
}));

function renderPage() {
    const queryClient = new QueryClient();
    return render(
        withTheme(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <DeliveryPartnerInboxPage />
                </MemoryRouter>
            </QueryClientProvider>,
        ),
    );
}

describe('DeliveryPartnerInboxPage', () => {
    it('shows the current assignment and accept/reject actions when newly ASSIGNED', async () => {
        renderPage();

        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument(),
        );
        expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Go online' })).toBeInTheDocument();
    });
});
