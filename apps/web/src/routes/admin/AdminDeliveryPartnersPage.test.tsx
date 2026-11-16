import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DeliveryPartner } from '@dropzo/api-client';
import { AdminDeliveryPartnersPage } from './AdminDeliveryPartnersPage';
import { withTheme } from '../../test/renderWithProviders';
import { apiClient } from '../../lib/apiClient';

vi.mock('../../lib/apiClient', () => ({
    apiClient: {
        listDeliveryPartners: vi.fn(),
        createDeliveryPartner: vi.fn(),
        activateDeliveryPartner: vi.fn(),
        deactivateDeliveryPartner: vi.fn(),
    },
}));

const mockPartners: DeliveryPartner[] = [
    {
        id: 'partner-1',
        user_id: 'user-1',
        vehicle_type: 'Hero Splendor',
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
        is_approved: false,
        is_available: false,
        created_at: '2026-10-01T08:00:00Z',
        updated_at: '2026-10-01T08:00:00Z',
        user: {
            id: 'user-2',
            full_name: 'Rahim Uddin',
            phone: '+919435100002',
        },
    } as unknown as DeliveryPartner,
];

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
                    <AdminDeliveryPartnersPage />
                </MemoryRouter>
            </QueryClientProvider>,
        ),
    );
}

describe('AdminDeliveryPartnersPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(apiClient.listDeliveryPartners).mockResolvedValue({
            data: mockPartners,
            meta: { page: 1, limit: 50, total: 2, totalPages: 1 },
        });
        vi.mocked(apiClient.createDeliveryPartner).mockResolvedValue({
            id: 'partner-3',
            user_id: 'user-3',
            vehicle_type: 'Electric Scooter',
            is_approved: true,
            is_available: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        } as unknown as DeliveryPartner);
        vi.mocked(apiClient.activateDeliveryPartner).mockResolvedValue({} as unknown as DeliveryPartner);
        vi.mocked(apiClient.deactivateDeliveryPartner).mockResolvedValue({} as unknown as DeliveryPartner);
    });

    it('renders admin header, KPI metrics, fast onboarding form, and courier roster table', async () => {
        renderPage();

        await waitFor(() => {
            expect(
                screen.getByText(/Fleet Roster & Delivery Partner Management/i),
            ).toBeInTheDocument();
            expect(screen.getByText('Bishnu Das')).toBeInTheDocument();
            expect(screen.getByText('Rahim Uddin')).toBeInTheDocument();
        });

        expect(screen.getByText(/Total Fleet Registered/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Online on Duty/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/Hero Splendor/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/Honda Activa/i).length).toBeGreaterThanOrEqual(1);
    });

    it('submits onboarding form with user id and selected vehicle type', async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Bishnu Das')).toBeInTheDocument();
        });

        const userIdInput = screen.getByPlaceholderText(/User ID or Phone/i);
        fireEvent.change(userIdInput, { target: { value: 'user-3' } });

        const vehicleBtn = screen.getByRole('button', { name: /Electric Scooter/i });
        fireEvent.click(vehicleBtn);

        const submitBtn = screen.getByRole('button', { name: /Onboard Courier Partner/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(apiClient.createDeliveryPartner).toHaveBeenCalledWith('user-3', 'Electric Scooter');
        });
    });

    it('toggles partner status between active and inactive', async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Bishnu Das')).toBeInTheDocument();
        });

        // Deactivate active partner Bishnu Das
        const deactivateBtn = screen.getByRole('button', { name: /Deactivate partner-1/i });
        fireEvent.click(deactivateBtn);

        await waitFor(() => {
            expect(apiClient.deactivateDeliveryPartner).toHaveBeenCalledWith('partner-1');
        });

        // Activate inactive partner Rahim Uddin
        const activateBtn = screen.getByRole('button', { name: /Activate partner-2/i });
        fireEvent.click(activateBtn);

        await waitFor(() => {
            expect(apiClient.activateDeliveryPartner).toHaveBeenCalledWith('partner-2');
        });
    });

    it('filters fleet list by active / inactive filter tabs', async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Bishnu Das')).toBeInTheDocument();
            expect(screen.getByText('Rahim Uddin')).toBeInTheDocument();
        });

        // Click Online & Active filter tab
        const activeTab = screen.getByRole('button', { name: /^Active/i });
        fireEvent.click(activeTab);

        expect(screen.getByText('Bishnu Das')).toBeInTheDocument();
        expect(screen.queryByText('Rahim Uddin')).not.toBeInTheDocument();

        // Click Inactive filter tab
        const inactiveTab = screen.getByRole('button', { name: /^Inactive/i });
        fireEvent.click(inactiveTab);

        expect(screen.queryByText('Bishnu Das')).not.toBeInTheDocument();
        expect(screen.getByText('Rahim Uddin')).toBeInTheDocument();
    });
});
