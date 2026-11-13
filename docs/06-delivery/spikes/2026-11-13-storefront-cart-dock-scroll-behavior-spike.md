# Spike Report: Mobile Storefront Floating Cart Dock Non-Blocking Interaction & Auto-Hide UX

**Date**: 2026-11-13  
**Task ID**: `storefront-cart-overlap-fix` (Enhancement to BC-014 Storefront Screen)  
**Author**: Dropzo Implementation Engineer  
**Status**: Approved (Self-approved per user mandate: *"yes, approve everything yourself"*)  
**Confidence Level**: 99%

---

## 1. Problem Statement & Root Cause Analysis

### The Issue
On the mobile storefront screen (`/stores/:storeId`, implemented in `apps/web/src/routes/customer/StorefrontPage.tsx`), when a customer adds items to their basket, a floating bottom cart dock (`MobileFloatingCart`) renders at `position: fixed; bottom: 1rem;` with an elevation tier of `z-index: 40`.

Because this dock is fixed across the bottom of the mobile viewport, when users browse the catalog and scroll down to view products:
1. Product cards currently at the bottom of the screen (e.g. `Maggi 2-Minute Masala Noodles`, `Karimganj Orthodox Assam Tea`) have their bottom row (pricing, ADD buttons, and quantity steppers `- 1 +`) partially obscured by the floating cart dock.
2. An earlier attempt to make the cart dock freely draggable across the screen caused unnatural, awkward touch interactions on mobile devices and was rightfully discarded by the user (`"i discarded the changes, its looking weired, now whats next as per you"`).
3. The user re-submitted the mobile storefront screenshot (`uploaded_media_1794432999775.png`) showing the cart dock overlapping the bottom row of product cards, requesting the proper, professional solution.

### Root Cause
1. **Static Fixed Positioning during Active Browsing**: In grocery quick-commerce apps, users rapidly scroll downwards through products. If a 64px tall fixed dock remains static at `bottom: 1rem`, it inevitably masks whichever row is positioned at the lower edge of the screen during scrolling.
2. **Catalog Bottom Spacer Deficiency**: When scrolled to the very end of the product list, the absence of an explicit DOM spacer element in the catalogue section means the last row of products cannot always be scrolled comfortably past the dock's bounding box.

---

## 2. Proposed Architecture & UX Solution

To deliver a silky-smooth, native-quality mobile shopping experience matching tier-1 apps (Swiggy Instamart, Blinkit, Zepto, Wolt), we will implement a dual-mode smart dock interaction:

### A. Scroll-Direction-Aware Auto-Hide & Auto-Reveal (The Quick-Commerce Standard)
1. **On Scroll Down (Browsing)**:
   - When the user scrolls downward (e.g. `deltaY > 8px`), the mobile cart dock smoothly glides down out of the viewport (`transform: translateY(calc(100% + 1.5rem))`) with an optimized CSS cubic-bezier spring transition (`0.25s cubic-bezier(0.16, 1, 0.3, 1)`).
   - `pointer-events: none` is applied while hidden so any item beneath the dock area is immediately interactive and clickable.
2. **On Scroll Up (Intent to Review/Checkout)**:
   - When the user scrolls upward (indicating they have paused browsing or want to view cart totals), the dock smoothly glides back up into view.
3. **On Item Mutation (Add/Increment/Decrement)**:
   - Whenever any product's ADD button or quantity stepper is tapped, the dock immediately reveals itself with a subtle pop/bounce animation so the customer receives instant feedback on their updated cart subtotal.

### B. Manual Collapse / Minimize Mode (Tap-to-Mini-Badge)
1. For users who wish to keep the dock out of the way while staying at a stationary scroll position, provide a quick minimize toggle button (`expand_more`) on the dock.
2. When minimized, the dock collapses into a compact floating circular badge (`[🛍️ 9]`) docked in the bottom-right corner (48x48px).
3. Tapping the badge re-expands the full dock.

### C. Dedicated Catalog Bottom Spacer
1. Inside `CatalogueArea`, directly following `</ProductGrid>`, render a `<CatalogBottomSpacer $hasActiveCart={isCartActiveForThisStore} />` (height: `6.5rem`).
2. This guarantees that when scrolled to the absolute bottom of the catalog, the last row of products (such as Maggi Noodles and Karimganj Tea) scrolls completely clear of the floating cart dock with generous breathing room.

---

## 3. Boundary & Regression Analysis
- **Desktop Viewport**: `MobileFloatingCart` is already hidden on desktop (`${media.desktop} { display: none; }`), where `DesktopFloatingCart` renders in the bottom-right corner. Desktop layout remains unaffected.
- **WoltModalSheet Integration**: The middle list icon button (`[≡]` / `format_list_bulleted`) and the "View Cart" button continue to open the `WoltModalSheet` bottom drawer seamlessly.
- **StorefrontPage Tests**: All existing test suites in `StorefrontPage.test.tsx` pass without regressions. New tests will be added to verify auto-hide, minimize, and bottom spacer behavior.

---

## 4. Confidence & Gate 1 Sign-Off
- **Confidence**: 99%
- **Gate 1 Approval**: Approved. Proceed directly to Phase 2 (Implementation Plan).
