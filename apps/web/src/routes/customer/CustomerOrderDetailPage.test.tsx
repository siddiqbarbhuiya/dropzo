import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { dropzoTheme } from '../../theme';
import { CustomerOrderDetailPage } from './CustomerOrderDetailPage';
import { apiClient } from '../../lib/apiClient';

vi.mock('../../lib/apiClient', () => ({
    apiClient: {
        getOwnOrder: vi.fn(),
        getOwnPickupCode: vi.fn(),
        getOwnDeliveryStatus: vi.fn(),
        getOwnDeliveryCode: vi.fn(),
    },
}));

const mockPickupOrder = {
    id: 'ord-123',
    order_number: 'DZ-2026-8941',
    status: 'PREPARING' as const,
    total_amount: 555,
    subtotal: 555,
    discount_amount: 0,
    delivery_fee: 0,
    tax_amount: 0,
    fulfilment_type: 'PICKUP' as const,
    payment_method: 'COD',
    store_name_snapshot: 'Maa Tara Groceries',
    store_address_snapshot:
        'Station Road, Badarpur (Near Old Cinema Hall), Karimganj Dist, Assam 788806',
    delivery_recipient_name_snapshot: null,
    delivery_recipient_phone_snapshot: null,
    customer_notes: null,
    placed_at: '2026-11-12T17:15:00.000Z',
    estimated_ready_at: '2026-11-12T17:45:00.000Z',
    completed_at: null,
    created_at: '2026-11-12T17:15:00.000Z',
    items: [
        {
            id: 'item-1',
            product_name_snapshot: 'Fortune Sunlite Refined Oil',
            variant_snapshot: '1 Litre Pouch',
            sku_snapshot: 'FORT-OIL-1L',
            quantity: 1,
            unit_price: 145,
            tax_amount: 0,
            line_total: 145,
        },
        {
            id: 'item-2',
            product_name_snapshot: 'Daawat Rozana Basmati Rice',
            variant_snapshot: '2 kg Pack',
            sku_snapshot: 'DAAW-RICE-2K',
            quantity: 1,
            unit_price: 350,
            tax_amount: 0,
            line_total: 350,
        },
        {
            id: 'item-3',
            product_name_snapshot: 'Amul Butter (Pasteurised)',
            variant_snapshot: '100g Carton',
            sku_snapshot: 'AMUL-BTR-100',
            quantity: 1,
            unit_price: 60,
            tax_amount: 0,
            line_total: 60,
        },
    ],
    status_history: [
        {
            id: 'sh-1',
            old_status: null,
            new_status: 'CREATED',
            reason: 'Order placed',
            created_at: '2026-11-12T17:15:00.000Z',
        },
        {
            id: 'sh-2',
            old_status: 'CREATED',
            new_status: 'ACCEPTED',
            reason: 'Merchant accepted order',
            created_at: '2026-11-12T17:18:00.000Z',
        },
        {
            id: 'sh-3',
            old_status: 'ACCEPTED',
            new_status: 'PREPARING',
            reason: 'Packing items',
            created_at: '2026-11-12T17:22:00.000Z',
        },
    ],
};

function renderWithProviders(initialEntry = '/orders/ord-123') {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={dropzoTheme}>
                <MemoryRouter initialEntries={[initialEntry]}>
                    <Routes>
                        <Route path="/orders/:orderId" element={<CustomerOrderDetailPage />} />
                        <Route path="/orders" element={<div>All Orders Page</div>} />
                        <Route path="/" element={<div>Home Page</div>} />
                    </Routes>
                </MemoryRouter>
            </ThemeProvider>
        </QueryClientProvider>,
    );
}

