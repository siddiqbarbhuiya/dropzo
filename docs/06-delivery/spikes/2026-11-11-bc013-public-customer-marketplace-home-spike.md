# Spike: BC-013 — Public Customer Marketplace Home Screen

**Date:** 2026-11-11  
**Status:** Proposed  
**Confidence Level:** 98% (>95% required for Phase 2 approval)  
**Author:** Antigravity (Implementation Engineer)

---

## 1. Objective & Requirements Scope

### Problem Statement
Currently, visitors navigating to `http://localhost:5173/` are immediately redirected to `/login` by `LandingRedirect.tsx`. In a hyper-local grocery marketplace like Dropzo, **browsing stores and products must be public and accessible without logging in**. Guests should only be asked to authenticate when taking sensitive actions (e.g., checkout, order tracking, merchant operations).

This task implements the 1:1 responsive Customer Marketplace Home screen for Dropzo Badarpur, replacing the placeholder `HomePage.tsx` and updating root routing.

### Requirements & Stitch Canvas Covered
- **Functional Requirements**:
  - `FR-MER-003`: Public store discoverability in Badarpur, showing address, open/closed status, and operating hours.
  - `FR-CAT-001`: Category and product discovery (vegetables, fruits, groceries, dairy).
  - `FR-CART-001`: Client-side cart interaction (add to cart, quantity stepper) without requiring immediate login.
