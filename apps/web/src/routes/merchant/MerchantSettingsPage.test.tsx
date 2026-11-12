import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MerchantSettingsPage } from './MerchantSettingsPage';
import { withTheme } from '../../test/renderWithProviders';

const mockListStores = vi.fn();
const mockUpdateStatus = vi.fn();
const mockUpdateHours = vi.fn();

vi.mock('../../lib/apiClient', () => ({
    apiClient: {
        listOwnStores: (...args: unknown[]) => mockListStores(...args),
        updateOwnStoreStatus: (...args: unknown[]) => mockUpdateStatus(...args),
        updateOwnStoreHours: (...args: unknown[]) => mockUpdateHours(...args),
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
                    <MerchantSettingsPage />
                </MemoryRouter>
            </QueryClientProvider>,
        ),
    );
}

describe('MerchantSettingsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockListStores.mockResolvedValue({
            data: [{ id: 'store-1', name: 'Maa Tara Groceries' }],
            meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        });
        mockUpdateStatus.mockResolvedValue({ status: 'ACTIVE' });
        mockUpdateHours.mockResolvedValue({ success: true });
    });

    it('renders header, store brand, verified partner badge and FSSAI number', () => {
        renderPage();

        expect(screen.getByText('Dropzo Merchant')).toBeInTheDocument();
        expect(screen.getAllByText('Maa Tara Groceries').length).toBeGreaterThan(0);
        expect(screen.getByText(/Verified Hub Partner/)).toBeInTheDocument();
        expect(screen.getByText(/#2032400104128/)).toBeInTheDocument();
        expect(screen.getByText('Store Settings & Operations')).toBeInTheDocument();
    });

    it('toggles store operational status between Live, Busy, and Closed', async () => {
        renderPage();

        const busyBtn = screen.getByTestId('status-busy-btn');
        fireEvent.click(busyBtn);

        await waitFor(() => {
            expect(mockUpdateStatus).toHaveBeenCalledWith('store-1', 'PAUSED');
        });

        const closedBtn = screen.getByTestId('status-closed-btn');
        fireEvent.click(closedBtn);

        await waitFor(() => {
            expect(mockUpdateStatus).toHaveBeenCalledWith('store-1', 'CLOSED');
        });
    });

    it('renders weekly schedule and applies weekday hours to all days', async () => {
        renderPage();

        expect(screen.getByText('Weekly Operating Schedule')).toBeInTheDocument();
        expect(screen.getByText('Monday')).toBeInTheDocument();
        expect(screen.getByText('Sunday')).toBeInTheDocument();

        const copyBtn = screen.getByRole('button', { name: /Apply Weekday Hours to All/ });
        fireEvent.click(copyBtn);

        expect(await screen.findByText(/Weekday hours applied to all days/)).toBeInTheDocument();
    });

    it('adjusts capacity steppers and updates values', () => {
        renderPage();

        expect(screen.getByText('15')).toBeInTheDocument(); // Initial max active orders
        const plusBtns = screen.getAllByRole('button', { name: '+' });
        fireEvent.click(plusBtns[0]); // Increment max orders

        expect(screen.getByText('16')).toBeInTheDocument();
    });

    it('saves operating schedule and counter settings with feedback toast', async () => {
        renderPage();

        const saveBtn = screen.getByTestId('save-schedule-btn');
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(mockUpdateHours).toHaveBeenCalled();
        });

        expect(
            await screen.findByText(/Operating hours and counter pickup settings saved/),
        ).toBeInTheDocument();
    });
});
