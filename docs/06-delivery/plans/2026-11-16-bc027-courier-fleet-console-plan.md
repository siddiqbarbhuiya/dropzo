# Implementation Plan: BC-027 — Platform Admin Courier Fleet & Partner Console

**Date:** 2026-11-16  
**Status:** Approved (Pre-approved by Product Owner)  
**Author:** Antigravity (Senior Full-Stack Implementation Engineer)  

## 1. Scope

- **What this task does:**
  - Complete 1:1 responsive redesign of `AdminDeliveryPartnersPage.tsx` based on Stitch Desktop (`bcc5b48e78f2429ea5da5f62c4c8e058`) and Mobile (`6166021b550a4560bba26a77eeedc642`) blueprints.
  - Platform Admin header with Dropzo brand, Badarpur Station BD-04 status, search, and cashier Kabir Ahmed identity.
  - Desktop Left Navigation sidebar (Dispatch Hub, Delivery Queue, Riders Fleet [active], COD Handover, Merchant Approvals).
  - 4-metric KPI row (Total Fleet Registered, Online On Duty, Active Trips in Transit, Total Fleet COD in Custody).
  - Fast Courier Onboarding Card: form with User ID input, vehicle type pills/selector (Hero Splendor, Honda Activa, Electric Scooter, Bicycle), and primary Coral button "Onboard Courier Partner" wired to `apiClient.createDeliveryPartner`.
  - Filterable Courier Fleet Roster Table: segmented filter tabs (All Fleet, Online & Active, In-Transit, Inactive), rider name & avatar, contact phone with call action, vehicle badge, duty status with green radar pulse, active/inactive toggle switch wired to `activateDeliveryPartner` / `deactivateDeliveryPartner`, cash in custody chip, and direct "Reconcile COD" action linking to `/admin/delivery-partners/:id/cod`.
  - Comprehensive Vitest unit & integration test suite (`AdminDeliveryPartnersPage.test.tsx`).
  - Playwright live verification across Desktop and Mobile viewports.
- **What this task does NOT do:**
  - Does NOT alter database schema or create migrations (backend endpoints and tables already exist).

## 2. Files Affected

- `apps/web/src/routes/admin/AdminDeliveryPartnersPage.tsx` (Complete 1:1 redesign)
- `apps/web/src/routes/admin/AdminDeliveryPartnersPage.test.tsx` (New comprehensive test suite)
- `docs/06-delivery/TASK-TRACKER.md` (Update task status)
- `docs/06-delivery/PROGRESS.md` (Log completion)

## 3. Implementation Steps

1. **Phase 3.1: Automated Tests First (`AdminDeliveryPartnersPage.test.tsx`)**:
   - Test 1: Renders page header, KPI cards, onboarding card, and courier roster table.
   - Test 2: Submits onboarding form with user ID and vehicle type via `apiClient.createDeliveryPartner`.
   - Test 3: Toggles active/inactive status via `activateDeliveryPartner` and `deactivateDeliveryPartner`.
   - Test 4: Filters fleet by active/inactive filter pills.
2. **Phase 3.2: 1:1 Responsive Implementation (`AdminDeliveryPartnersPage.tsx`)**:
   - Styled components adhering to `dropzoTheme` tokens.
   - Onboarding form with error handling and validation.
   - Courier fleet roster table with actions, phone links, and COD reconcile buttons.
3. **Phase 3.3: Verification Suite**:
   - `npm run typecheck -w @dropzo/web`
   - `npm run lint -w @dropzo/web`
   - `npm run test -w @dropzo/web -- AdminDeliveryPartnersPage`
   - Playwright live browser test.
4. **Phase 3.4: Documentation Sync & Commit**:
   - Update `TASK-TRACKER.md` and `PROGRESS.md`.
   - Git commit `feat(web): implement 1:1 responsive courier fleet and delivery partner management console (BC-027)`.
