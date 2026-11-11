# Implementation Plan: BC-014 — Customer Storefront & Product Catalogue Screen

**Date:** 2026-11-12  
**Status:** Proposed (Awaiting Owner Approval at GATE 2)  
**Spike Reference:** [`docs/06-delivery/spikes/2026-11-12-bc014-customer-storefront-catalogue-spike.md`](../spikes/2026-11-12-bc014-customer-storefront-catalogue-spike.md)  
**Task ID:** BC-014  
**Target Route:** `/stores/:storeId` (`apps/web/src/routes/customer/StorefrontPage.tsx`)  
**Stitch References:**

- Mobile Screen #11: `2cb488d52d424bdbbcdfe08dc04eeadb` (`audit/stitch-audit/html/2cb488d52d424bdbbcdfe08dc04eeadb.html`)
- Desktop Screen #33: `b283620466664737aa9f1405ae410d14` (`audit/stitch-audit/html/b283620466664737aa9f1405ae410d14.html`)

---

## 1. Scope

### In Scope:

- **Client-Side Cart Store (`apps/web/src/store/useCartStore.ts`)**:
    - Persistent cart state using Zustand `persist` with `localStorage`.
    - Single-store cart scoping: items are bound to a single `storeId` and `storeName`.
    - Adding an item from a different store flags a conflict to prompt the user (Option A approved in Spike).
    - Actions: `addItem`, `updateQuantity`, `removeItem`, `clearCart`, `replaceCart`.
    - Selectors/getters: `totalItems`, `subtotal`, `getItemQuantity(listingId)`.
- **Storefront & Catalogue Screen (`apps/web/src/routes/customer/StorefrontPage.tsx`)**:
    - 1:1 responsive Stitch implementation matching Screen #11 (Mobile) & Screen #33 (Desktop).
    - Built with `styled-components` using Dropzo tokens per ADR-0003.
    - Sticky headers, breadcrumbs, Badarpur store hero card with verified partner badge, rating, hours, and fulfillment toggle.
    - Store Aisles / category rail with active filter and product counts.
    - Product catalog grid (2-column mobile, 3-column desktop) with variant tags, stock badges, images, pricing, and interactive "+ ADD" / Quantity Stepper buttons.
    - Floating Cart Preview Dock (Mobile bottom strip, Desktop bottom-right dock) showing item count, total price, and "View Cart & Checkout" CTA.
    - Cross-store replacement modal with "Cancel" and "Start Fresh Cart".
    - Curated Badarpur fallback products if store has 0 products or API is offline.
- **Routing & App Wiring**:
    - Update `apps/web/src/App.tsx` route `/stores/:storeId` to mount `<StorefrontPage />`.
- **Unit & Integration Tests**:
    - `apps/web/src/store/useCartStore.test.ts` (cart store behavior, persistence, collision detection).
    - `apps/web/src/routes/customer/StorefrontPage.test.tsx` (rendering, category switching, adding items, stepper, floating dock, replacement modal).

### Explicitly Out of Scope:

- Backend database schema changes (all tables and endpoints already exist in BC-004 and BC-012).
- Server-side authenticated cart syncing (BC-015 will wire `POST /api/v1/customers/me/cart/items` and checkout flow).

---

## 2. Files & Modules Affected

### Create:

- `apps/web/src/store/useCartStore.ts`
- `apps/web/src/store/useCartStore.test.ts`
- `apps/web/src/routes/customer/StorefrontPage.tsx`
- `apps/web/src/routes/customer/StorefrontPage.test.tsx`

### Modify:

