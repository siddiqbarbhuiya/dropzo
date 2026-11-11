# Implementation Plan: BC-016 Customer Order Receipt & Tracking Screen (/orders/:orderId)

**Date:** 2026-11-12  
**Status:** Approved (Pre-authorized by product owner)  
**Task ID:** BC-016  
**Author:** Antigravity (Senior Full-Stack Implementation Engineer)

---

## 1. Scope

### What this task does:
1. Re-implements [`apps/web/src/routes/customer/CustomerOrderDetailPage.tsx`](file:///C:/Users/Siddiq/Documents/project/New%20folder/apps/web/src/routes/customer/CustomerOrderDetailPage.tsx) to achieve 1:1 visual fidelity with Stitch Desktop Screen #28 (`c4d5c1c9250f40daa239fbc738600724`) and Mobile Screen #12 (`0f9149f6ef8f4b3d99077ad561339635`).
2. Implements the high-visibility **Store Counter Verification Card** featuring:
   - 6-digit pickup PIN box with interactive Copy button (with visual "Copied!" feedback).
   - High-fidelity SVG QR code component with centered Dropzo lightning badge and "Single-use • Valid 48h" label.
   - POS terminal sync indicator and instructions.
3. Implements the **Live Order Progress Stepper**:
   - 4-phase tracking: "Order Placed" -> "Accepted by Merchant" -> "Merchant is Packing Items" -> "Ready at Counter for Pickup".
   - Active status visual cues (pulse ring, spinning activity icon, progress bar).
   - Pickup slot window reminder.
4. Implements the **Pickup Location Card**:
   - Store name, Badarpur address, operating hours, distance (`0.8 km away`), and walking estimate.
   - Map preview with overlay tag.
   - Direct action buttons: "Call Shop" (`tel:` link) and "Directions" (Google Maps link).
5. Implements the **Itemized Order Summary Card**:
   - Product thumbnails, product name snapshot, variant snapshot, quantity, and unit price.
   - Detailed price breakdown: items subtotal, convenience fee (`FREE`), payment method (`Cash/UPI Counter`), and total amount due.
6. Seamlessly integrates **Home Delivery tracking** when `fulfilment_type === 'DELIVERY'`:
   - Delivery partner contact, vehicle, and live assignment status (with 15s polling).
   - Delivery verification PIN display when order status reaches `OUT_FOR_DELIVERY`.
7. Adds comprehensive unit & integration tests in [`apps/web/src/routes/customer/CustomerOrderDetailPage.test.tsx`](file:///C:/Users/Siddiq/Documents/project/New%20folder/apps/web/src/routes/customer/CustomerOrderDetailPage.test.tsx).
8. Synchronizes design coverage, task tracker, and progress documents.

### What this task explicitly does NOT do:
- Does not modify backend database schemas or alter existing API controller contracts.
- Does not change merchant or admin order management screens.

---

## 2. Files / Modules Affected

- **Modify**:
  - `apps/web/src/routes/customer/CustomerOrderDetailPage.tsx`
  - `docs/04-design/UI-SCREEN-COVERAGE.md`
  - `docs/06-delivery/TASK-TRACKER.md`
  - `docs/06-delivery/PROGRESS.md`
- **Create**:
  - `docs/06-delivery/spikes/2026-11-12-bc016-customer-order-tracking-spike.md`
  - `docs/06-delivery/plans/2026-11-12-bc016-customer-order-tracking-plan.md`
  - `apps/web/src/routes/customer/CustomerOrderDetailPage.test.tsx`

---

## 3. Implementation Steps (TDD Workflow)

### Task 1: Write Comprehensive Test Suite (`CustomerOrderDetailPage.test.tsx`)
- Write tests asserting:
  1. Shows loading state while order query is pending.
  2. Shows error state when order query fails.
  3. Renders desktop & mobile header with order number `#DZ-2026-8941` and active status.
  4. Renders green confirmation banner with store name.
  5. Renders Store Counter Verification Card with 6-digit PIN and simulated QR code.
  6. Renders live order progress timeline reflecting current status.
  7. Renders pickup location card with "Call Shop" and "Directions" links.
  8. Renders order summary with item rows and total pricing breakdown.
  9. Renders home delivery details and delivery verification code when `fulfilment_type === 'DELIVERY'`.
  10. Copy PIN button copies text to clipboard and displays confirmation.

### Task 2: Implement 1:1 Stitch UI in `CustomerOrderDetailPage.tsx`
- Build styled components honoring Dropzo design tokens:
  - `DesktopHeader`, `SubHeaderBar`, `ConfirmationBanner`
  - `VerificationCard`, `PinDisplayBox`, `QrContainer`
  - `OrderProgressTimeline`, `ProgressStepItem`
  - `StoreLocationCard`, `MapPreviewBox`, `StoreActionButtons`
  - `OrderSummaryCard`, `ItemRow`, `PriceBreakdown`
  - `DeliveryProgressSection`
- Wire queries to `apiClient.getOwnOrder`, `apiClient.getOwnPickupCode`, `apiClient.getOwnDeliveryStatus`, and `apiClient.getOwnDeliveryCode`.
- Implement responsive styles (clean mobile column <1024px, 12-column grid 7:5 >=1024px).

### Task 3: Verification & Hygiene
- Run `npm run test -w @dropzo/web -- --run`.
- Run `npm run typecheck -w @dropzo/web`.
- Run `npm run lint -w @dropzo/web`.
- Format with Prettier: `npx prettier --write ...`.
- Run `npm run build -w @dropzo/web`.
- Verify backend tests: `npm run test -w @dropzo/api`.

### Task 4: Documentation Synchronization
- Mark screens #12 and #28 as `Migrated` in `docs/04-design/UI-SCREEN-COVERAGE.md`.
- Update `docs/06-delivery/TASK-TRACKER.md`.
- Append delivery progress log to `docs/06-delivery/PROGRESS.md`.

---

## 4. Test Plan

- **Framework**: Vitest + React Testing Library + `@testing-library/jest-dom`.
- **Coverage**:
  - Empty/Error/Loading states.
  - Pickup fulfillment rendering with active PIN and QR code.
  - Delivery fulfillment rendering with delivery partner metadata and delivery verification PIN.
  - Interactive PIN copy button.
  - Navigation links to `/orders` and `/`.
