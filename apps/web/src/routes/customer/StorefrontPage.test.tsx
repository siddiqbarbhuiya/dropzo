import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StorefrontPage } from './StorefrontPage';
import { withTheme } from '../../test/renderWithProviders';
import { useCartStore } from '../../store/useCartStore';

const mockStore = {
    id: 'store-1',
    name: 'Maa Tara Groceries',
    description: 'Badarpur Station Road Daily Kirana',
    address: 'Stall No. 4, Station Road Market',
    locality: 'Station Road',
    district: 'Karimganj',
    city: 'Badarpur',
    contact_phone: '+919435100000',
    supports_pickup: true,
    supports_delivery: true,
    opening_hours: null,
    is_open: true,
};

const mockListings = [
    {
        id: 'prod-listing-1',
        store_id: 'store-1',
        product_id: 'prod-1',
        product_name: 'Fortune Sunlite Refined Sunflower Oil',
        product_description: 'Refined oil fortified with Vitamin A & D',
        category_id: 'cat-oils',
        category_name: 'Cooking Oils & Ghee',
        variant_id: 'var-1',
        variant_name: '1 L Pouch',
        sku: 'OIL-1L',
        pack_size: 1,
        unit: 'L',
        selling_price: 145,
        mrp: 170,
        in_stock: true,
        low_stock: false,
    },
    {
        id: 'prod-listing-2',
        store_id: 'store-1',
        product_id: 'prod-2',
        product_name: 'Tata Salt Vacuum Evaporated',
        product_description: 'Iodized cooking salt • Desh Ka Namak',
        category_id: 'cat-pantry',
        category_name: 'Pantry Essentials',
        variant_id: 'var-2',
        variant_name: '1 kg',
        sku: 'SALT-1K',
        pack_size: 1,
        unit: 'kg',
        selling_price: 28,
        mrp: 28,
        in_stock: true,
        low_stock: false,
    },
];

vi.mock('../../lib/apiClient', () => ({
    apiClient: {
        getPublicStore: vi.fn(() => Promise.resolve(mockStore)),
        getStoreCatalogue: vi.fn(() =>
            Promise.resolve({
                data: mockListings,
                total: 2,
                page: 1,
                limit: 10,
                totalPages: 1,
            }),
        ),
    },
}));

function renderStorefront(initialPath = '/stores/store-1') {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    return render(
        withTheme(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={[initialPath]}>
                    <Routes>
                        <Route path="/stores/:storeId" element={<StorefrontPage />} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>,
        ),
    );
}

describe('StorefrontPage', () => {
    beforeEach(() => {
        useCartStore.getState().clearCart();
        vi.clearAllMocks();
    });

    it('renders store details including name, address, verified badge, and ratings', async () => {
        renderStorefront();

        await waitFor(() => {
            expect(screen.getAllByText('Maa Tara Groceries').length).toBeGreaterThan(0);
        });

        expect(screen.getAllByText(/VERIFIED PARTNER/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Stall No\. 4, Station Road Market/i)).toBeInTheDocument();
        expect(screen.getAllByText('4.8').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Open Now/i).length).toBeGreaterThan(0);
    });

    it('renders products from store catalogue with selling prices and ADD buttons', async () => {
        renderStorefront();

        await waitFor(() => {
            expect(screen.getByText('Fortune Sunlite Refined Sunflower Oil')).toBeInTheDocument();
        });

        expect(screen.getByText('Tata Salt Vacuum Evaporated')).toBeInTheDocument();
        expect(screen.getByText('₹145')).toBeInTheDocument();
        expect(screen.getByText('₹28')).toBeInTheDocument();

        const addButtons = screen.getAllByRole('button', { name: /ADD/i });
        expect(addButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('handles adding an item to the cart and syncing with quantity stepper', async () => {
        renderStorefront();

        await waitFor(() => {
            expect(screen.getByText('Fortune Sunlite Refined Sunflower Oil')).toBeInTheDocument();
        });

        const addButtons = screen.getAllByRole('button', { name: /ADD/i });
        fireEvent.click(addButtons[0]);

        // Should switch to stepper with 1 and show 1 in cart badge
        expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);

        // Floating Cart Dock should appear with total ₹145
        expect(screen.getAllByText('₹145').length).toBeGreaterThan(0);

        // Click '+' button on stepper
        const increaseBtn = screen.getByRole('button', { name: /Increase quantity/i });
        fireEvent.click(increaseBtn);

        expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
        expect(useCartStore.getState().totalItems()).toBe(2);
        expect(useCartStore.getState().subtotal()).toBe(145 * 2);
    });

    it('filters products using in-store search', async () => {
        renderStorefront();

        await waitFor(() => {
            expect(screen.getByText('Fortune Sunlite Refined Sunflower Oil')).toBeInTheDocument();
        });

        const searchInputs = screen.getAllByPlaceholderText(/Search in Maa Tara Groceries/i);
        fireEvent.change(searchInputs[0], { target: { value: 'Tata Salt' } });

        expect(screen.getByText('Tata Salt Vacuum Evaporated')).toBeInTheDocument();
        expect(screen.queryByText('Fortune Sunlite Refined Sunflower Oil')).not.toBeInTheDocument();
    });

    it('filters products by selecting category aisle', async () => {
        renderStorefront();

        await waitFor(() => {
            expect(screen.getByText('Fortune Sunlite Refined Sunflower Oil')).toBeInTheDocument();
        });

        // Click on Cooking Oils aisle button
        const oilButtons = screen.getAllByRole('button', { name: /Cooking Oils & Ghee/i });
        fireEvent.click(oilButtons[0]);

        expect(screen.getByText('Fortune Sunlite Refined Sunflower Oil')).toBeInTheDocument();
        expect(screen.queryByText('Tata Salt Vacuum Evaporated')).not.toBeInTheDocument();
    });

    it('prompts confirmation modal on cross-store cart conflict and replaces on confirm', async () => {
        // Pre-populate cart with an item from Store B
        useCartStore.getState().addItem(
            { id: 'store-other', name: 'Other Kirana Store' },
            {
                listingId: 'other-listing',
                productId: 'other-prod',
                productName: 'Other Item',
                price: 100,
                mrp: 100,
                imageUrl: null,
                variantName: '1 pc',
                categoryName: 'General',
            },
            1,
        );

        renderStorefront();

        await waitFor(() => {
            expect(screen.getByText('Fortune Sunlite Refined Sunflower Oil')).toBeInTheDocument();
        });

        // Click ADD on Store A's item
        const addButtons = screen.getAllByRole('button', { name: /ADD/i });
        fireEvent.click(addButtons[0]);

        // Confirmation modal should open
        expect(screen.getByText('Replace Cart Items?')).toBeInTheDocument();
        expect(screen.getByText(/Other Kirana Store/i)).toBeInTheDocument();

        // Click Start Fresh Cart
        const confirmBtn = screen.getByRole('button', { name: /Start Fresh Cart/i });
        fireEvent.click(confirmBtn);

        // Cart should now be scoped to Maa Tara Groceries with 1 item
        expect(useCartStore.getState().storeId).toBe('store-1');
        expect(useCartStore.getState().items).toHaveLength(1);
        expect(useCartStore.getState().items[0].productName).toBe(
            'Fortune Sunlite Refined Sunflower Oil',
        );
    });
});