- `apps/web/src/App.tsx` (mount `StorefrontPage` at `/stores/:storeId`)
- `apps/web/src/routes/HomePage.tsx` (ensure links to `/stores/:storeId` pass correct route parameters)
- `docs/04-design/UI-SCREEN-COVERAGE.md` (mark Screen #11 and Screen #33 as Migrated)
- `docs/06-delivery/TASK-TRACKER.md` (update BC-014 entry)
- `docs/06-delivery/PROGRESS.md` (record BC-014 completion)

### Delete:

- `apps/web/src/routes/customer/StorePlaceholderPage.tsx` (replaced by `StorefrontPage.tsx`)

---

## 3. Step-by-Step Implementation Tasks

### Task 1: Client-Side Cart Store (`useCartStore`) with TDD

1. Write failing tests in `apps/web/src/store/useCartStore.test.ts`:
    - Adding item to an empty cart sets `storeId`, `storeName`, and `items`.
    - Adding same item increments quantity.
    - Updating quantity to 0 removes the item.
    - Adding item from a **different store** returns `{ conflict: true, existingStoreName: '...' }` without corrupting state.
    - Calling `replaceCart` wipes existing store items and sets the new store and item.
    - Calculating `totalItems` and `subtotal`.
2. Implement `apps/web/src/store/useCartStore.ts`:
    - Typed interface `CartItem`:
        ```ts
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
        ```
    - Zustand store with `persist(..., { name: 'dropzo-cart' })`.
3. Verify test pass: `npm run test -w @dropzo/web -- src/store/useCartStore.test.ts`.

### Task 2: 1:1 Stitch Storefront UI Component (`StorefrontPage.tsx`)

1. Implement `apps/web/src/routes/customer/StorefrontPage.tsx` in `styled-components`:
    - **Responsive Breakpoints**: Mobile (`< 1024px`) and Desktop (`${media.desktop}`).
    - **Header & Navigation**:
        - Mobile: Status bar emulation, sticky app bar with back arrow, store title, Station Road subtitle, search/share/favorite buttons.
        - Desktop: Sticky top header with Dropzo logo, location pill, in-store search (`⌘K`), navigation links, cart pill, user avatar.
    - **Breadcrumb & Ticker**: Badarpur Central Hub / Kirana Stores / Store Name, FSSAI Lic: `20324001004128`, live inventory sync indicator.
    - **Hero Card**:
        - Thumbnail image with shadow and border.
        - Store title with Verified Partner badge (`#006E2D` / `#7CF994`).
        - Address (`Station Road Market, Badarpur, Karimganj, Assam`).
        - Rating pill: `★ 4.8 (180+ reviews)`.
        - Live status: `● Open Now • Closes 9:30 PM`, `12 mins avg. prep`.
        - Fulfillment switcher cards: Store Pickup (`FREE • Ready in 10m`) vs Local Delivery (`₹20 • Within 25 mins`).
        - Trust badges bar (Packaged fresh daily, Zero markup on MRP, Instant replacement, Badarpur Kirana trust).
    - **Category Aisle Navigation**:
        - Mobile: Horizontal scrollable pills with icons and counts.
        - Desktop: Left sticky sidebar (`Store Aisles`, counts, active pill, quick filters `Assam Local`, `100% Vegetarian`, `Super Savers`, Call Store card).
    - **Product Catalog Grid**:
        - Bento promotional offer banner.
        - Sorter dropdown (Relevance, Price Low-High, Price High-Low).
        - Product cards (2 columns mobile, 3 columns desktop):
            - Aspect-square image frame with hover scale.
            - Variant tag (`1 L`, `1 kg`), Stock badge (`Stocked`, `In Stock`, `BEST SALE`).
            - Product title, description, price, MRP line-through, savings pill.
            - "+ ADD" pill button (when qty = 0) vs Quantity Stepper `[- count +]` (when qty > 0).
    - **Floating Cart Preview Dock**:
        - Mobile: Bottom floating strip (`fixed bottom-20`).
        - Desktop: Fixed bottom-right dock (`fixed bottom-6 right-6`).
        - Subtotal, items count, and "View Cart & Checkout" button linking to `/login?redirect=/checkout` (or `/cart`).
    - **Cross-Store Cart Modal**:
        - Confirmation modal when `useCartStore` reports a store conflict.
    - **Fallback Products**:
        - Curated Badarpur pantry items (Fortune Sunflower Oil, Tata Salt, India Gate Basmati Rice, Amul Butter, Maggi Noodles, Assam Tea) displayed seamlessly when store catalogue is loading or empty.

### Task 3: Route Wiring & Clean Up

1. Update `apps/web/src/App.tsx`:
    - Replace `<StorePlaceholderPage />` with `<StorefrontPage />`.
2. Remove `apps/web/src/routes/customer/StorePlaceholderPage.tsx`.

### Task 4: Comprehensive Vitest Suite (`StorefrontPage.test.tsx`)

1. Create `apps/web/src/routes/customer/StorefrontPage.test.tsx` testing:
    - Store details rendering (name, address, rating, verified badge).
    - Catalogue products rendering with prices and add buttons.
    - Category filtering switching product list.
    - In-store search filtering products by keyword.
    - Adding an item updates the floating cart dock.
    - Stepper increments and decrements quantity.
    - Cross-store conflict displays the replacement modal.
    - Confirming modal replaces the cart.
2. Run tests and ensure 100% pass.

### Task 5: Mandatory Repository Verification & Documentation Sync

1. Run full web verification suite:
    - `npm run test -w @dropzo/web -- --run`
    - `npm run typecheck -w @dropzo/web`
    - `npm run lint -w @dropzo/web`
    - `npm run build -w @dropzo/web`
    - `npx prettier --check "apps/web/src/**/*.{ts,tsx}"`
2. Run backend test suite:
    - `npm run test -w @dropzo/api`
3. Update documentation:
    - `docs/04-design/UI-SCREEN-COVERAGE.md`: mark Screen #11 and Screen #33 as Migrated.
    - `docs/06-delivery/TASK-TRACKER.md` & `PROGRESS.md`: record BC-014 completion.

---

## 4. Risks & Mitigations

| Risk                                           | Mitigation                                                                                     |
| :--------------------------------------------- | :--------------------------------------------------------------------------------------------- |
| **Cross-store cart collision**                 | Cart store rejects silent merge; presents explicit confirmation dialog per Option A.           |
| **Slow or empty backend store inventory**      | Graceful fallback products for Badarpur kiranas ensure UI is never blank.                      |
| **Jsdom media query hiding elements in tests** | Use accessible test IDs and aria attributes accessible across both desktop and mobile layouts. |
| **Vite browser module caching**                | Hard refresh instructions provided to user upon completion.                                    |

---

## 5. Database Changes

**None required.** All 41 tables and public API endpoints are live and verified.

---

## 6. Test Plan

- **Cart Store**: 6 unit tests covering add, update, remove, clear, single-store collision, and subtotal calculation.
- **Storefront Page**: 6 integration tests covering store header rendering, product display, category filtering, search, "+ ADD" interaction, quantity stepper sync, and floating cart dock.
- **Total Frontend Test Count**: Will increase from 39 tests to ~50+ tests passing.

---

## 7. Documentation Synchronization Plan

1. [`docs/04-design/UI-SCREEN-COVERAGE.md`](file:///C:/Users/Siddiq/Documents/project/New%20folder/docs/04-design/UI-SCREEN-COVERAGE.md): Update rows for Screen #11 (`2cb488d52d424bdbbcdfe08dc04eeadb`) and Screen #33 (`b283620466664737aa9f1405ae410d14`) to **Migrated**.
2. [`docs/06-delivery/TASK-TRACKER.md`](file:///C:/Users/Siddiq/Documents/project/New%20folder/docs/06-delivery/TASK-TRACKER.md): Update BC-014 status to **Done**.
3. [`docs/06-delivery/PROGRESS.md`](file:///C:/Users/Siddiq/Documents/project/New%20folder/docs/06-delivery/PROGRESS.md): Record task summary, test metrics, and verification outputs.