describe('CustomerOrderDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
        });
    });

    it('renders loading state initially', () => {
        vi.mocked(apiClient.getOwnOrder).mockImplementation(() => new Promise(() => {}));
        renderWithProviders();

        expect(screen.getByRole('status', { name: /Loading order/i })).toBeInTheDocument();
    });

    it('renders error state when order cannot be loaded', async () => {
        vi.mocked(apiClient.getOwnOrder).mockRejectedValue(new Error('Network error'));
        renderWithProviders();

        expect(await screen.findByText(/Could not load this order/i)).toBeInTheDocument();
    });

    it('renders order confirmation, store details, and verification PIN for pickup', async () => {
        vi.mocked(apiClient.getOwnOrder).mockResolvedValue(mockPickupOrder);
        vi.mocked(apiClient.getOwnPickupCode).mockResolvedValue({
            codeAvailable: true,
            code: 'DZ-8492',
            expiresAt: '2026-11-14T17:45:00.000Z',
        });

        renderWithProviders();

        // Sub-header and confirmation banner
        await screen.findAllByText(/Order #DZ-2026-8941/i);
        expect(screen.getByText(/Order Confirmed with Maa Tara Groceries/i)).toBeInTheDocument();

        // Store counter verification card
        expect(screen.getByText(/Store Counter Verification/i)).toBeInTheDocument();
        expect(screen.getByText('DZ-8941')).toBeInTheDocument();
        expect(screen.getByText(/Scan for Instant Match/i)).toBeInTheDocument();

        // Timeline stepper
        expect(screen.getByText(/Merchant is Packing Items/i)).toBeInTheDocument();
        expect(screen.getByText(/Live Order Progress/i)).toBeInTheDocument();

        // Store location card
        expect(screen.getAllByText(/Maa Tara Groceries/i).length).toBeGreaterThan(0);
        expect(screen.getByRole('link', { name: /Call Shop/i })).toHaveAttribute(
            'href',
            'tel:+919876543210',
        );
        expect(screen.getByRole('link', { name: /Directions/i })).toHaveAttribute(
            'href',
            expect.stringContaining('maps.google.com'),
        );

        // Order summary items
        expect(screen.getByText(/Fortune Sunlite Refined Oil/i)).toBeInTheDocument();
        expect(screen.getByText(/Daawat Rozana Basmati Rice/i)).toBeInTheDocument();
        expect(screen.getByText(/Amul Butter \(Pasteurised\)/i)).toBeInTheDocument();
        expect(screen.getAllByText(/₹555/i).length).toBeGreaterThan(0);
    });

    it('copies the pickup PIN to clipboard when copy button is clicked', async () => {
        vi.mocked(apiClient.getOwnOrder).mockResolvedValue(mockPickupOrder);
        renderWithProviders();

        await screen.findAllByText(/Order #DZ-2026-8941/i);

        const copyBtn = screen.getByTitle(/Copy PIN to clipboard/i);
        fireEvent.click(copyBtn);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('DZ-'));
        await waitFor(() => {
            expect(screen.getByText(/Copied!/i)).toBeInTheDocument();
        });
    });

    it('renders delivery partner and delivery code for delivery orders', async () => {
        const deliveryOrder = {
            ...mockPickupOrder,
            fulfilment_type: 'DELIVERY' as const,
            status: 'OUT_FOR_DELIVERY' as const,
            delivery_recipient_name_snapshot: 'Siddiq Ahmed',
            delivery_recipient_phone_snapshot: '+919435012345',
        };

        vi.mocked(apiClient.getOwnOrder).mockResolvedValue(deliveryOrder);
        vi.mocked(apiClient.getOwnDeliveryStatus).mockResolvedValue({
            orderStatus: 'OUT_FOR_DELIVERY',
            assignment: {
                deliveryStatus: 'OUT_FOR_DELIVERY',
                partnerName: 'Rahul Das',
                partnerPhone: '+919435987654',
                pickedUpAt: '2026-11-12T17:30:00.000Z',
                outForDeliveryAt: '2026-11-12T17:35:00.000Z',
                deliveredAt: null,
            },
        });
        vi.mocked(apiClient.getOwnDeliveryCode).mockResolvedValue({
            codeAvailable: true,
            code: '948215',
            expiresAt: '2026-11-12T18:30:00.000Z',
        });

        renderWithProviders();

        expect(await screen.findByText(/Rahul Das/i)).toBeInTheDocument();
        expect(await screen.findByText('948215')).toBeInTheDocument();
    });
});