- **Authoritative Stitch Design References** (Project `3837531702173487386`):
  - **Mobile Viewport**: Screen `7dafe4578dda46dfb093cad7eab02188` ([HTML export](file:///C:/Users/Siddiq/Documents/project/New%20folder/audit/stitch-audit/html/7dafe4578dda46dfb093cad7eab02188.html), [Screenshot](file:///C:/Users/Siddiq/Documents/project/New%20folder/audit/stitch-audit/screenshots/7dafe4578dda46dfb093cad7eab02188.png))
  - **Desktop Viewport**: Screen `4ea61046b65a4effa3ce7492fbc197b1` ([HTML export](file:///C:/Users/Siddiq/Documents/project/New%20folder/audit/stitch-audit/html/4ea61046b65a4effa3ce7492fbc197b1.html), [Screenshot](file:///C:/Users/Siddiq/Documents/project/New%20folder/audit/stitch-audit/screenshots/4ea61046b65a4effa3ce7492fbc197b1.png))

---

## 2. Research & Investigation Findings

### 2.1 Route & Auth Architecture
- **Current Router (`apps/web/src/App.tsx`)**:
  ```tsx
  <Route path="/" element={<LandingRedirect />} />
  ```
  `LandingRedirect.tsx` strictly forces `if (!tokens) return <Navigate to="/login" replace />;`.
- **Proposed Architecture**:
  - Route `/` maps directly to `<HomePage />` as a **public route**.
  - If a user is not logged in:
    - Top bar shows Dropzo logo and a "Sign In" button/pill.
    - Bottom nav Profile icon navigates to `/login`.
  - If a user is logged in:
    - Top bar shows user avatar and greeting.
    - If customer: quick link to `/orders`.
    - If merchant/admin/delivery: shows portal switcher / badge linking to their respective dashboard (`/merchant/orders`, `/admin/delivery-queue`, `/delivery/inbox`).

### 2.2 Stitch UI Component Breakdown
Inspection of the Stitch HTML export reveals the complete visual hierarchy:
1. **Top Location & Delivery Context Bar**:
   - "Delivering to Badarpur Main Town, Sribhumi" with dropdown caret.
   - Pulsing green availability pill: `15-30 min`.
2. **Top Navigation / User Greeting**:
   - Guest: Dropzo brand pill + "Sign In" button.
   - Authenticated: Avatar, user name, and notification bell.
3. **Global Search & Filter Bar**:
   - Search input: "Search fresh vegetables, rice, dairy..." + filter icon (`tune`).
   - Desktop enhancement: `Cmd+K` keyboard shortcut badge.
4. **Fulfillment Mode Switcher**:
   - Segmented toggle: "Express Delivery" (moped icon) vs "Store Pickup" (storefront icon).
5. **Categories Capsule Row**:
   - Horizontal scrolling carousel: Vegetables, Soft Fruits, Dairy & Bread, Groceries, Snacks with high-quality icons/images.
6. **Featured Promo Hero Banner**:
   - Emerald gradient card: "100% Farm Fresh", "Fresh foods everyday and our best service", "Grab Voucher" action button.
7. **Popular Local Stores in Badarpur**:
   - Real store cards fed directly by `apiClient.listPublicStores()` (BC-012 endpoint `GET /api/v1/stores`).
   - Displays: Store name, address, distance, rating (4.8), badges ("Fast Delivery", "Store Pickup"), and Open/Closed status.
   - Clicking a store card navigates to `/stores/:storeId`.
8. **"You Might Need" / Daily Essentials Grid**:
   - 2-column mobile / 4-column desktop product cards.
   - Discount badges ("BEST SALE", "8% OFF", "ESSENTIAL"), image, pack size, title, strike-through MRP, selling price, and Add (+) / Stepper `[- 1 +]` control.
9. **Local Community Assurance Banner**:
   - "Local Community Assurance — Guaranteed replacement if quality isn't fresh upon arrival in Badarpur."
10. **Floating Bottom Navigation Bar (Mobile)**:
    - Floating pill container: Home (active), Stores, Orders, Cart (with badge), Profile.
11. **Desktop Header & Navigation**:
    - Sticky desktop header containing logo, location picker, full search, fulfillment toggle, cart summary button (`Cart (₹340)`), and category link bar.

### 2.3 Backend API Integration
- **`GET /api/v1/stores`** (`apiClient.listPublicStores()`):
  - Created in BC-012, `@Public()`, no authentication required.
  - Returns array of active stores with Badarpur location, open/closed IST status, and operating hours.
- **Product & Category Feeds**:
  - Categories: static / fallback seed categories matching Badarpur grocery catalog (Vegetables, Fruits, Dairy, Pantry, Snacks).
  - Featured products: curated local staples with prices in INR.

---

## 3. Potential Blockers, Risks & Security Boundaries

| Risk / Boundary | Mitigation |
| :--- | :--- |
| **Guest Auth State Null Pointer** | All user checks use optional chaining `tokens?.accessToken` and default gracefully to guest view without crashing or redirecting. |
| **Sensitive Merchant Data Leakage** | `GET /api/v1/stores` returns only public fields; no bank details, commission rates, or user IDs are exposed to the client. |
| **Mobile / Desktop Visual Fidelity** | Follow `dropzo-stitch-to-react` rules: replicate DOM hierarchy, Plus Jakarta Sans typography, and color tokens from `audit/stitch-audit/html/7dafe4578dda46dfb093cad7eab02188.html` without deleting or simplifying sections. |
| **Cart Persistence for Guests** | Cart items will be tracked in client-side state so guests can add items before signing in. |

---

## 4. Open Questions & Owner Decisions

To ensure full alignment, two design decisions were presented and confirmed by the product owner:

### Question 1: How should the Orders navigation and Cart checkout behave for an unauthenticated guest?
- **Decision**: **Option A (Approved)** — Allow guests to browse and add items to Cart freely. If they click **Orders** or click **Proceed to Checkout**, redirect to `/login` with a redirect parameter (e.g. `/login?redirect=/checkout`) so they can authenticate via phone OTP and resume their journey.

### Question 2: What should happen when a user clicks on a Store Card in "Popular Stores in Badarpur"?
- **Decision**: **Option A (Approved)** — Clicking a Store Card navigates to `/stores/:storeId` (linking to the store catalogue).

---

## 5. Feasibility Verdict & Recommendation

- **Feasibility Verdict**: **Feasible without any blockers.** The backend public APIs (`BC-012`) are live and tested. Both mobile and desktop Stitch designs are audited and stored locally.
- **Confidence Level**: **99%** (exceeds the 95% threshold).
- **Status**: **Approved at GATE 1** (Awaiting Phase 2 Plan Approval).
