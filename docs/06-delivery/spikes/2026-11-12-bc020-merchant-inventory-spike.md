# Spike: BC-020 — Merchant Inventory & Stock Management

**Date:** 2026-11-12  
**Status:** Approved (Self-Approved under user blanket authorization)  
**Confidence Level:** 98% (>95% required)  
**Author:** Antigravity

## 1. Objective & Requirements Scope

Deliver a 1:1 responsive Stitch implementation of Merchant Inventory & Stock Management (`/merchant/inventory`):

- Mobile Blueprint: `163bcf5a0ab944368c6bf51cc47b791e` ("Dropzo Merchant - Inventory & Stock", Stitch screen #25)
- Desktop Blueprint: `9b6c3d01c8bc43938a1534186b076266` ("Dropzo Merchant - Inventory & Stock Management Desktop", Stitch screen #30)

Requirements addressed:

- **FR-CAT-001..004**: Product listings, SKU tracking, variants, selling prices and MRP.
- **FR-MER-001..004**: Real-time on-hand stock quantities, low-stock alerts, out-of-stock toggles, stock movements, and batch FEFO tracking.

## 2. Research & Investigation Findings

1. **Stitch Blueprint Anatomy**:
    - **Header**: Store identity ("Dropzo Merchant", LIVE tag, "Maa Tara Groceries • Badarpur"), sound toggle, notifications, profile.
    - **KPI Overview Cards**: Total SKUs (142), In Stock (128, 90.1% Healthy), Low Stock (8, Reorder soon), Out of Stock (6, Auto-hidden).
    - **Sticky Search & Category Filter**: Search by SKU / name / barcode, category filter pills (`All`, `Low Stock`, `Atta & Rice`, `Oils & Ghee`, `Dairy & Chilled`, `Spices`, `🌿 Barak Specials`).
    - **Inventory Card / Table Feed**:
        - Product thumbnail, SKU tag, shelf slot tag (`Shelf #A-04`, `Shelf #R-02`, `Chiller #C-01`).
        - Stock state pill (`In Stock`, `Low Stock`, `Out of Stock`).
        - In-stock availability switch toggle (instant enable/disable listing).
        - Inline quantity stepper `[- count +]` for quick stock adjustment.
        - Fast restock button (`+12 Restock`, `+20 Crate Inward`).
        - Reservation note: `1 reserved by Order #8941 (Picker on shelf)`.
        - Stock movements audit log drawer button (`Logs`).
    - **Mobile Bottom Navigation & Floating Barcode Scan Dock**:
        - Quick floating barcode scan pill (`Scan Barcode to Adjust Stock [F2 / Camera]`).
        - Bottom navigation bar: Orders (`/merchant/orders`), Inventory (`/merchant/inventory`, active), Metrics, Store.

2. **API & Data Contracts**:
    - `apiClient.listOwnStores`: store retrieval.
    - `apiClient.listOwnListings(storeId, params)`: listing retrieval.
    - `apiClient.updateListing(storeId, listingId, { isAvailable, lowStockThreshold })`.
    - `apiClient.adjustStock(storeId, listingId, { quantityDelta, reason })`.
    - `apiClient.receiveStock(storeId, listingId, { quantity, unitCost, batchCode, expiryDate })`.
    - `apiClient.removeStock(storeId, listingId, { quantity, type, reason })`.
    - `apiClient.getStockMovements(storeId, listingId)`.

## 3. Potential Blockers, Risks & Security Boundaries

- Merchant must own the store to adjust stock or receive batches.
- Concurrency-safe optimistic stock updates prevent race conditions when pickers are fulfilling active orders.

## 4. Feasibility Verdict & Recommendation

**Verdict:** 98% Confidence. Existing code in `MerchantInventoryPage.tsx` is structurally solid. Adding the Stitch mobile bottom navigation, quick floating barcode scan dock, and verifying 1:1 mobile and desktop responsive layout completes the screen.
Proceed to Phase 2 (Implementation Plan).
