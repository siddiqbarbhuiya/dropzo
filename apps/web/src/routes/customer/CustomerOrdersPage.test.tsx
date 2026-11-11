import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomerOrdersPage } from './CustomerOrdersPage';
import { withTheme } from '../../test/renderWithProviders';
import { Order } from '@dropzo/api-client';

const listOwnOrders = vi.fn();

vi.mock('../../lib/apiClient', () => ({
    apiClient: {
        listOwnOrders: (...args: unknown[]) => listOwnOrders(...args),
    },
}));

const mockOrders: Order[] = [
    {
        id: 'ord-1',
        order_number: 'ORD-202611-0089',
        status: 'READY',
        total_amount: '425.00',
        subtotal: '425.00',
        discount_amount: '0.00',
        delivery_fee: '0.00',
        tax_amount: '0.00',
        fulfilment_type: 'PICKUP',
        payment_method: 'COD',
        store_name_snapshot: 'Maa Tara Groceries',
        store_address_snapshot: 'Station Road, Badarpur',
        delivery_recipient_name_snapshot: null,
        delivery_recipient_phone_snapshot: null,
        customer_notes: null,
        placed_at: '2026-11-12T01:00:00.000Z',
        estimated_ready_at: '2026-11-12T01:15:00.000Z',
        completed_at: null,
        created_at: '2026-11-12T01:00:00.000Z',
        items: [
            {
                id: 'item-1',
                product_name_snapshot: 'Aashirvaad Atta 5kg',
                variant_snapshot: '5kg',
                sku_snapshot: 'SKU-ATTA',
                quantity: 1,
                unit_price: '220.00',
                tax_amount: '0.00',
                line_total: '220.00',
            },
            {
                id: 'item-2',
                product_name_snapshot: 'Amul Butter 500g',
                variant_snapshot: '500g',
                sku_snapshot: 'SKU-AMUL',
                quantity: 1,
                unit_price: '205.00',
                tax_amount: '0.00',
                line_total: '205.00',
            },
        ],
    },
    {
        id: 'ord-2',
        order_number: 'ORD-202611-0104',
        status: 'PREPARING',
        total_amount: '210.00',
        subtotal: '190.00',
        discount_amount: '0.00',
        delivery_fee: '20.00',
        tax_amount: '0.00',
        fulfilment_type: 'DELIVERY',
        payment_method: 'COD',
        store_name_snapshot: 'Badarpur Fresh Mandi',
        store_address_snapshot: 'Main Market, Badarpur',
        delivery_recipient_name_snapshot: 'Rahul S.',
        delivery_recipient_phone_snapshot: '9435011111',
        customer_notes: null,
        placed_at: '2026-11-12T01:30:00.000Z',
        estimated_ready_at: '2026-11-12T01:45:00.000Z',
        completed_at: null,
        created_at: '2026-11-12T01:30:00.000Z',
        items: [
            {
                id: 'item-3',
                product_name_snapshot: 'Assam Lemon',
                variant_snapshot: '4 pcs',
                sku_snapshot: 'SKU-LEMON',
                quantity: 1,
                unit_price: '60.00',
                tax_amount: '0.00',
                line_total: '60.00',
            },
        ],
    },
    {
        id: 'ord-3',
        order_number: 'ORD-202610-0932',
        status: 'DELIVERED',
        total_amount: '185.00',
        subtotal: '165.00',
        discount_amount: '0.00',
        delivery_fee: '20.00',
        tax_amount: '0.00',
        fulfilment_type: 'DELIVERY',
        payment_method: 'COD',
        store_name_snapshot: 'Karimganj Tea & Bakery Hub',
        store_address_snapshot: 'Station Road',
        delivery_recipient_name_snapshot: null,
        delivery_recipient_phone_snapshot: null,
        customer_notes: null,
        placed_at: '2026-10-30T10:00:00.000Z',
        estimated_ready_at: null,
        completed_at: '2026-10-30T10:30:00.000Z',
        created_at: '2026-10-30T10:00:00.000Z',
        items: [
            {
                id: 'item-4',
                product_name_snapshot: 'Assam CTC Leaf Tea 500g',
                variant_snapshot: '500g',
                sku_snapshot: 'SKU-TEA',
                quantity: 1,
                unit_price: '185.00',
                tax_amount: '0.00',
                line_total: '185.00',
            },
        ],
    },
];

