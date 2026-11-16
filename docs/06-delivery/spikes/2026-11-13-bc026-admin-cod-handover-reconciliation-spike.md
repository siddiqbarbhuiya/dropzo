# Spike: BC-026 — Admin COD Handover & Safe Reconciliation Workspace

**Date:** 2026-11-13  
**Status:** Approved (Pre-approved by Product Owner)  
**Confidence Level:** 99% (>95% required for Phase 2 approval)  
**Author:** Antigravity (Senior Full-Stack Implementation Engineer)  

## 1. Objective & Requirements Scope

- **Objective:** Upgrade the barebones `/admin/delivery-partners/:partnerId/cod` wireframe into a full 1:1 responsive desktop and mobile COD Cash Handover & Safe Reconciliation Workspace, matching the official Stitch blueprints generated in project `3837531702173487386` (Desktop `7c9e5fe79c3b4a1c98b5d43db306f9ad`, Mobile `d375a07690cc4342904f7876ae975d41`).
- **Requirements Covered:**
  - `FR-PAY-001`: Cash-on-Delivery payment processing and cash custody tracking.
  - `FR-DEL-001..004`: Delivery partner assignment, tracking, and settlement.
  - `ADR-0010`: Cash drawer reconciliation without denomination count breakdown (order amount only).
  - Stitch Screen DB-07 Desktop (`7c9e5fe79c3b4a1c98b5d43db306f9ad`) & Mobile (`d375a07690cc4342904f7876ae975d41`).

## 2. Research & Investigation Findings

- **Current Codebase State:**
  - `apps/web/src/routes/admin/AdminCodHandoverPage.tsx`: Minimal list with checkboxes and simple submit button, lacking brand header, KPI metrics, custody threshold meter, partner switcher, and audit history ledger.
  - `apps/web/src/App.tsx`: Registered at `/admin/delivery-partners/:partnerId/cod` guarded by `RequireAuth role="ADMIN"`.
  - Backend API methods are fully implemented and typed in `@dropzo/api-client`:
    - `apiClient.listDeliveryPartners({ isActive: true })`
    - `apiClient.getDeliveryPartnerCodSummary(partnerId)`
    - `apiClient.listDeliveryPartnerHandovers(partnerId, { page, limit })`
    - `apiClient.recordCodHandover(deliveryPartnerId, orderIds, notes)`
- **Visual Design Parity:**
  - Fresh Stitch designs generated and downloaded:
    - Desktop: `audit/stitch-audit/html/7c9e5fe79c3b4a1c98b5d43db306f9ad.html` and `audit/stitch-audit/screenshots/7c9e5fe79c3b4a1c98b5d43db306f9ad.png`.
    - Mobile: `audit/stitch-audit/html/d375a07690cc4342904f7876ae975d41.html` and `audit/stitch-audit/screenshots/d375a07690cc4342904f7876ae975d41.png`.
  - Theme Tokens:
    - Primary: Coral `#FF5733`
    - Secondary: Forest Green `#006E2D`
    - Surface: `#FBF8FF`, Surface Container Lowest: `#FFFFFF`, Borders: `#E4BEB6` / `#E8E7F1`
    - Plus Jakarta Sans typography.

## 3. Potential Blockers, Risks & Security Boundaries

- **Negative Constraint Guard (STITCH-DESIGN-BRIEFS.md §DB-07):**
  - No physical note denomination counting grid (₹2000/₹500/₹100) — backend rejects partial amounts per order; reconciliation is strictly order-by-order.
- **Data Isolation & Concurrency Safety:**
  - All operations require `ADMIN` role.
  - `orderIds` must be a non-empty set of assignments actually in custody.
  - The UI prevents selecting 0 orders and disables the submission button until at least 1 order is selected.
  - Notes field enforced ≤ 2,000 characters with live character counter.

## 4. Open Questions & Trade-offs (Pre-resolved)

- **Route Availability:**
  - Route `/admin/delivery-partners/:partnerId/cod` will remain the primary route. If `:partnerId` is missing or when accessing `/admin/cod-handover`, the page will automatically select the first active delivery partner from `apiClient.listDeliveryPartners()` or allow picking one from the top partner selector.
- **Print / PDF Receipt Slip:**
  - On successful handover settlement, the UI displays a clean receipt modal / drawer with transaction reference `#HO-...`, amount, orders settled, and cashier stamp.

## 5. Feasibility Verdict & Recommendation

- **Verdict:** Feasible immediately with 99% confidence.
- **Recommendation:** Proceed to Phase 2 (Implementation Plan) to structure component architecture and automated tests.
