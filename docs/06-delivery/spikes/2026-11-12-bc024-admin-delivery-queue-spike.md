# Spike & Feasibility Analysis: BC-024 — Admin Delivery Queue & Dispatch Workspace (`/admin/delivery-queue`)

## 1. Context & Objectives

- **Task**: Upgrade the Admin Delivery Assignment Queue at `/admin/delivery-queue` to the full 1:1 responsive desktop dispatcher workspace based on Stitch screen `f114fa5c6415484ca8e7ef4fc02b0e3e` ("Platform Admin - Delivery Queue & Dispatch Workspace (Desktop)") in Stitch project `3837531702173487386`.
- **Requirements**:
  - `ADR-0010`: Pickup and manual delivery workflow (manual dispatch by platform admin, no automated algorithm needed at launch).
  - `FR-DEL-001`: Manual delivery partner assignment by platform admin.
  - `FR-DEL-002`: Proof of delivery verification via 6-digit PIN.
  - `FR-DEL-004`: Reassignment of failed or rejected deliveries.
  - `FR-PAY-001`: Cash on Delivery tracking and hub cash custody handover.

## 2. Affected Files & Boundaries

- `apps/web/src/routes/admin/AdminDeliveryQueuePage.tsx`: Upgraded 1:1 responsive desktop dispatcher workspace.
- `apps/web/src/routes/admin/AdminDeliveryQueuePage.test.tsx`: Upgraded test suite covering queue filtering, rider selection, dispatch assignment, reassignment alerts, and COD custody drawer.
- `packages/api-client/src/index.ts`: Already includes `listEligibleDeliveryOrders`, `listDeliveryPartners`, `assignDelivery`, `cancelDeliveryAssignment`, `recordCodHandover`, `listCodHandovers`.
- `docs/06-delivery/TASK-TRACKER.md` & `docs/06-delivery/PROGRESS.md`: Documentation synchronization.

## 3. Stitch Screen Analysis (`f114fa5c6415484ca8e7ef4fc02b0e3e`)

1. **Top Dispatcher Header**:
   - Official Dropzo Admin Brand Logo with `Platform Dispatch Hub` pill.
   - Badarpur Town Zone dispatcher badge (`Badarpur Town Zone (Pin 788806) • Active Hub BD-04`).
   - Live Active Queue counter badge (`5 Pending Assignment`).
   - Emergency Alert Pill action (`Emergency Alert / Normal Ops`).
   - Dispatcher profile avatar (`Kabir Ahmed - Lead Dispatcher - Sribhumi`).
2. **Desktop Side Nav (Left)**:
   - Hub info: Badarpur Station Hub (BD-04).
   - Navigation links: Dispatch Hub (active), Order Queues (badge 5), Riders Fleet (6 Online), Cash Handover (₹4.2k), Zone Settings, Live Support, Shift Logout.
3. **KPI Summary Cards (4 Cards Grid)**:
   - Orders Awaiting Dispatch: `5 orders` (3 Urgent < 5m SLA, 2 Regular • Avg wait 3.4m).
   - Available Riders in Zone: `4 online / 6 total` (2 Busy on Trips).
   - In-Transit Trips: `8 active` (On-time rate 98.2% • Badarpur Town Area).
   - Pending COD in Custody: `₹4,250` (Across 6 riders • Safe limit ₹15,000).
4. **Main Content Split Layout**:
   - **Queue Stream (67-70% width)**:
     - Filter tabs: `All Orders (13)`, `Ready for Pickup (5)` (Active), `In-Transit (8)`, `Reassignment (1 Alert)`.
     - Live auto-refresh toggle (Live 15s).
     - Filter dropdowns: Zone selector and SLA selector.
     - Order Cards:
       - Order #ORD-1052: Pickup at Maa Tara Groceries (Bay #2 Shelf), Drop to Rahul S. (Netaji Subhash Road), COD ₹340.00, Elapsed SLA (4m ago), Partner Selector with live distance & vehicle ratings, and "Assign Delivery Partner" button.
       - Order #ORD-1053: Badarpur Fresh Mandi -> Sunita Paul, Prepaid UPI ₹210.00, Recommended partner selector, and "Assign Delivery Partner" button.
       - Order #ORD-1050 (Reassignment Alert): Karimganj Tea & Bakery Hub -> Amitava Roy, COD ₹185.00, Stalled at Merchant alert badge, Emergency Replace selector, "Call Customer", and "Reassign & Alert Rider" button.
       - Order #ORD-1049 (In-Transit): Sribhumi Dairy & Sweets -> Pooja Deb, Faruk Laskar in route, Prepaid ₹190.00, "View Live Track & PIN".
   - **Active Delivery Fleet Sidebar (30-33% width)**:
     - Roster of 6 Badarpur riders: Bishnu Das (Hero Splendor, 4.9★, Available, COD ₹680), Rahim Uddin (Honda Activa, 4.8★, Available, COD ₹1,240), Faruk Laskar (Bajaj Platina, Busy on #ORD-1049), Debasish Nath (TVS Jupiter, Available), Sahil Barbhuiya (Busy on #ORD-1047, COD ₹1,880), Joydeep Das (Offline).
     - Cash Handover deposit button per rider.
     - Hub Cash Safe & Handover Drawer (FR-PAY-001): Today's Verified COD (`₹8,420.00`), Pending Settlement (`₹4,250.00`), and "Open Safe Deposit Ledger" modal.

## 4. Confidence Level

- **Confidence**: **99%**.
- All API contracts are present in `@dropzo/api-client`.
- Stitch blueprint is completely downloaded with HTML and PNG.
- Clear state mapping for manual assignment, reassignment, and COD custody.
