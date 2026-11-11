# Implementation Plan: BC-020 — Merchant Inventory & Stock Management

**Date:** 2026-11-12  
**Status:** Approved (Self-Approved under user blanket authorization)  
**Target Screens:**

- Stitch Mobile Blueprint: `163bcf5a0ab944368c6bf51cc47b791e` (Stitch screen #25)
- Stitch Desktop Blueprint: `9b6c3d01c8bc43938a1534186b076266` (Stitch screen #30)

## Scope

- **In Scope**:
    - Full 1:1 responsive Stitch alignment of `MerchantInventoryPage.tsx` (`/merchant/inventory`).
    - Mobile bottom navigation bar matching Stitch blueprint: Orders (`/merchant/orders`), Inventory (`/merchant/inventory`), Metrics, Store.
    - Floating Quick Barcode Scanner action bar ("Scan Barcode to Adjust Stock [F2 / Camera]").
    - Bottom scroll clearance (`padding-bottom: 7rem` on mobile) to ensure bottom inventory cards and action controls are completely unobstructed.
    - Verification with unit tests in `MerchantInventoryPage.test.tsx` and full web workspace tests.

- **Out of Scope**:
    - Native hardware camera barcode decoding (simulated via text / scan input modal).

## Files Affected

- `apps/web/src/routes/merchant/MerchantInventoryPage.tsx`
- `apps/web/src/routes/merchant/MerchantInventoryPage.test.tsx`
- `docs/06-delivery/TASK-TRACKER.md`
- `docs/06-delivery/PROGRESS.md`

## Steps

1. **Step 1: Update `MerchantInventoryPage.tsx`**:
    - Add `Link` from `react-router-dom`.
    - Add styled components `FloatingBarcodeDock`, `MobileNav`, `MobileNavItem`.
    - Add floating scan dock and mobile bottom navigation inside `MerchantInventoryPage`.
    - Ensure `PageContainer` has `padding-bottom: 7rem` on mobile and `2rem` on desktop.
2. **Step 2: Add/Expand Automated Tests (`MerchantInventoryPage.test.tsx`)**:
    - Verify listing rendering with stock state badges.
    - Verify search filter.
    - Verify quick barcode scan trigger and bottom navigation.
3. **Step 3: Verification**:
    - Run Vitest suite (`npm run test -w @dropzo/web -- MerchantInventoryPage`).
    - Run typecheck (`npm run typecheck -w @dropzo/web`).
    - Run full workspace tests (`npm run test -w @dropzo/web`).
4. **Step 4: Git Commit & Docs Sync**:
    - Update `TASK-TRACKER.md` and `PROGRESS.md`.
    - Commit changes to git.
