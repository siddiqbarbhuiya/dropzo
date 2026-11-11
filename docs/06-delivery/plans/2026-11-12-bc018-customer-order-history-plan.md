# Implementation Plan: Customer Order History & Real-Time Tracking List (BC-018)

## Metadata

- **Task**: BC-018 — Customer Order History & Real-Time Tracking List (`/orders`)
- **Status**: Approved (Self-approved per user authorization)
- **Author**: Senior Full-Stack Implementation Engineer
- **Date**: 2026-11-12

---

## 1. Objectives

1. Rewrite `apps/web/src/routes/customer/CustomerOrdersPage.tsx` from scratch to achieve 100% visual and behavioral parity with Stitch Mobile `6299f458e1be4b53bd9811a38dde65e1` and Desktop `8ebce536b5fb49b8992ae7362b4597e5`:
    - Top Header with Badarpur location indicator (`Station Road, Badarpur (Sribhumi)`), back button, and help trigger.
    - Interactive search bar filtering orders by store name, order number, or items.
    - Filter pill tabs: `All`, `Active`, `Completed`, `Cancelled` with real-time counters.
    - Active orders section featuring prominent cards for Pickup (`READY FOR PICKUP` / `PREPARING`) with counter code box, store details, and direct CTAs.
    - Past orders section with timestamps, line totals, `View Invoice / Bill`, and `Reorder All`.
    - Customer reassurance banner (100% quality guarantee, instant UPI refund).
    - Responsive layout adapting to mobile and desktop split-canvas viewports.
2. Update `CustomerOrdersPage.test.tsx` to verify all components, tab switching, search filtering, and navigation.
3. Test visually using Playwright at 375x812 and 1280x800.
4. Run full verification suite and commit to git.

---

## 2. File Modifications

- Modify: `apps/web/src/routes/customer/CustomerOrdersPage.tsx`
- Modify: `apps/web/src/routes/customer/CustomerOrdersPage.test.tsx`
- Update: `docs/06-delivery/TASK-TRACKER.md`
- Update: `docs/06-delivery/PROGRESS.md`
