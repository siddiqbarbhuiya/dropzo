import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomePage } from './HomePage';
import { withTheme } from '../test/renderWithProviders';
import { useAuthStore } from '../store/useAuthStore';

const listPublicStores = vi.fn();

vi.mock('../lib/apiClient', () => ({
    apiClient: {
        listPublicStores: (...args: unknown[]) => listPublicStores(...args),
        getHealth: vi.fn().mockResolvedValue({ status: 'ok', uptimeSeconds: 100 }),
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
                <MemoryRouter initialEntries={['/']}>
                    <HomePage />
                </MemoryRouter>
            </QueryClientProvider>,
        ),
    );
}

describe('HomePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthStore.getState().clearSession();
        listPublicStores.mockResolvedValue({
            data: [
                {
                    id: 'store-1',
                    name: 'Maa Tara Groceries',
                    slug: 'maa-tara-groceries',
                    address: 'Station Road, Badarpur',
                    latitude: '24.9030',
                    longitude: '92.5450',
                    is_open: true,
                    status: 'ACTIVE',
                    store_hours: { opens_at: '07:00', closes_at: '21:00' },
                },
                {
                    id: 'store-2',
                    name: 'Bismillah Daily Fresh',
                    slug: 'bismillah-daily-fresh',
                    address: 'Market Complex, Main Chowk',
                    latitude: '24.9040',
                    longitude: '92.5460',
                    is_open: true,
                    status: 'ACTIVE',
                    store_hours: { opens_at: '08:00', closes_at: '22:00' },
                },
            ],
            total: 2,
            page: 1,
            limit: 10,
            totalPages: 1,
        });
    });

    it('renders marketplace home for unauthenticated guests with Badarpur location pill', async () => {
        renderPage();

        expect(screen.getAllByText(/Badarpur Main Town/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/15-30 min|15 mins/i).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: /Sign In/i }).length).toBeGreaterThan(0);
    });

    it('renders dynamic popular stores fetched from listPublicStores', async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Maa Tara Groceries')).toBeInTheDocument();
            expect(screen.getByText('Bismillah Daily Fresh')).toBeInTheDocument();
        });

        expect(screen.getByText(/Station Road, Badarpur/i)).toBeInTheDocument();
        expect(screen.getByText(/Market Complex, Main Chowk/i)).toBeInTheDocument();
    });

    it('renders category carousel and promo banner', () => {
        renderPage();

        expect(screen.getByText('Vegetables')).toBeInTheDocument();
        expect(screen.getByText('Soft Fruits')).toBeInTheDocument();
        expect(screen.getAllByText('Dairy & Bread').length).toBeGreaterThan(0);
        expect(screen.getByText('Groceries')).toBeInTheDocument();
        expect(screen.getByText(/100% Farm Fresh/i)).toBeInTheDocument();
        expect(screen.getByText(/Fresh foods everyday and our best service/i)).toBeInTheDocument();
    });

    it('renders daily essentials with add-to-cart controls', () => {
        renderPage();

        expect(screen.getByText('Fresh Strawberry')).toBeInTheDocument();
        expect(screen.getByText('Hass Avocado')).toBeInTheDocument();
        expect(screen.getByText('Shudh Chakki Atta')).toBeInTheDocument();
        expect(screen.getByText('Taaza Fresh Milk')).toBeInTheDocument();
        expect(screen.getByText('₹120')).toBeInTheDocument();
    });

    it('renders user greeting when user is logged in', () => {
        useAuthStore.setState({
            tokens: { accessToken: 'token-123', refreshToken: 'refresh-123' },
            user: {
                id: 'user-1',
                phone: '9435028410',
                fullName: 'Cameron Williamson',
                isActive: true,
                roles: ['CUSTOMER'],
            },
        });

        renderPage();

        expect(screen.queryByRole('link', { name: /Sign In/i })).not.toBeInTheDocument();
        expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    });
});
