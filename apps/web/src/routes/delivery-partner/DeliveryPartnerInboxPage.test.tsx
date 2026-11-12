import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeliveryPartnerInboxPage } from './DeliveryPartnerInboxPage';
import { withTheme } from '../../test/renderWithProviders';
import { apiClient } from '../../lib/apiClient';

vi.mock('../../lib/apiClient', () => ({
    apiClient: {
        getOwnDeliveryProfile: vi.fn(),
        getOwnCurrentAssignment: vi.fn(),
        getOwnCodSummary: vi.fn(),
        setOwnAvailability: vi.fn(),
        acceptAssignment: vi.fn(),
        rejectAssignment: vi.fn(),
        collectAssignment: vi.fn(),
        markOutForDelivery: vi.fn(),
        verifyDeliveryCode: vi.fn(),
        reportDeliveryFailure: vi.fn(),
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
                    <DeliveryPartnerInboxPage />
                </MemoryRouter>
            </QueryClientProvider>,
        ),
    );
}

describe('DeliveryPartnerInboxPage', () => {
    it('shows the current assignment and accept/reject actions when newly ASSIGNED', async () => {
        vi.mocked(apiClient.getOwnDeliveryProfile).mockResolvedValue({
            id: 'dp-1',
            is_approved: true,
            is_available: false,
            vehicle_type: 'Bike',
            user: { id: 'u-1', full_name: 'Bishnu D.', phone: '+919876543210' },
        });
        vi.mocked(apiClient.getOwnCurrentAssignment).mockResolvedValue({
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
            cod_amount_due: '340.00',
            cod_collected_amount: null,
            cod_collected_at: null,
        });
        vi.mocked(apiClient.getOwnCodSummary).mockResolvedValue({
            outstandingBalance: '340.00',
            uncollectedAssignments: [],
        });

        renderPage();

        await waitFor(() =>
            expect(screen.getByRole('button', { name: /Accept/i })).toBeInTheDocument(),
        );
        expect(screen.getByRole('button', { name: /^Reject$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Go online/i })).toBeInTheDocument();
        expect(screen.getByText('Badarpur Town Zone')).toBeInTheDocument();
        expect(screen.getByText("Today's Earnings")).toBeInTheDocument();
        expect(screen.getByText('Maa Tara Groceries')).toBeInTheDocument();
        expect(screen.getByText('Rahul S.')).toBeInTheDocument();
        expect(screen.getByText(/Collect ₹340.00/i)).toBeInTheDocument();
    });

    it('renders out-for-delivery status and accepts 6-digit delivery PIN', async () => {
        vi.mocked(apiClient.getOwnDeliveryProfile).mockResolvedValue({
            id: 'dp-1',
            is_approved: true,
            is_available: true,
            vehicle_type: 'Bike',
            user: { id: 'u-1', full_name: 'Bishnu D.', phone: '+919876543210' },
        });
        vi.mocked(apiClient.getOwnCurrentAssignment).mockResolvedValue({
            id: 'asgn-1',
            order_id: 'order-1',
            delivery_status: 'OUT_FOR_DELIVERY',
            assigned_at: new Date().toISOString(),
            accepted_at: new Date().toISOString(),
            rejected_at: null,
            rejected_reason: null,
            picked_up_at: new Date().toISOString(),
            picked_up_confirmed_by_merchant_at: new Date().toISOString(),
            out_for_delivery_at: new Date().toISOString(),
            delivered_at: null,
            failed_at: null,
            failed_reason: null,
            cod_amount_due: '340.00',
            cod_collected_amount: null,
            cod_collected_at: null,
        });
        vi.mocked(apiClient.getOwnCodSummary).mockResolvedValue({
            outstandingBalance: '340.00',
            uncollectedAssignments: [],
        });
        vi.mocked(apiClient.verifyDeliveryCode).mockResolvedValue({
            verified: true,
            attemptsRemaining: 0,
        });

        renderPage();

        await waitFor(() =>
            expect(screen.getByText(/5\. Customer Delivery PIN/i)).toBeInTheDocument(),
        );

        const digitInputs = screen.getAllByRole('textbox', { name: /Digit/i });
        expect(digitInputs).toHaveLength(6);

        fireEvent.change(digitInputs[0], { target: { value: '1' } });
        fireEvent.change(digitInputs[1], { target: { value: '2' } });
        fireEvent.change(digitInputs[2], { target: { value: '3' } });
        fireEvent.change(digitInputs[3], { target: { value: '4' } });
        fireEvent.change(digitInputs[4], { target: { value: '5' } });
        fireEvent.change(digitInputs[5], { target: { value: '6' } });

        const verifyBtn = screen.getByRole('button', {
            name: /Verify Customer PIN & Complete Delivery/i,
        });
        expect(verifyBtn).toBeEnabled();
        fireEvent.click(verifyBtn);

        await waitFor(() => {
            expect(apiClient.verifyDeliveryCode).toHaveBeenCalledWith('order-1', '123456');
        });
    });

    it('opens and closes the UPI QR modal', async () => {
        vi.mocked(apiClient.getOwnDeliveryProfile).mockResolvedValue({
            id: 'dp-1',
            is_approved: true,
            is_available: true,
            vehicle_type: 'Bike',
            user: { id: 'u-1', full_name: 'Bishnu D.', phone: '+919876543210' },
        });
        vi.mocked(apiClient.getOwnCurrentAssignment).mockResolvedValue({
            id: 'asgn-1',
            order_id: 'order-1',
            delivery_status: 'OUT_FOR_DELIVERY',
            assigned_at: new Date().toISOString(),
            accepted_at: new Date().toISOString(),
            rejected_at: null,
            rejected_reason: null,
            picked_up_at: new Date().toISOString(),
            picked_up_confirmed_by_merchant_at: new Date().toISOString(),
            out_for_delivery_at: new Date().toISOString(),
            delivered_at: null,
            failed_at: null,
            failed_reason: null,
            cod_amount_due: '340.00',
            cod_collected_amount: null,
            cod_collected_at: null,
        });
        vi.mocked(apiClient.getOwnCodSummary).mockResolvedValue({
            outstandingBalance: '340.00',
            uncollectedAssignments: [],
        });

        renderPage();

        await waitFor(() =>
            expect(screen.getByRole('button', { name: /UPI QR/i })).toBeInTheDocument(),
        );

        fireEvent.click(screen.getByRole('button', { name: /UPI QR/i }));
        expect(screen.getByText('Customer UPI QR')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Close QR/i }));
        expect(screen.queryByText('Customer UPI QR')).not.toBeInTheDocument();
    });
});
