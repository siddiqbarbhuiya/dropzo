import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { withTheme } from '../../test/renderWithProviders';
import { apiClient } from '../../lib/apiClient';
import { MerchantAnalyticsPage } from './MerchantAnalyticsPage';
import type { Store } from '@dropzo/api-client';

vi.mock('../../lib/apiClient', () => ({
    apiClient: {
        listOwnStores: vi.fn(),
    },
}));

const mockStores: Store[] = [
    {
        id: 'store-1',
        merchant_id: 'merchant-1',
        name: 'Maa Tara Groceries',
        address: 'Station Road, Badarpur',
        is_active: true,
        contact_phone: '+919435100000',
        created_at: '2026-10-01T08:00:00Z',
        updated_at: '2026-10-01T08:00:00Z',
    } as unknown as Store,
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
                    <MerchantAnalyticsPage />
                </MemoryRouter>
            </QueryClientProvider>,
        ),
    );
}

describe('MerchantAnalyticsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(apiClient.listOwnStores).mockResolvedValue({
            data: mockStores,
            meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        });
    });

    it('renders top merchant bar, brand identity, live status pill, and dashboard subheader', async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Dropzo Merchant')).toBeInTheDocument();
            expect(screen.getByText(/BADARPUR HUB LIVE/i)).toBeInTheDocument();
            expect(screen.getAllByText(/Maa Tara Groceries/i).length).toBeGreaterThan(0);
        });

        expect(screen.getByText('Daily Store Performance')).toBeInTheDocument();
        expect(screen.getByText(/Fulfillment On-Track/i)).toBeInTheDocument();
        expect(screen.getAllByText(/FR-PICK-001/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Counter 01')).toBeInTheDocument();
    });

    it('renders all 5 KPI performance metric cards with accurate values', async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText("Today's Gross Revenue")).toBeInTheDocument();
        });

        // KPI 1: Gross Revenue
        expect(screen.getAllByText('₹4,820').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/\+14\.2% vs yesterday/i)).toBeInTheDocument();

        // KPI 2: Channel Fulfillment Split
        expect(screen.getByText('Channel Fulfillment Split')).toBeInTheDocument();
        expect(screen.getByText(/Pickup vs 35% Del/i)).toBeInTheDocument();
        expect(screen.getByText(/Pickup: ₹3,140/i)).toBeInTheDocument();

        // KPI 3: Average Order Value
        expect(screen.getByText('Average Order Value')).toBeInTheDocument();
        expect(screen.getByText('₹185.38')).toBeInTheDocument();

        // KPI 4: Avg Fulfillment SLA
        expect(screen.getByText('Avg Fulfillment SLA')).toBeInTheDocument();
        expect(screen.getByText('10.8')).toBeInTheDocument();
        expect(screen.getByText(/98\.4% on-time/i)).toBeInTheDocument();

        // KPI 5: PIN Verification Rate
        expect(screen.getByText('PIN Verification Rate')).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
        expect(screen.getByText(/0 Pickup Lockouts/i)).toBeInTheDocument();
    });

    it('renders hourly velocity bar chart, fulfillment funnel, top-selling SKUs, and settlement matrix', async () => {
        renderPage();

        await waitFor(() => {
            expect(
                screen.getByText(/Hourly Sales & Order Traffic Velocity/i),
            ).toBeInTheDocument();
        });

        // Hourly Velocity & Commuter Rush Insight
        expect(screen.getByText(/Badarpur Commuter Rush Insight/i)).toBeInTheDocument();
        expect(screen.getByText('Peak ₹1,120')).toBeInTheDocument();

        // Funnel Stages
        expect(screen.getByText('Fulfillment Funnel Speed')).toBeInTheDocument();
        expect(screen.getByText(/1\. Order Accepted/i)).toBeInTheDocument();
        expect(screen.getByText(/2\. Packing & Bagging/i)).toBeInTheDocument();
        expect(screen.getByText(/3\. Counter PIN Handoff/i)).toBeInTheDocument();
        expect(screen.getByText('10.8 Mins')).toBeInTheDocument();

        // Top Selling SKUs Leaderboard
        expect(
            screen.getByText(/Top Selling SKUs & Velocity Leaderboard/i),
        ).toBeInTheDocument();
        expect(screen.getByText('Fortune Sunlite Sunflower Oil (1L)')).toBeInTheDocument();
        expect(screen.getByText('India Gate Basmati Rice (1kg)')).toBeInTheDocument();
        expect(screen.getByText('Assam Valley CTC Tea (250g)')).toBeInTheDocument();
        expect(screen.getByText('Amul Butter (500g)')).toBeInTheDocument();
        expect(screen.getByText('Fresh Kazi Nemu (Barak Special)')).toBeInTheDocument();

        // Settlement Matrix & Bank Banner
        expect(screen.getByText('Settlement & Collections')).toBeInTheDocument();
        expect(screen.getByText(/Cash \/ Pay at Counter \(COD\)/i)).toBeInTheDocument();
        expect(screen.getByText(/UPI Direct \/ Online Pre-paid/i)).toBeInTheDocument();
        expect(screen.getByText(/Total Daily Realized Earnings/i)).toBeInTheDocument();
        expect(screen.getByText(/State Bank of India/i)).toBeInTheDocument();

        // Operational Alerts
        expect(
            screen.getByText(/Urgent Stock Depletion: Barak Kazi Nemu/i),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Silchar-Badarpur Commuter Peak Ahead/i),
        ).toBeInTheDocument();
    });

    it('handles interactive date range switching, audio toggle, and print report action', async () => {
        const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Daily Store Performance')).toBeInTheDocument();
        });

        // Click Yesterday date button
        const yesterdayBtn = screen.getByRole('button', { name: /^Yesterday$/i });
        fireEvent.click(yesterdayBtn);

        // Click Last 7 Days button
        const last7DaysBtn = screen.getByRole('button', { name: /^Last 7 Days$/i });
        fireEvent.click(last7DaysBtn);

        // Toggle sound alert button
        const audioBtn = screen.getByRole('button', { name: /toggle chime alert/i });
        fireEvent.click(audioBtn);

        // Click Print Report
        const printBtn = screen.getByRole('button', { name: /print report/i });
        fireEvent.click(printBtn);
        expect(printSpy).toHaveBeenCalled();

        printSpy.mockRestore();
    });
});
