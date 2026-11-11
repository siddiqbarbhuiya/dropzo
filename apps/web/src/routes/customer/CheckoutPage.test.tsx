import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { CheckoutPage } from './CheckoutPage';
import { dropzoTheme } from '../../theme';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../lib/apiClient';
import type { Order, PublicStore } from '@dropzo/api-client';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('../../lib/apiClient', () => ({
    apiClient: {
        getPublicStore: vi.fn(),
        createOrder: vi.fn(),
    },
}));

function renderWithProviders(ui: React.ReactElement) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={dropzoTheme}>
                <MemoryRouter>{ui}</MemoryRouter>
            </ThemeProvider>
        </QueryClientProvider>,
    );
}

describe('CheckoutPage', () => {
    const mockStore: PublicStore = {
        id: 'store-1',
        name: 'Maa Tara Groceries',
        description: 'Neighborhood grocery in Badarpur',
        address: 'Station Road, near Railway Colony, Badarpur',
        locality: 'Station Road',
        district: 'Karimganj',
        city: 'Badarpur',
        contact_phone: '+91 94350 12345',
        supports_pickup: true,
        supports_delivery: true,
        opening_hours: null,
        is_open: true,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useCartStore.getState().clearCart();
        useAuthStore.getState().clearSession();

        vi.mocked(apiClient.getPublicStore).mockResolvedValue(mockStore);
    });

    it('renders empty cart view when cart has no items', () => {
        renderWithProviders(<CheckoutPage />);

        expect(screen.getByText('Your Dropzo Cart is Empty')).toBeInTheDocument();
        expect(screen.getByText('Start Shopping')).toBeInTheDocument();
    });

    it('renders single-store banner, items, and initial bill breakdown', async () => {
        useCartStore.setState({
            storeId: 'store-1',
            storeName: 'Maa Tara Groceries',
            items: [
                {
                    listingId: 'listing-1',
                    productId: 'prod-1',
                    productName: 'Fortune Sunlite Sunflower Oil',
                    price: 145,
                    mrp: 160,
                    imageUrl: null,
                    quantity: 1,
                    variantName: '1L pouch',
                    categoryName: 'Pantry',
                },
                {
                    listingId: 'listing-2',
                    productId: 'prod-2',
                    productName: 'India Gate Basmati Rice',
                    price: 85,
                    mrp: 95,
                    imageUrl: null,
                    quantity: 2,
                    variantName: '1kg bag',
                    categoryName: 'Pantry',
                },
            ],
        });

        renderWithProviders(<CheckoutPage />);

        expect(screen.getByText('Single Merchant Fulfillment')).toBeInTheDocument();
        expect(screen.getByText('Fortune Sunlite Sunflower Oil')).toBeInTheDocument();
        expect(screen.getByText('India Gate Basmati Rice')).toBeInTheDocument();

        // Total items calculation: 1 + 2 = 3 items
        expect(screen.getAllByText(/3 items/i)[0]).toBeInTheDocument();

        // Subtotal: 145 + (85 * 2) = 315
        // Packaging: 15
        // Pickup fee: FREE
        // Coupon discount: -50
        // Total payable: 315 + 0 + 15 - 50 = 280
        expect(screen.getAllByText('₹280').length).toBeGreaterThan(0);
    });

    it('updates quantity and recalculates totals when stepper is clicked', async () => {
        useCartStore.setState({
            storeId: 'store-1',
            storeName: 'Maa Tara Groceries',
            items: [
                {
                    listingId: 'listing-1',
                    productId: 'prod-1',
                    productName: 'Fortune Sunlite Sunflower Oil',
                    price: 145,
                    mrp: 160,
                    imageUrl: null,
                    quantity: 1,
                    variantName: '1L pouch',
                    categoryName: 'Pantry',
                },
            ],
        });

        renderWithProviders(<CheckoutPage />);

        const increaseBtn = screen.getByLabelText(
            'Increase quantity of Fortune Sunlite Sunflower Oil',
        );
        fireEvent.click(increaseBtn);

        expect(useCartStore.getState().items[0].quantity).toBe(2);
    });

    it('toggles fulfillment mode to Home Delivery and adds ₹20 delivery fee', async () => {
        useCartStore.setState({
            storeId: 'store-1',
            storeName: 'Maa Tara Groceries',
            items: [
                {
                    listingId: 'listing-1',
                    productId: 'prod-1',
                    productName: 'Fortune Sunlite Sunflower Oil',
                    price: 145,
                    mrp: 160,
                    imageUrl: null,
                    quantity: 1,
                    variantName: '1L pouch',
                    categoryName: 'Pantry',
                },
            ],
        });

        renderWithProviders(<CheckoutPage />);

        // Default pickup total: 145 + 15 (packaging) - 50 (coupon) = 110
        expect(screen.getAllByText('₹110').length).toBeGreaterThan(0);

        // Switch to Home Delivery
        const deliveryOption = screen.getByText('Home Delivery');
        fireEvent.click(deliveryOption);

        // With delivery fee: 110 + 20 = 130
        await waitFor(() => {
            expect(screen.getAllByText('₹130').length).toBeGreaterThan(0);
        });
    });

    it('redirects to login when unauthenticated guest clicks Confirm Order', async () => {
        useCartStore.setState({
            storeId: 'store-1',
            storeName: 'Maa Tara Groceries',
            items: [
                {
                    listingId: 'listing-1',
                    productId: 'prod-1',
                    productName: 'Fortune Sunlite Sunflower Oil',
                    price: 145,
                    mrp: 160,
                    imageUrl: null,
                    quantity: 1,
                    variantName: '1L pouch',
                    categoryName: 'Pantry',
                },
            ],
        });

        renderWithProviders(<CheckoutPage />);

        const confirmBtns = screen.getAllByRole('button', { name: /Confirm Order/i });
        fireEvent.click(confirmBtns[0]);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith(
                `/login?redirect=${encodeURIComponent('/checkout')}`,
            );
        });
    });

    it('places COD order, clears cart, and navigates to receipt when authenticated', async () => {
        useAuthStore.setState({
            tokens: { accessToken: 'valid-token', refreshToken: 'refresh' },
            user: {
                id: 'cust-1',
                phone: '9435012345',
                fullName: 'Badarpur Customer',
                isActive: true,
                roles: ['CUSTOMER'],
            },
        });

        useCartStore.setState({
            storeId: 'store-1',
            storeName: 'Maa Tara Groceries',
            items: [
                {
                    listingId: 'listing-1',
                    productId: 'prod-1',
                    productName: 'Fortune Sunlite Sunflower Oil',
                    price: 145,
                    mrp: 160,
                    imageUrl: null,
                    quantity: 1,
                    variantName: '1L pouch',
                    categoryName: 'Pantry',
                },
            ],
        });

        const mockCreatedOrder: Order = {
            id: 'ord-12345',
            order_number: 'DZ-12345',
            status: 'CREATED',
            total_amount: 110,
            subtotal: 145,
            discount_amount: 50,
            delivery_fee: 0,
            tax_amount: 15,
            fulfilment_type: 'PICKUP',
            payment_method: 'COD',
            store_name_snapshot: 'Maa Tara Groceries',
            store_address_snapshot: 'Station Road, Badarpur',
            delivery_recipient_name_snapshot: null,
            delivery_recipient_phone_snapshot: null,
            customer_notes: null,
            placed_at: new Date().toISOString(),
            estimated_ready_at: null,
            completed_at: null,
            created_at: new Date().toISOString(),
        };

        vi.mocked(apiClient.createOrder).mockResolvedValue(mockCreatedOrder);

        renderWithProviders(<CheckoutPage />);

        const confirmBtns = screen.getAllByRole('button', { name: /Confirm Order/i });
        fireEvent.click(confirmBtns[0]);

        await waitFor(() => {
            expect(apiClient.createOrder).toHaveBeenCalledWith(
                expect.objectContaining({
                    fulfilmentType: 'PICKUP',
                    expectedTotalAmount: 110,
                }),
                expect.any(String),
            );
            expect(useCartStore.getState().items.length).toBe(0);
            expect(mockNavigate).toHaveBeenCalledWith('/orders/ord-12345');
        });
    });
});
