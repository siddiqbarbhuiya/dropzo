# Spike: BC-014-EXT — Reusable WoltModalSheet Component & Storefront Floating Cart Integration

**Date:** 2026-11-12  
**Status:** Approved (Pre-authorized by product owner)  
**Confidence Level:** 99% (>95% required for Phase 2 approval)  
**Author:** Antigravity (Senior Full-Stack Implementation Engineer)

---

## 1. Objective & Requirements Scope

### Problem Statement

On the customer storefront and product catalogue screen (`/stores/:storeId`), customers needed an interactive, elevation tier-2 cart modal preview accessible directly from the bottom floating cart dock. Furthermore, this dynamic sheet follows the modern **Wolt Modal Sheet** pattern, which Dropzo utilizes across multiple use cases (variant selection, pickup OTP verification, and cart summary).

The objective is to:

1. Implement the **`WoltModalSheet`** as a first-class, reusable custom UI component in `apps/web/src/components/ui/WoltModalSheet.tsx` with full design fidelity to the Stitch specifications.
2. Wire `WoltModalSheet` into the floating cart preview dock on the mobile Storefront & Catalogue Screen (`StorefrontPage.tsx`), allowing customers to tap the floating cart dock / items list icon (`format_list_bulleted`) to pop up the interactive Cart Summary bottom sheet with live quantity steppers, bill breakdown, and "Proceed to Checkout" action.

### Reference Stitch Screens

- `91f80188c6864d2ba8cb6dd2e881faee`: **Wolt Modal Sheet Playground & Component Docs - Desktop**
- `cc71d8ecb13141b38c830075af3190bf`: **Dropzo Dynamic Wolt Modal Sheet - Mobile**
- `cf40053070dd440196ba46416ef930c1`: **Wolt Modal Sheet Playground - Mobile**
- `2cb488d52d424bdbbcdfe08dc04eeadb`: **Customer Storefront Catalogue Screen #11** (Floating Cart Dock trigger & Cart preview integration)

---

## 2. Research & Investigation Findings

### Current Codebase & Architecture

- **Component System**: Components reside under `apps/web/src/components/ui/` with clean styled-components implementation, Dropzo theme tokens (`theme.colors`, `theme.typography`), and barrel exports in `apps/web/src/components/ui/index.ts`.
- **Existing Modal**: `apps/web/src/components/ui/Modal.tsx` provides a centered modal dialog. `WoltModalSheet` represents a specialized mobile bottom sheet with:
    - Top Draggable Pill handle (`w-12 h-1.5 bg-gray-300 rounded-full mx-auto`)
    - Centrally split half-in/half-out floating circular close button (`w-11 h-11 rounded-full bg-white shadow-lg border border-gray-200`)
    - Smooth spring slide-up entrance transition (`transform 0.38s cubic-bezier(0.16, 1, 0.3, 1)`)
    - Backdrop tap to dismiss & blur
    - Keyboard `Escape` listener
    - Max height constraint (`maxHeight` prop, default `calc(100vh - 48px)` or `82vh`)
    - Scrollable content container with hidden scrollbar (`no-scrollbar`)
    - Sticky bottom action bar (`stickyActionBar` prop)
    - iOS Home indicator bar (`w-32 h-1 bg-gray-900/80 rounded-full`)
- **Storefront Floating Cart Dock**:
    - Located in `apps/web/src/routes/customer/StorefrontPage.tsx` (`MobileFloatingCart`).
    - Currently renders a floating pill with price and "View Cart" navigation button.
    - In the updated Stitch design #11, tapping the cart bar or its list trigger opens the `WoltModalSheet` displaying the Cart Summary with:
        - Store name & item count badge
        - Itemized row list with interactive `QuantityStepper` (`-` / qty / `+`)
        - Price breakdown (Subtotal, store pickup free / delivery fee, Total)
        - Sticky CTA: "Proceed to Checkout • ₹{total}" linking to `/checkout`.

### Affected Files

- `apps/web/src/components/ui/WoltModalSheet.tsx` (New component)
- `apps/web/src/components/ui/WoltModalSheet.test.tsx` (New unit test suite)
- `apps/web/src/components/ui/index.ts` (Export `WoltModalSheet`)
- `apps/web/src/routes/customer/StorefrontPage.tsx` (Integrate `WoltModalSheet` for cart summary)
- `apps/web/src/routes/customer/StorefrontPage.test.tsx` (Test cart bottom sheet interactions)
- `docs/04-design/COMPONENT-LIBRARY.md` (Document `WoltModalSheet`)
- `docs/04-design/UI-SCREEN-COVERAGE.md` (Update Stitch screen mapping)
- `docs/06-delivery/TASK-TRACKER.md` & `PROGRESS.md` (Track progress)

---

## 3. Potential Blockers, Risks & Security Boundaries

1. **Backdrop & Focus Trapping**:
    - Tapping backdrop or pressing `Escape` must cleanly invoke `onClose()`.
    - Prevent background body scrolling when sheet is open (`overflow: hidden` on document body).
2. **Dynamic Height & Overflow**:
    - When cart has many items, the sheet must scroll smoothly up to `maxHeight` without breaking the sticky footer or clipping the top close button.
3. **Cart Store Synchronization**:
    - Modifying item quantities directly within the `WoltModalSheet` must reactively update `useCartStore`, updating totals across the catalogue and header immediately.
4. **Single-Store Constraint**:
    - Existing single-store guard remains active; modifying quantities inside the sheet retains the same store context.

---

## 4. Open Questions & Owner Clarifications

- **Auto-Approval**: Product owner explicitly pre-authorized: _"yes, you automatically approve the spike and plan and then execute"_.
- **Visual Fidelity**: 1:1 match with Stitch project `3837531702173487386`.

---

## 5. Feasibility Verdict & Recommendation

- **Verdict**: 100% Feasible. All specifications, HTML structures, and CSS tokens have been extracted and verified.
- **Confidence**: 99%.
- **Approach**: Proceed directly to Phase 2 (Implementation Plan) and Phase 3 (Execution via TDD).
