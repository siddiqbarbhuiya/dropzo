# Implementation Plan: BC-019 — Merchant POS Terminal & Order Processing

**Date:** 2026-11-12  
**Status:** Approved (Self-Approved under user blanket authorization)  
**Target Screens:**

- Stitch Mobile Blueprint: `81cb16257cae4ad5b2d6e513b2ac538f`
- Stitch Desktop Blueprint: `fb2ece82075f4fae9ea701ba62de9e32`

## Scope

- **In Scope**:
    - Full 1:1 responsive Stitch implementation of `MerchantOrdersPage.tsx` (`/merchant/orders`).
    - Top header with store badge, "Accepting Orders" switch toggle, Loud Alert switch, and profile trigger.
    - KPI metric cards: New Orders, Preparing/Packing, Ready at Counter, Today's Gross, Avg Prep Time, On-Time Handoff.
    - Status tabs: `Incoming` (with pulse badge), `Packing Now`, `Ready at Counter`, `Completed`.
    - Order search bar (by order number / customer phone).
    - Rich interactive order cards:
        - Urgent incoming order card with countdown timer, items checklist with pick checkboxes, and Reject/Accept Order actions.
        - Packing order card with progress bar, checklist strikethroughs, and "Mark Ready for Pickup" action.
        - Ready order card with sealed bag slot and "Load to Counter Keypad" action.
    - Desktop right column / Mobile drawer: Counter PIN Validator with full on-screen numeric keypad (`1-9, CLR, 0, ⌫`), 5-attempt security indicator, and "Verify & Release Order" action.
    - Recent Counter Handoffs activity log with time and verified status badges.
    - Mobile bottom navigation bar (Orders, Inventory, Metrics, Store).
    - Vitest automated test suite (`MerchantOrdersPage.test.tsx`).

- **Out of Scope**:
    - Thermal Bluetooth receipt printer physical hardware drivers (handled via browser `window.print`).

## Files Affected

- `apps/web/src/routes/merchant/MerchantOrdersPage.tsx` (Major upgrade to 1:1 Stitch blueprint)
- `apps/web/src/routes/merchant/MerchantOrdersPage.test.tsx` (New comprehensive unit test suite)
- `docs/06-delivery/TASK-TRACKER.md`
- `docs/06-delivery/PROGRESS.md`

## Steps

1. **Step 1: Implement `MerchantOrdersPage.tsx`**:
    - Translate layout from `fb2ece82075f4fae9ea701ba62de9e32.html` and `81cb16257cae4ad5b2d6e513b2ac538f.html` using styled-components and theme tokens.
    - Connect queries: `apiClient.listOwnStores` and `apiClient.listMerchantOrders`.
    - Provide realistic fallbacks for demo/local testing when backend store has no active orders.
    - Implement action mutations: `acceptOrder`, `rejectOrder`, `markOrderReady`, `verifyPickupCode`.
2. **Step 2: Add Automated Tests (`MerchantOrdersPage.test.tsx`)**:
    - Test KPI metrics rendering and store header.
    - Test status tabs filtering.
    - Test order accept & reject interactions.
    - Test on-screen keypad PIN input and verify & release action.
3. **Step 3: Verification**:
    - Run Vitest suite (`npm run test -w @dropzo/web -- MerchantOrdersPage`).
    - Run typecheck (`npm run typecheck -w @dropzo/web`).
    - Run linter (`npm run lint -w @dropzo/web`).
4. **Step 4: Playwright Verification**:
    - Capture screenshots for both mobile (375x812) and desktop (1280x800) at `/merchant/orders`.
5. **Step 5: Git Commit & Docs Sync**:
    - Update `TASK-TRACKER.md` and `PROGRESS.md`.
    - Commit changes to git.
