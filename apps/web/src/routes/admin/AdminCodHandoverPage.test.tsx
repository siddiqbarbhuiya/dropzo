import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DeliveryPartner, CodSummary, CodHandover } from '@dropzo/api-client';
import { AdminCodHandoverPage } from './AdminCodHandoverPage';
import { withTheme } from '../../test/renderWithProviders';
import { apiClient } from '../../lib/apiClient';

vi.mock('../../lib/apiClient', () => ({
    apiClient: {
        listDeliveryPartners: vi.fn(),
        getDeliveryPartnerCodSummary: vi.fn(),
        listDeliveryPartnerHandovers: vi.fn(),
        recordCodHandover: vi.fn(),
    },
}));

const mockPartners: DeliveryPartner[] = [
    {
        id: 'partner-1',
        user_id: 'user-1',
        vehicle_type: 'Hero Splendor',
        is_active: true,
        is_approved: true,
        is_available: true,
        created_at: '2026-10-01T08:00:00Z',
        updated_at: '2026-10-01T08:00:00Z',
        user: {
            id: 'user-1',
            full_name: 'Bishnu Das',
            phone: '+919435100001',
        },
    } as unknown as DeliveryPartner,
    {
        id: 'partner-2',
        user_id: 'user-2',
        vehicle_type: 'Honda Activa',
        is_active: true,
        is_approved: true,
        is_available: true,
        created_at: '2026-10-01T08:00:00Z',
        updated_at: '2026-10-01T08:00:00Z',
        user: {
            id: 'user-2',
            full_name: 'Rahim Uddin',
            phone: '+919435100002',
        },
    } as unknown as DeliveryPartner,
];

const mockCodSummary: CodSummary = {
    outstandingBalance: '3420.00',
    uncollectedAssignments: [
        {
            orderId: 'ORD-1052',
            amount: '340.00',
            collectedAt: '2026-10-24T11:48:00Z',
        },
        {
            orderId: 'ORD-1048',
            amount: '580.00',
            collectedAt: '2026-10-24T11:15:00Z',
        },
        {
            orderId: 'ORD-1045',
            amount: '920.00',
            collectedAt: '2026-10-24T10:50:00Z',
        },
    ],
};

const mockHandovers: CodHandover[] = [
    {
        id: 'HO-20251024-08',
        delivery_partner_id: 'partner-1',
        admin_user_id: 'admin-1',
        amount: '1880.00',
        notes: 'Verified full morning batch. Zero discrepancy.',
        created_at: '2026-10-24T13:15:00Z',
    } as unknown as CodHandover,
    {
        id: 'HO-20251024-07',
        delivery_partner_id: 'partner-1',
        admin_user_id: 'admin-1',
        amount: '2450.00',
        notes: 'Deposited to Safe Box B-01.',
        created_at: '2026-10-24T11:30:00Z',
    } as unknown as CodHandover,
];

function renderPage(initialEntry = '/admin/delivery-partners/partner-1/cod') {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });
    return render(
        withTheme(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={[initialEntry]}>
                    <Routes>
                        <Route
                            path="/admin/delivery-partners/:partnerId/cod"
                            element={<AdminCodHandoverPage />}
                        />
                        <Route
                            path="/admin/cod-handover"
                            element={<AdminCodHandoverPage />}
                        />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>,
        ),
    );
}

describe('AdminCodHandoverPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(apiClient.listDeliveryPartners).mockResolvedValue({
            data: mockPartners,
            meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
        });
        vi.mocked(apiClient.getDeliveryPartnerCodSummary).mockResolvedValue(mockCodSummary);
        vi.mocked(apiClient.listDeliveryPartnerHandovers).mockResolvedValue({
            data: mockHandovers,
            meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
        });
        vi.mocked(apiClient.recordCodHandover).mockResolvedValue({
            id: 'HO-NEW-01',
            delivery_partner_id: 'partner-1',
            admin_user_id: 'admin-1',
            amount: '3420.00',
            notes: 'Verified physical cash in safe.',
            created_at: new Date().toISOString(),
        } as unknown as CodHandover);
    });

    it('renders admin header, partner selector, custody summary, and uncollected orders table', async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText(/COD Handover & Cash Reconciliation/i)).toBeInTheDocument();
            expect(screen.getAllByText('Bishnu Das').length).toBeGreaterThan(0);
            expect(screen.getByText('ORD-1052')).toBeInTheDocument();
        });

        expect(screen.getAllByText(/₹3,420/).length).toBeGreaterThan(0);
        expect(screen.getByText('ORD-1048')).toBeInTheDocument();
        expect(screen.getByText('ORD-1045')).toBeInTheDocument();
    });

    it('supports selecting individual orders and toggling select all to calculate running total', async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('ORD-1052')).toBeInTheDocument();
        });

        // Click select all
        const selectAllBtn = screen.getByRole('button', { name: /^Select All$/i });
        fireEvent.click(selectAllBtn);

        // All 3 selected = 340 + 580 + 920 = 1840
        expect(screen.getByText(/Selected: ₹1,840/i)).toBeInTheDocument();

        // Clear all
        const clearBtn = screen.getByRole('button', { name: /^Deselect All$/i });
        fireEvent.click(clearBtn);

        expect(screen.getByText(/Selected: ₹0/i)).toBeInTheDocument();
    });

    it('submits cash handover with selected order IDs, notes, and displays receipt modal', async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('ORD-1052')).toBeInTheDocument();
        });

        // Select All
        const selectAllBtn = screen.getByRole('button', { name: /^Select All$/i });
        fireEvent.click(selectAllBtn);

        // Check physical cash verification toggle
        const confirmCheckbox = screen.getByLabelText(/I confirm physical Indian currency cash/i);
        fireEvent.click(confirmCheckbox);

        // Add cashier notes
        const notesInput = screen.getByPlaceholderText(/cashier verification notes/i);
        fireEvent.change(notesInput, { target: { value: 'All 3 orders verified in drawer.' } });

        // Click record handover
        const recordBtn = screen.getByRole('button', { name: /Record Cash Handover/i });
        fireEvent.click(recordBtn);

        await waitFor(() => {
            expect(apiClient.recordCodHandover).toHaveBeenCalledWith(
                'partner-1',
                ['ORD-1052', 'ORD-1048', 'ORD-1045'],
                'All 3 orders verified in drawer.',
            );
        });

        // Receipt modal should appear
        await waitFor(() => {
            expect(screen.getByText(/Cash Handover Receipt Generated/i)).toBeInTheDocument();
        });
    });

    it('renders past reconciliation audit log history table with settled sums and notes', async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('HO-20251024-08')).toBeInTheDocument();
        });

        expect(screen.getByText(/₹1,880/)).toBeInTheDocument();
        expect(screen.getByText(/Verified full morning batch/i)).toBeInTheDocument();
        expect(screen.getByText('HO-20251024-07')).toBeInTheDocument();
    });
});
