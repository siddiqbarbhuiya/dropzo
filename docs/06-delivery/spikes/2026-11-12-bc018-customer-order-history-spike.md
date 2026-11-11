# Spike: Customer Order History & Real-Time Tracking List (BC-018)

## Metadata

- **Task**: BC-018 — Customer Order History & Real-Time Tracking List (`/orders`)
- **Status**: Completed / Approved (Self-approved per user authorization)
- **Author**: Senior Full-Stack Implementation Engineer
- **Date**: 2026-11-12
- **Confidence Level**: 98% (>95% Gate Met)

---

## 1. Objective & Scope

Upgrade `CustomerOrdersPage.tsx` from its rudimentary wireframe to the complete, production-grade, 1:1 responsive Stitch design for Dropzo's Customer Order History & Tracking List (`/orders`):

- **Mobile Stitch Blueprint**: Screen `6299f458e1be4b53bd9811a38dde65e1` (`Dropzo Customer Order History & Tracking List - Mobile`).
- **Desktop Stitch Blueprint**: Screen `8ebce536b5fb49b8992ae7362b4597e5` (`Dropzo Customer Order History & Tracking Dashboard - Desktop`).
- **Functional Requirements**: FR-ORD-001..008, FR-PICK-001..004, FR-DEL-001..004.

---

## 2. Technical Findings & Stitch Blueprint Parity

### Mobile Viewport Structure (`6299f458e1be4b53bd9811a38dde65e1`)

- **Sticky App Header**: Back button navigation, "My Orders" heading with Badarpur location indicator (`Station Road, Badarpur (Sribhumi)`), and Help action button.
- **Search & Filter Rails**: Live search input for past orders/items/stores with tune filter button, and horizontal scrolling filter pill tabs: `All`, `Active`, `Completed`, `Cancelled`.
- **Active Orders Showcase**:
    - Store Pickup Card: Accent status band, store storefront icon, Badarpur Station Road address, vibrant emerald `READY FOR PICKUP` badge with pulse dot, Pickup Verification Box with counter code and QR action, item summary, total price, and action buttons (`Call Store` / `View Code & QR` routing to `/orders/:orderId`).
    - Express Home Delivery Card: Amber status badge `PREPARING`, 3-stage visual progress stepper (`Confirmed` -> `Packing` -> `On the way`), fresh produce item summary, total price, and `Track Live Progress` CTA.
- **Past Orders History Section**:
    - Itemized past order cards with timestamps, order number `#ORD-...`, completion status badge, line total, `View Invoice / Bill` action, and `Reorder All` button.
- **Customer Guarantee Banner**: 100% Quality & Freshness Guarantee with instant UPI refund assurance.
- **Floating Bottom Nav Bar**: Home, Stores, Orders (active orange pill), Cart, Profile.

### Desktop Viewport Structure (`8ebce536b5fb49b8992ae7362b4597e5`)

- **Top Utility Navigation Bar**: Dropzo brand logo with 15-minute quick delivery tag, Badarpur Central Hub location selector, universal search field, Cart preview, notification bell, and user profile chip.
- **Two-Column Dashboard Grid**:
    - **Left Sidebar (280px)**: Customer profile summary card, Prime membership badge, vertical navigation links, and Customer Metrics Summary card (Total Orders, Active Orders, Total Spent).
    - **Right Content Panel**: "Order History & Real-Time Tracking" header, filter tabs, active dual-card grid (Pickup vs Delivery), and structured past orders table with status badges and action triggers.
- **Dropzo Canonical Footer**.

---

## 3. API Integration & Real Data Mapping

1. **Active & Past Orders**:
    - `apiClient.listOwnOrders({ page: 1, limit: 20 })` (`GET /api/v1/customers/me/orders`).
    - Maps orders by status:
        - Active orders: `status in ['CREATED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY']`.
        - Completed orders: `status in ['COMPLETED', 'DELIVERED']`.
        - Cancelled orders: `status in ['CANCELLED', 'REJECTED']`.
2. **Order Actions**:
    - Tapping an order card or "Track Order" / "View Code & QR" routes to `/orders/:orderId`.
    - Reorder button redirects to `/stores/:storeId` or re-adds items to cart.
3. **Empty States**:
    - Friendly empty state when no orders exist in a filtered category, offering "Browse Badarpur Kiranas" CTA directing to `/`.

---

## 4. Verification Plan

1. Unit & component tests in `CustomerOrdersPage.test.tsx`:
    - Rendering active orders with store info, status badges, and counter codes.
    - Filtering orders by tab (`All`, `Active`, `Completed`, `Cancelled`).
    - Order search filtering by store name or order number.
    - Empty state when no orders match.
    - Navigation links to `/orders/:orderId`.
2. Playwright visual tests at 375x812 (mobile) and 1280x800 (desktop).
3. Full verification suite: typecheck, lint, format check, and unit tests.

---

## 5. Confidence Assessment

- Design Parity: **98%**
- Functional Integration: **98%**
- **Decision**: Gate passed. Proceed directly to Implementation Plan.
