# Implementation Plan: BC-024 — Admin Delivery Queue & Dispatch Workspace (`/admin/delivery-queue`)

## Scope

This task delivers the 1:1 responsive desktop Dispatcher Control Center at `/admin/delivery-queue` corresponding to Stitch screen `f114fa5c6415484ca8e7ef4fc02b0e3e` generated in Stitch project `3837531702173487386`.

**In Scope**:
- Upgrade `apps/web/src/routes/admin/AdminDeliveryQueuePage.tsx`:
  - Top header with Dropzo logo, "Platform Dispatch Hub" badge, Badarpur Town Zone dispatcher badge, live queue indicator (`5 Pending Assignment`), emergency alert button, and Kabir Ahmed dispatcher profile.
  - Desktop Side Nav with hub badge, Quick Order Add, Dispatch Hub (active), Order Queues, Riders Fleet, Cash Handover, Zone Settings, Live Support, and Logout.
  - KPI Summary Cards: Orders Awaiting Dispatch (5 orders), Available Riders in Zone (4 online / 6 total), In-Transit Trips (8 active), and Pending COD in Custody (₹4,250).
  - Main Dispatch Queue Stream:
    - Status filter tabs (`All Orders`, `Ready for Pickup`, `In-Transit`, `Reassignment / Alerts`).
    - Live auto-refresh indicator (15s polling via TanStack Query).
    - Zone and SLA dropdown filters.
    - Dynamic order cards displaying store details, customer destination, order amount / COD tag, SLA elapsed timer, partner selector dropdown with live status, and "Assign Delivery Partner" / "Reassign & Alert Rider" CTAs.
  - Active Delivery Fleet Right Sidebar:
    - Roster of riders with vehicle types, availability chips, COD cash in custody, and quick dispatch / deposit actions.
    - Hub Cash Safe & Handover Drawer with today's verified COD (₹8,420.00) and "Open Safe Deposit Ledger" button.
- Update `apps/web/src/routes/admin/AdminDeliveryQueuePage.test.tsx` with comprehensive tests.
- Synchronize documentation (`TASK-TRACKER.md` and `PROGRESS.md`).

**Explicitly Out of Scope**:
- Backend database migrations or changes to assignment APIs.

## Files/modules affected

- `apps/web/src/routes/admin/AdminDeliveryQueuePage.tsx`: Upgraded implementation.
- `apps/web/src/routes/admin/AdminDeliveryQueuePage.test.tsx`: Upgraded test suite.
- `docs/06-delivery/TASK-TRACKER.md` & `PROGRESS.md`: Documentation updates.

## Steps

1. **Component Implementation**: Build `AdminDeliveryQueuePage.tsx` with full Stitch fidelity, connecting to `apiClient.listEligibleDeliveryOrders`, `apiClient.listDeliveryPartners`, and `apiClient.assignDelivery`.
2. **Testing**: Update unit & integration tests in `AdminDeliveryQueuePage.test.tsx` testing top header, KPI metrics, queue filtering, selecting a delivery partner, assigning order, and COD custody drawer.
3. **Verification**: Run `npm run test -w @dropzo/web -- AdminDeliveryQueuePage`, `npm run typecheck`, `npm run lint`, and `npm run build`.
4. **Docs & Commit**: Update `TASK-TRACKER.md` and `PROGRESS.md`, commit with message `feat(web): implement 1:1 responsive admin delivery queue and dispatch workspace (BC-024)`.

## Risks / Open Questions

- None. All APIs and design tokens are established.