function renderPage() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        withTheme(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={['/orders']}>
                    <CustomerOrdersPage />
                </MemoryRouter>
            </QueryClientProvider>,
        ),
    );
}

describe('CustomerOrdersPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        listOwnOrders.mockResolvedValue({ data: mockOrders, total: 3, page: 1, limit: 50 });
    });

    it('renders header, location indicator, active orders and past orders', async () => {
        renderPage();

        expect(await screen.findByText('Maa Tara Groceries')).toBeInTheDocument();
        expect(screen.getByText('Station Road, Badarpur (Sribhumi)')).toBeInTheDocument();
        expect(screen.getByText('ORD-202611-0089')).toBeInTheDocument();
        expect(screen.getByText('READY FOR PICKUP')).toBeInTheDocument();
        expect(screen.getByText('Badarpur Fresh Mandi')).toBeInTheDocument();
        expect(screen.getByText('PREPARING (8 mins)')).toBeInTheDocument();
        expect(screen.getByText('Karimganj Tea & Bakery Hub')).toBeInTheDocument();
        expect(screen.getByText('DELIVERED')).toBeInTheDocument();
    });

    it('filters orders by category tab', async () => {
        renderPage();

        expect(await screen.findByText('Maa Tara Groceries')).toBeInTheDocument();

        // Switch to Active
        const activeTab = screen.getByRole('tab', { name: /Active/ });
        fireEvent.click(activeTab);

        expect(screen.getByText('Maa Tara Groceries')).toBeInTheDocument();
        expect(screen.getByText('Badarpur Fresh Mandi')).toBeInTheDocument();
        expect(screen.queryByText('Karimganj Tea & Bakery Hub')).not.toBeInTheDocument();

        // Switch to Completed
        const completedTab = screen.getByRole('tab', { name: /Completed/ });
        fireEvent.click(completedTab);

        expect(screen.queryByText('Maa Tara Groceries')).not.toBeInTheDocument();
        expect(screen.getByText('Karimganj Tea & Bakery Hub')).toBeInTheDocument();
    });

    it('filters orders using the search input', async () => {
        renderPage();

        expect(await screen.findByText('Maa Tara Groceries')).toBeInTheDocument();

        const searchInput = screen.getByLabelText('Search orders');
        fireEvent.change(searchInput, { target: { value: 'Mandi' } });

        expect(screen.getByText('Badarpur Fresh Mandi')).toBeInTheDocument();
        expect(screen.queryByText('Maa Tara Groceries')).not.toBeInTheDocument();
        expect(screen.queryByText('Karimganj Tea & Bakery Hub')).not.toBeInTheDocument();
    });

    it('renders empty state when no orders match search query', async () => {
        renderPage();

        expect(await screen.findByText('Maa Tara Groceries')).toBeInTheDocument();

        const searchInput = screen.getByLabelText('Search orders');
        fireEvent.change(searchInput, { target: { value: 'Nonexistent Store' } });

        expect(screen.getByText('No orders found')).toBeInTheDocument();
        expect(screen.getByText(/No orders matching "Nonexistent Store"/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Browse Badarpur Kiranas/ })).toBeInTheDocument();
    });

    it('provides action links to order tracking details', async () => {
        renderPage();

        expect(await screen.findByText('Maa Tara Groceries')).toBeInTheDocument();

        const trackButtons = screen.getAllByRole('link', { name: /View Code & QR|Track Progress/ });
        expect(trackButtons.length).toBeGreaterThan(0);
        expect(trackButtons[0].getAttribute('href')).toBe('/orders/ord-1');
    });
});
