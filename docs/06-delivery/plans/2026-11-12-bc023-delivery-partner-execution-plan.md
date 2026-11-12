# Implementation plan: BC-023 — Delivery Partner Task Execution Screen (`/delivery/inbox`)

## Scope

This task delivers the 1:1 responsive Delivery Partner Task Execution page at `/delivery/inbox` corresponding to Stitch screen `11f89b4ebe5d4de0bd37282ea27e4f51` generated in Stitch project `3837531702173487386`.

**In Scope**:
- Upgrade `apps/web/src/routes/delivery-partner/DeliveryPartnerInboxPage.tsx`:
  - Rider header with Dropzo Partner brand, SOS button, Badarpur Town Zone pulsing radar pill, Online status toggle, and rider avatar (Bishnu D. ★ 4.9).
  - Shift metrics summary strip: Today's Earnings (₹480), Cash in Hand (₹340 to deposit), and Acceptance Rate (98%).
  - Active Delivery Task Hero Card (#ORD-1052): Payout badge (₹65), Point A pickup waypoint (Maa Tara Groceries • Bay #2 Shelf, item manifest), and Point B delivery destination (Rahul S., House #42 Netaji Subhash Road, Badarpur, call action, navigation shortcut, customer instructions).
  - Multi-step interactive fulfillment checklist:
    - Step 1: Accept Delivery Assignment (`acceptAssignment`).
    - Step 2: Arrived at Store.
    - Step 3: Collect Parcels & Confirm Pickup (`collectAssignment`).
    - Step 4: Out for Delivery (`markOutForDelivery`).
    - Step 5: Customer Delivery PIN verification (`verifyDeliveryCode`).
    - Step 6: COD cash collection (`₹340.00`) with customer Dropzo UPI QR toggle.
  - Floating action CTA bar dynamically advancing the order state.
  - Dispatch desk assistance card.
  - Mobile bottom navigation bar.
- Update `apps/web/src/routes/delivery-partner/DeliveryPartnerInboxPage.test.tsx` with comprehensive tests.
- Synchronize documentation (`TASK-TRACKER.md` and `PROGRESS.md`).

**Explicitly Out of Scope**:
- Database schema changes.

## Files/modules affected

- `apps/web/src/routes/delivery-partner/DeliveryPartnerInboxPage.tsx`: Upgraded implementation.
- `apps/web/src/routes/delivery-partner/DeliveryPartnerInboxPage.test.tsx`: Upgraded test suite.
- `docs/06-delivery/TASK-TRACKER.md` & `PROGRESS.md`: Update task status and test counts.

## Steps

1. **Component Implementation**: Build `DeliveryPartnerInboxPage.tsx` with full Stitch fidelity, connecting to `apiClient.getOwnCurrentAssignment()`, `acceptAssignment`, `collectAssignment`, `markOutForDelivery`, and `verifyDeliveryCode`.
2. **Testing**: Update unit and integration tests in `DeliveryPartnerInboxPage.test.tsx` testing rider header, route waypoints, workflow transitions, 6-digit PIN submission, and COD cash collection card.
3. **Verification**: Run `npm run test`, `npm run typecheck`, and `npm run lint`.
4. **Docs & Commit**: Update `TASK-TRACKER.md` and `PROGRESS.md`, commit with message `feat(web): implement 1:1 responsive delivery partner task execution screen (BC-023)`.

## Risks / open questions

- PIN length: Verify 6-digit PIN validation before triggering `verifyDeliveryCode`.
