import { beforeEach, describe, expect, it } from 'vitest';
import { useCartStore } from './useCartStore';

const mockStoreA = { id: 'store-a', name: 'Maa Tara Groceries' };
const mockStoreB = { id: 'store-b', name: 'Bhavani Kirana' };

const item1 = {
    listingId: 'listing-1',
    productId: 'prod-1',
    productName: 'Fortune Sunlite Sunflower Oil',
    price: 145,
    mrp: 160,
    imageUrl: 'https://example.com/oil.jpg',
    variantName: '1 L',
    categoryName: 'Edible Oils',
};

const item2 = {
    listingId: 'listing-2',
    productId: 'prod-2',
    productName: 'Tata Salt',
    price: 28,
    mrp: 28,
    imageUrl: 'https://example.com/salt.jpg',
    variantName: '1 kg',
    categoryName: 'Pantry Essentials',
};

describe('useCartStore', () => {
    beforeEach(() => {
        useCartStore.getState().clearCart();
    });

    it('initializes with an empty cart', () => {
        const state = useCartStore.getState();
        expect(state.storeId).toBeNull();
        expect(state.storeName).toBeNull();
        expect(state.items).toEqual([]);
        expect(state.totalItems()).toBe(0);
        expect(state.subtotal()).toBe(0);
    });

    it('adds an item to an empty cart and tracks store metadata', () => {
        const result = useCartStore.getState().addItem(mockStoreA, item1, 1);
        expect(result.success).toBe(true);
        expect(result.conflict).toBeUndefined();

        const state = useCartStore.getState();
        expect(state.storeId).toBe(mockStoreA.id);
        expect(state.storeName).toBe(mockStoreA.name);
        expect(state.items).toHaveLength(1);
        expect(state.items[0].listingId).toBe('listing-1');
        expect(state.items[0].quantity).toBe(1);
        expect(state.totalItems()).toBe(1);
        expect(state.subtotal()).toBe(145);
    });

    it('increments quantity when adding an existing item', () => {
        useCartStore.getState().addItem(mockStoreA, item1, 1);
        useCartStore.getState().addItem(mockStoreA, item1, 2);

        const state = useCartStore.getState();
        expect(state.items).toHaveLength(1);
        expect(state.items[0].quantity).toBe(3);
        expect(state.totalItems()).toBe(3);
        expect(state.subtotal()).toBe(145 * 3);
    });

    it('updates quantity directly and removes item when quantity reaches 0', () => {
        useCartStore.getState().addItem(mockStoreA, item1, 2);
        useCartStore.getState().updateQuantity('listing-1', 1);

        expect(useCartStore.getState().items[0].quantity).toBe(1);
        expect(useCartStore.getState().totalItems()).toBe(1);

        useCartStore.getState().updateQuantity('listing-1', 0);
        expect(useCartStore.getState().items).toHaveLength(0);
        expect(useCartStore.getState().totalItems()).toBe(0);
        expect(useCartStore.getState().storeId).toBeNull();
    });

    it('detects cross-store conflict and does not mutate state', () => {
        useCartStore.getState().addItem(mockStoreA, item1, 1);

        // Attempt to add item from Store B
        const result = useCartStore.getState().addItem(mockStoreB, item2, 1);
        expect(result.success).toBe(false);
        expect(result.conflict).toEqual({
            existingStoreId: mockStoreA.id,
            existingStoreName: mockStoreA.name,
        });

        // Previous cart should remain intact
        const state = useCartStore.getState();
        expect(state.storeId).toBe(mockStoreA.id);
        expect(state.items).toHaveLength(1);
        expect(state.items[0].listingId).toBe('listing-1');
    });

    it('replaces cart when replaceCart is called', () => {
        useCartStore.getState().addItem(mockStoreA, item1, 1);
        useCartStore.getState().replaceCart(mockStoreB, item2, 2);

        const state = useCartStore.getState();
        expect(state.storeId).toBe(mockStoreB.id);
        expect(state.storeName).toBe(mockStoreB.name);
        expect(state.items).toHaveLength(1);
        expect(state.items[0].listingId).toBe('listing-2');
        expect(state.items[0].quantity).toBe(2);
        expect(state.totalItems()).toBe(2);
        expect(state.subtotal()).toBe(28 * 2);
    });

    it('returns 0 for getItemQuantity when item not in cart', () => {
        expect(useCartStore.getState().getItemQuantity('random-id')).toBe(0);
        useCartStore.getState().addItem(mockStoreA, item1, 3);
        expect(useCartStore.getState().getItemQuantity('listing-1')).toBe(3);
    });
});
