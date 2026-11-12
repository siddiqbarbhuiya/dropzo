import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminMerchantApprovalsPage } from './AdminMerchantApprovalsPage';
import { withTheme } from '../../test/renderWithProviders';

const mockListApplications = vi.fn();
const mockApprove = vi.fn();
const mockReject = vi.fn();

vi.mock('../../lib/apiClient', () => ({
    apiClient: {
        listMerchantApplications: (...args: unknown[]) => mockListApplications(...args),
        approveMerchantApplication: (...args: unknown[]) => mockApprove(...args),
        rejectMerchantApplication: (...args: unknown[]) => mockReject(...args),
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
                    <AdminMerchantApprovalsPage />
                </MemoryRouter>
            </QueryClientProvider>,
        ),
    );
}

describe('AdminMerchantApprovalsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockListApplications.mockResolvedValue({
            data: [],
            meta: { page: 1, limit: 50, total: 0, totalPages: 1 },
        });
        mockApprove.mockResolvedValue({ status: 'APPROVED' });
        mockReject.mockResolvedValue({ status: 'REJECTED' });
    });

    it('renders top admin brand, Badarpur zone pill, and KPI metrics', () => {
        renderPage();

        expect(screen.getByText('Dropzo Admin')).toBeInTheDocument();
        expect(screen.getByText('Badarpur Central Zone #01 (Active)')).toBeInTheDocument();
        expect(screen.getByText('Merchant Approvals & Store Onboarding')).toBeInTheDocument();

        // KPI checks
        expect(screen.getByText('Pending Review')).toBeInTheDocument();
        expect(screen.getByText('Action / Resubmitted')).toBeInTheDocument();
        expect(screen.getByText('Approved This Month')).toBeInTheDocument();
        expect(screen.getByText('Avg Review Turnaround')).toBeInTheDocument();
        expect(screen.getByText('3.2 Hours')).toBeInTheDocument();
    });

    it('renders FR-MER-005 protection notice banner and FR-ADM-002 config', () => {
        renderPage();

        expect(
            screen.getByText(
                /FR-MER-005 Protection: Store Is Currently Hidden From Public Customers/,
            ),
        ).toBeInTheDocument();
        expect(screen.getByText('COMMISSION MODEL')).toBeInTheDocument();
        expect(screen.getByText('FULFILLMENT MODES')).toBeInTheDocument();
        expect(screen.getByText('PREP TIME SLA TARGET')).toBeInTheDocument();
    });

    it('filters applications queue using filter chips', () => {
        renderPage();

        const pendingChip = screen.getByRole('button', { name: /Pending KYC/ });
        fireEvent.click(pendingChip);

        // Bismillah is pending, so it should be present
        expect(screen.getAllByText('Bismillah Daily Fresh').length).toBeGreaterThan(0);

        const resubmittedChip = screen.getByRole('button', { name: /Resubmitted/ });
        fireEvent.click(resubmittedChip);

        // Gupta Stationery is resubmitted
        expect(screen.getAllByText('Gupta Stationery & Book Depo').length).toBeGreaterThan(0);
    });

    it('selecting a different application updates the detail review pane', () => {
        renderPage();

        // Initially Bismillah Daily Fresh is selected
        expect(screen.getAllByText(/Faruk Barbhuiya/).length).toBeGreaterThan(0);

        // Click on Gupta Stationery card in list
        const guptaCard = screen.getByTestId('app-card-app-002');
        fireEvent.click(guptaCard);

        // Detail pane updates with Gupta's proprietor
        expect(screen.getAllByText(/Ramesh Gupta/).length).toBeGreaterThan(0);
        expect(screen.getByText('TC/BDP/2024/7741')).toBeInTheDocument();
    });

    it('opens rejection modal, enforces reason, and submits rejection', async () => {
        renderPage();

        const rejectBtn = screen.getByTestId('reject-app-btn');
        fireEvent.click(rejectBtn);

        expect(screen.getByRole('heading', { name: /Reject Application/ })).toBeInTheDocument();
        const confirmBtn = screen.getByTestId('confirm-reject-btn');
        expect(confirmBtn).toBeDisabled();

        const input = screen.getByTestId('rejection-reason-input');
        fireEvent.change(input, { target: { value: 'Counter pickup photo is missing' } });
        expect(confirmBtn).not.toBeDisabled();

        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(mockReject).toHaveBeenCalledWith('app-001', 'Counter pickup photo is missing');
        });
    });

    it('approves an application and displays success confirmation toast', async () => {
        renderPage();

        const approveBtn = screen.getByTestId('approve-app-btn');
        fireEvent.click(approveBtn);

        await waitFor(() => {
            expect(mockApprove).toHaveBeenCalledWith('app-001');
        });

        expect(
            await screen.findByText(/Store Bismillah Daily Fresh approved and switched to ACTIVE/),
        ).toBeInTheDocument();
    });
});
