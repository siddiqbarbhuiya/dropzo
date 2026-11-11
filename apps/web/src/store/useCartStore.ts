import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
    listingId: string;
    productId: string;
    productName: string;
    price: number;
    mrp: number;
    imageUrl: string | null;
    quantity: number;
    variantName: string | null;
    categoryName: string;
}

export interface AddItemResult {
    success: boolean;
    conflict?: {
        existingStoreId: string;
        existingStoreName: string;
    };
}

export interface CartStoreState {
    storeId: string | null;
    storeName: string | null;
    items: CartItem[];
    // Actions
    addItem: (
        store: { id: string; name: string },
        item: Omit<CartItem, 'quantity'>,
        quantity?: number,
    ) => AddItemResult;
    updateQuantity: (listingId: string, quantity: number) => void;
    removeItem: (listingId: string) => void;
    clearCart: () => void;
    replaceCart: (
        store: { id: string; name: string },
        item: Omit<CartItem, 'quantity'>,
        quantity?: number,
    ) => void;
    getItemQuantity: (listingId: string) => number;
    totalItems: () => number;
    subtotal: () => number;
}

export const useCartStore = create<CartStoreState>()(
    persist(
        (set, get) => ({
            storeId: null,
            storeName: null,
            items: [],

            addItem: (store, item, quantity = 1) => {
                const current = get();

                // If cart is not empty and belongs to a different store, trigger conflict
                if (current.storeId && current.storeId !== store.id && current.items.length > 0) {
                    return {
                        success: false,
                        conflict: {
                            existingStoreId: current.storeId,
                            existingStoreName: current.storeName ?? 'Current Store',
                        },
                    };
                }

                const existingIndex = current.items.findIndex(
                    (i) => i.listingId === item.listingId,
                );
                let newItems: CartItem[];

                if (existingIndex >= 0) {
                    newItems = [...current.items];
                    newItems[existingIndex] = {
                        ...newItems[existingIndex],
                        quantity: newItems[existingIndex].quantity + quantity,
                    };
                } else {
                    newItems = [...current.items, { ...item, quantity }];
                }

                set({
                    storeId: store.id,
                    storeName: store.name,
                    items: newItems,
                });

                return { success: true };
            },

            updateQuantity: (listingId, quantity) => {
                const current = get();

                if (quantity <= 0) {
                    const filtered = current.items.filter((i) => i.listingId !== listingId);
                    set({
                        items: filtered,
                        storeId: filtered.length === 0 ? null : current.storeId,
                        storeName: filtered.length === 0 ? null : current.storeName,
                    });
                    return;
                }

                const updated = current.items.map((i) =>
                    i.listingId === listingId ? { ...i, quantity } : i,
                );

                set({ items: updated });
            },

            removeItem: (listingId) => {
                const current = get();
                const filtered = current.items.filter((i) => i.listingId !== listingId);
                set({
                    items: filtered,
                    storeId: filtered.length === 0 ? null : current.storeId,
                    storeName: filtered.length === 0 ? null : current.storeName,
                });
            },

            clearCart: () => {
                set({
                    storeId: null,
                    storeName: null,
                    items: [],
                });
            },

            replaceCart: (store, item, quantity = 1) => {
                set({
                    storeId: store.id,
                    storeName: store.name,
                    items: [{ ...item, quantity }],
                });
            },

            getItemQuantity: (listingId) => {
                const item = get().items.find((i) => i.listingId === listingId);
                return item ? item.quantity : 0;
            },

            totalItems: () => {
                return get().items.reduce((sum, i) => sum + i.quantity, 0);
            },

            subtotal: () => {
                return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
            },
        }),
        { name: 'dropzo-cart' },
    ),
);
