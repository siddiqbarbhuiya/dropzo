# Implementation Plan: BC-026 — Admin COD Handover & Safe Reconciliation Workspace

**Date:** 2026-11-13  
**Status:** Approved (Pre-approved by Product Owner)  
**Author:** Antigravity (Senior Full-Stack Implementation Engineer)  

## 1. Scope

- **What this task does:**
  - Complete 1:1 responsive redesign of `AdminCodHandoverPage.tsx` based on Stitch Desktop (`7c9e5fe79c3b4a1c98b5d43db306f9ad`) and Mobile (`d375a07690cc4342904f7876ae975d41`) blueprints.
  - Platform Admin header with Badarpur Hub status, dispatch KPI chips, search bar, and cashier identity.
  - Desktop Left Navigation sidebar (Dispatch Hub, Delivery Queue, Riders Fleet, Cash Handover [active], Zone Settings).
  - Active Delivery Partner Selector pill rail & summary custody card with vehicle details, road duration, outstanding cash balance, safe limit progress meter (85.5% of ₹4,000 threshold), and direct dispatch contact action.
  - Multi-select uncollected COD orders table with select-all header, running selected total pill, order store tags, customer details, OTP POD verification tags, and cash amount chips.
  - Physical Cash Handover settlement card with mandatory physical cash counted verification checkbox, optional cashier notes (≤ 2,000 chars with live counter), summary breakdown (orders, total amount, zero variance), and primary "Record Cash Handover & Print Receipt" CTA.
  - Recent Hub Cash Handover Audit Log history table below with settled sums, cashier notes, date/time, and receipt download trigger.
  - Receipt modal / slip showing transaction reference `#HO-...` upon successful settlement.
  - Add route alias `/admin/cod-handover` in `apps/web/src/App.tsx`.
  - Comprehensive Vitest unit & integration test suite (`AdminCodHandoverPage.test.tsx`).
  - Playwright live verification across Desktop and Mobile viewports.
- **What this task does NOT do:**
  - Does NOT alter database schema or create migrations (backend endpoints and tables already exist).
  - Does NOT implement physical denomination counting note breakdown (strictly prohibited per ADR-0010 & STITCH-DESIGN-BRIEFS §DB-07).

## 2. Files Affected

- `apps/web/src/routes/admin/AdminCodHandoverPage.tsx` (Complete 1:1 redesign)
- `apps/web/src/routes/admin/AdminCodHandoverPage.test.tsx` (New comprehensive test suite)
- `apps/web/src/App.tsx` (Route alias registration)
- `docs/06-delivery/TASK-TRACKER.md` (Update task status)
- `docs/06-delivery/PROGRESS.md` (Log completion)

## 3. Implementation Steps

1. **Phase 3.1: Component Architecture & Redesign (`AdminCodHandoverPage.tsx`)**:
   - Styled components adhering to `dropzoTheme` tokens (Coral `#FF5733`, Forest `#006E2D`, Surface `#FBF8FF`, surfaceContainerLowest `#FFFFFF`, textPrimary `#1A1B22`).
   - Partner fetching via `apiClient.listDeliveryPartners({ isActive: true })`.
   - Partner summary fetching via `apiClient.getDeliveryPartnerCodSummary(partnerId)`.
   - Handovers history fetching via `apiClient.listDeliveryPartnerHandovers(partnerId)`.
   - Selection state handling with select-all, running selected amount calculation.
   - Settlement mutation via `apiClient.recordCodHandover(partnerId, orderIds, notes)`.
   - Receipt Modal for instant print / confirmation.
2. **Phase 3.2: Automated Unit & Integration Tests (`AdminCodHandoverPage.test.tsx`)**:
   - Test 1: Renders page header, partner selector, custody summary, and uncollected orders.
   - Test 2: Multi-select toggles recalculate selected total and enable/disable settlement button.
   - Test 3: Submitting handover calls `apiClient.recordCodHandover` with selected order IDs and notes, invalidates queries, and displays receipt modal.
   - Test 4: Renders audit log history table with previous settlements.
3. **Phase 3.3: Verification Suite**:
   - `npm run typecheck -w @dropzo/web`
   - `npm run lint -w @dropzo/web`
   - `npm run test -w @dropzo/web -- AdminCodHandoverPage`
   - Live browser verification with Playwright.
4. **Phase 3.4: Documentation Sync & Commit**:
   - Update `TASK-TRACKER.md` and `PROGRESS.md`.
   - Git commit `feat(web): implement 1:1 responsive admin COD handover and safe reconciliation workspace (BC-026)`.

## 4. Test Plan

- Render verification of all critical elements (Header, Sidebar, Partner Selector, Summary Card, Orders Table, Action Box, History Ledger).
- Interactive checkbox selection and select-all verification.
- Submission payload verification with mock API client.
- Empty states and loading state verification.
