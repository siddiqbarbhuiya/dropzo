# Implementation Plan: BC-014-EXT — Reusable WoltModalSheet Component & Storefront Floating Cart Integration

**Date:** 2026-11-12  
**Status:** Approved (Pre-authorized by product owner)  
**Author:** Antigravity (Senior Full-Stack Implementation Engineer)

---

## Scope

- **In Scope**:
    1. Build `WoltModalSheet` reusable custom UI component in `apps/web/src/components/ui/WoltModalSheet.tsx` with top drag pill, centrally split circular close button, smooth slide-up animation, backdrop dismiss/blur, dynamic maxHeight support, scrollable body, sticky bottom action bar, and iOS home indicator.
    2. Write unit tests for `WoltModalSheet` in `apps/web/src/components/ui/WoltModalSheet.test.tsx`.
    3. Export `WoltModalSheet` from `apps/web/src/components/ui/index.ts`.
    4. Wire `WoltModalSheet` into `apps/web/src/routes/customer/StorefrontPage.tsx` so clicking the floating cart dock or its list preview triggers the interactive Cart Summary bottom sheet with live quantity steppers, itemized rows, bill breakdown, and "Proceed to Checkout" button.
    5. Add test coverage in `apps/web/src/routes/customer/StorefrontPage.test.tsx` verifying the sheet opens and cart actions function properly.
    6. Run full verification suite (`test`, `typecheck`, `lint`, `format:check`, `build`).
    7. Synchronize design system docs, screen coverage, and progress tracking.

- **Out of Scope**:
    - Rewriting existing checkout or payment gateways.
    - Adding multi-store cart mixing (violates Dropzo single-store fulfillment policy).

---

## Files / Modules Affected

- `apps/web/src/components/ui/WoltModalSheet.tsx` (Create)
- `apps/web/src/components/ui/WoltModalSheet.test.tsx` (Create)
- `apps/web/src/components/ui/index.ts` (Modify)
- `apps/web/src/routes/customer/StorefrontPage.tsx` (Modify)
- `apps/web/src/routes/customer/StorefrontPage.test.tsx` (Modify)
- `docs/04-design/COMPONENT-LIBRARY.md` (Modify)
- `docs/04-design/UI-SCREEN-COVERAGE.md` (Modify)
- `docs/06-delivery/TASK-TRACKER.md` (Modify)
- `docs/06-delivery/PROGRESS.md` (Modify)

---

## Steps

### Step 1: Create `WoltModalSheet` Component

- Build `apps/web/src/components/ui/WoltModalSheet.tsx`:
    - `WoltModalSheetProps`:
        - `isOpen`: boolean
        - `onClose`: () => void
        - `title`: React.ReactNode
        - `subtitle`?: React.ReactNode
        - `badge`?: React.ReactNode
        - `maxHeight`?: string
        - `enableDrag`?: boolean
        - `stickyActionBar`?: React.ReactNode
        - `children`: React.ReactNode
        - `showCloseButton`?: boolean
        - `ariaLabel`?: string
    - Features:
        - Fixed overlay container with `z-index: 50`.
        - Backdrop with `backdrop-filter: blur(4px)`, semi-transparent dark background, and fade animation.
        - Sheet panel with `border-top-left-radius: 32px; border-top-right-radius: 32px;`.
        - Draggable handle pill at top center.
        - Centrally split half-in/half-out circular close button (`position: absolute; top: 0; left: 50%; transform: translate(-50%, -50%);`).
        - Title & subtitle header with badge.
        - Body container with `max-height` and custom hidden scrollbar.
        - Sticky bottom action bar container.
        - iOS home indicator.
        - Body scroll lock during open state.
        - `Escape` key dismiss listener.
- Export `WoltModalSheet` from `apps/web/src/components/ui/index.ts`.

### Step 2: Unit Test `WoltModalSheet`

- Build `apps/web/src/components/ui/WoltModalSheet.test.tsx`:
    - Render when `isOpen=true`, don't render when `isOpen=false`.
    - Render title, subtitle, badge, content, and stickyActionBar.
    - Trigger `onClose` when clicking the top circular close button.
    - Trigger `onClose` when clicking the backdrop overlay.
    - Trigger `onClose` when pressing `Escape`.

### Step 3: Integrate with `StorefrontPage.tsx`

- Add state `isCartSheetOpen` (boolean).
- In the mobile floating cart dock:
    - Add items preview icon (`format_list_bulleted`) and make the cart summary clickable to toggle `setIsCartSheetOpen(true)`.
    - Also provide "View Cart" button that toggles `setIsCartSheetOpen(true)` (or proceeds directly to `/checkout` when already inside the sheet).
- Inside `WoltModalSheet`:
    - Display Cart Header: Store Name, total items badge, fulfillment mode.
    - Display Cart Items: Each cart item with thumbnail/icon, name, pack size, price, and reactive quantity stepper (`updateQuantity`).
    - Display Order Summary: Subtotal, Store Pickup (Free) / Express Delivery (₹20), and Grand Total.
    - Sticky Action Bar: "Proceed to Checkout • ₹{total}" button that navigates to `/checkout` (or `/login?redirect=/checkout`).

### Step 4: Update `StorefrontPage.test.tsx`

- Verify that clicking the cart preview opens the `WoltModalSheet`.
- Verify item list, quantity adjustment, and checkout navigation inside the modal.

### Step 5: Verification Suite

- Execute `npm run test -w @dropzo/web -- --run`.
- Execute `npm run typecheck -w @dropzo/web`.
- Execute `npm run lint -w @dropzo/web`.
- Execute `npm run format:check -w @dropzo/web`.
- Execute `npm run build -w @dropzo/web`.

### Step 6: Documentation & Completion

- Update `COMPONENT-LIBRARY.md` with `WoltModalSheet` documentation.
- Update `UI-SCREEN-COVERAGE.md`.
- Update `TASK-TRACKER.md` and `PROGRESS.md`.
- Commit changes locally to git.
