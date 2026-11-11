import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MerchantInventoryPage } from './MerchantInventoryPage';
import { withTheme } from '../../test/renderWithProviders';

const oilListing = {
    id: 'listing-1',
    store_id: 'store-1',
    variant_id: 'variant-1',
    uses_batch_tracking: false,
    selling_price: '145.00',
    mrp: '150.00',
    is_available: true,
    created_at: new Date().toISOString(),
    variant: {
        id: 'variant-1',
        sku: 'OIL-1L',
        variant_name: '1L Pouch',
        unit: 'pouch',
        pack_size: '1',
        product: { id: 'p1', name: 'Fortune Sunlite Oil', brand: 'Fortune' },
    },
    inventory: {
        id: 'inv-1',
        store_product_id: 'listing-1',
        on_hand_quantity: '20',
        reserved_quantity: '2',
        blocked_quantity: '0',
        low_stock_threshold: '5',
        updated_at: new Date().toISOString(),
    },
};

const lowStockListing = {
    ...oilListing,
    id: 'listing-2',
    variant: {
        ...oilListing.variant,
        id: 'variant-2',
        product: { id: 'p2', name: 'Amul Butter', brand: 'Amul' },
    },
    inventory: { ...oilListing.inventory, on_hand_quantity: '3', low_stock_threshold: '5' },
};

const updateListing = vi.fn();

vi.mock('../../lib/apiClient', () => ({
    apiClient: {
        listOwnStores: () =>
            Promise.resolve({
                data: [{ id: 'store-1', name: 'Maa Tara Groceries', status: 'ACTIVE' }],
                meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
            }),
        listOwnListings: () =>
            Promise.resolve({
                data: [oilListing, lowStockListing],
                meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
            }),
        updateListing: (...args: unknown[]) => updateListing(...args),
    },
}));

function renderPage() {
    const queryClient = new QueryClient();
    return render(
        withTheme(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <MerchantInventoryPage />
                </MemoryRouter>
            </QueryClientProvider>,
        ),
    );
}

describe('MerchantInventoryPage', () => {
    it('lists listings with stock-state badges and accurate stats', async () => {
        renderPage();

        await waitFor(() => expect(screen.getByText('Fortune Sunlite Oil')).toBeInTheDocument(), {
            timeout: 4000,
        });
        expect(screen.getByText('Amul Butter')).toBeInTheDocument();
        // "In stock"/"Low stock" text appears as a stat label, a filter-tab option, and one row
        // badge each (one listing of each state) - 3 occurrences confirms exactly one badge of
        // each kind rendered, not zero and not more.
        expect(screen.getAllByText('In stock')).toHaveLength(3);
        expect(screen.getAllByText('Low stock')).toHaveLength(3);
        expect(screen.getByText('2')).toBeInTheDocument(); // Total listed stat
    });

    it('filters by search term', async () => {
        renderPage();
        await waitFor(() => expect(screen.getByText('Fortune Sunlite Oil')).toBeInTheDocument(), {
            timeout: 4000,
        });

        fireEvent.change(screen.getByLabelText('Search listings'), {
            target: { value: 'butter' },
        });

        expect(screen.queryByText('Fortune Sunlite Oil')).not.toBeInTheDocument();
        expect(screen.getByText('Amul Butter')).toBeInTheDocument();
    });

    it('toggles availability via the real updateListing call', async () => {
        updateListing.mockResolvedValue({ ...oilListing, is_available: false });
        renderPage();
        await waitFor(() => expect(screen.getByText('Fortune Sunlite Oil')).toBeInTheDocument());

        const toggle = screen.getByLabelText('Toggle availability for Fortune Sunlite Oil');
        fireEvent.click(toggle);

        await waitFor(() =>
            expect(updateListing).toHaveBeenCalledWith('store-1', 'listing-1', {
                isAvailable: false,
            }),
        );
    });
});
