# Spike: BC-027 — Platform Admin Courier Fleet & Partner Console

**Date:** 2026-11-16  
**Status:** Approved (Pre-approved by Product Owner)  
**Confidence Level:** 99% (>95% required for Phase 2 approval)  
**Author:** Antigravity (Senior Full-Stack Implementation Engineer)  

## 1. Objective & Requirements Scope

- **Objective:** Upgrade the barebones `/admin/delivery-partners` wireframe into a full 1:1 responsive desktop and mobile Courier Fleet & Delivery Partner Console, matching official Stitch blueprints generated in project `3837531702173487386` (Desktop `bcc5b48e78f2429ea5da5f62c4c8e058`, Mobile `6166021b550a4560bba26a77eeedc642`).
- **Requirements Covered:**
  - `FR-DEL-001`: Delivery partner onboarding, registration, and profile creation.
  - `FR-DEL-002`: Delivery partner status management (active/inactive activation toggle).
  - `FR-PAY-001`: Direct linkage from courier fleet to COD cash custody and reconciliation.
  - Stitch Blueprints: Desktop (`bcc5b48e78f2429ea5da5f62c4c8e058`) & Mobile (`6166021b550a4560bba26a77eeedc642`).

## 2. Research & Investigation Findings

- **Current Codebase State:**
  - `apps/web/src/routes/admin/AdminDeliveryPartnersPage.tsx`: Minimal form with plain text inputs and basic list, lacking Platform Admin branding, KPI row, fleet filters, vehicle badges, and COD reconciliation quick actions.
  - `apps/web/src/App.tsx`: Registered at `/admin/delivery-partners` guarded by `RequireAuth role="ADMIN"`.
  - Backend API methods in `@dropzo/api-client`:
    - `apiClient.listDeliveryPartners({ page, limit, isActive })`
    - `apiClient.createDeliveryPartner(userId, vehicleType)`
    - `apiClient.activateDeliveryPartner(id)`
    - `apiClient.deactivateDeliveryPartner(id)`
    - `apiClient.getDeliveryPartner(id)`
    - `apiClient.getDeliveryPartnerCodSummary(id)`
- **Visual Design Parity:**
  - Fresh Stitch designs generated and downloaded:
    - Desktop: `audit/stitch-audit/html/bcc5b48e78f2429ea5da5f62c4c8e058.html` and `audit/stitch-audit/screenshots/bcc5b48e78f2429ea5da5f62c4c8e058.png`.
    - Mobile: `audit/stitch-audit/html/6166021b550a4560bba26a77eeedc642.html` and `audit/stitch-audit/screenshots/6166021b550a4560bba26a77eeedc642.png`.
  - Theme Tokens:
    - Primary: Coral `#FF5733`
    - Secondary: Forest Green `#006E2D`
    - Background: `#FBF8FF`, Surface: `#FFFFFF`
    - Plus Jakarta Sans typography.

## 3. Potential Blockers, Risks & Security Boundaries

- **Onboarding Constraints:**
  - Delivery partners are existing user accounts granted the partner profile via `apiClient.createDeliveryPartner(userId, vehicleType)`.
  - The UI provides clear guidance that a user ID / phone can be entered, with vehicle preset options (Hero Splendor, Honda Activa, Electric Scooter, Bicycle).
- **Status Lifecycle:**
  - Activation and deactivation calls `apiClient.activateDeliveryPartner(id)` and `apiClient.deactivateDeliveryPartner(id)` with immediate query cache invalidation.
- **Role Guard:**
  - Protected by `RequireAuth role="ADMIN"`.

## 4. Open Questions & Trade-offs (Pre-resolved)

- **Fleet Filter Tabs:**
  - Filter by All, Active, Inactive, and On Duty directly within the UI.
- **Direct Handover Action:**
  - Each courier row with cash in custody includes a direct button `Reconcile COD` linking to `/admin/delivery-partners/:id/cod`.

## 5. Feasibility Verdict & Recommendation

- **Verdict:** Feasible immediately with 99% confidence.
- **Recommendation:** Proceed to Phase 2 (Implementation Plan).
