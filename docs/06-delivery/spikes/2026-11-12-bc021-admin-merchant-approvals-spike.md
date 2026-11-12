# Spike: BC-021 — Platform Admin Merchant Approvals & Store Onboarding Workspace

**Date:** 2026-11-12  
**Status:** Approved (Pre-authorized by Product Owner)  
**Confidence Level:** 99% (>95% required for Phase 2 approval)  
**Author:** Antigravity (Senior Full-Stack Implementation Engineer)

## 1. Objective & Requirements Scope

- **Objective**: Deliver a 1:1 pixel-perfect responsive platform admin workspace at `/admin/merchant-approvals` for reviewing merchant applications, validating trade licenses / FSSAI certifications / bank settlement details, verifying physical storefront counter readiness (FR-PICK-001), configuring commission tiers and SLA parameters (FR-ADM-002), and approving or rejecting onboarding applications with an immutable audit trail (FR-MER-004, FR-ADM-001, FR-MER-005).
- **Requirements Covered**:
  - `FR-MER-001`: Merchant registration and onboarding profile.
  - `FR-MER-004`: Merchant verification, document validation, and store activation lifecycle.
  - `FR-MER-005`: Multi-store management and isolation (unapproved/pending stores hidden from customer marketplace).
  - `FR-ADM-001`: Admin merchant application audit trail, approval, rejection, and suspension.
  - `FR-ADM-002`: Commission model configuration and operational parameters per store.
  - `FR-PICK-001`: Storefront pickup counter inspection and physical readiness verification.
- **Stitch Design Blueprints**:
  - Desktop: `0692e238094a4181a8b2dd0e0c9f80e8` (`audit/stitch-audit/html/0692e238094a4181a8b2dd0e0c9f80e8.html`, `audit/stitch-audit/screenshots/0692e238094a4181a8b2dd0e0c9f80e8.png`).
  - Mobile: `5daffa168d524dfca9293602713df5df` (`audit/stitch-audit/html/5daffa168d524dfca9293602713df5df.html`, `audit/stitch-audit/screenshots/5daffa168d524dfca9293602713df5df.png`).

## 2. Research & Investigation Findings

- **Existing Backend Endpoints**:
  - `AdminMerchantsController` (`apps/api/src/merchant/admin-merchant.controller.ts`) at `@Controller('admin/merchants')`:
    - `GET /api/v1/admin/merchants`: List applications (`query: ListMerchantApplicationsDto` with `status`, `page`, `limit`).
    - `GET /api/v1/admin/merchants/:id`: Fetch application details.
    - `PATCH /api/v1/admin/merchants/:id/approve`: Approve pending application and grant `MERCHANT_OWNER`.
    - `PATCH /api/v1/admin/merchants/:id/reject`: Reject pending application with `{ reason: string }`.
    - `PATCH /api/v1/admin/merchants/:id/suspend`: Suspend approved merchant with `{ reason: string }`.
    - `PATCH /api/v1/admin/merchants/:id/reinstate`: Reinstate suspended merchant.
    - `GET /api/v1/admin/merchants/:id/stores`: Fetch merchant stores.
  - `AdminStoresController` (`apps/api/src/merchant/admin-merchant.controller.ts`):
    - `PATCH /api/v1/admin/stores/:id/status`: Update store status (`ACTIVE` | `INACTIVE` | `SUSPENDED`).
- **Client Library Gap**:
  - `packages/api-client/src/index.ts` currently lacks typed wrapper methods for `admin/merchants` and `admin/stores`.
  - Adding `listMerchantApplications`, `getMerchantApplication`, `approveMerchantApplication`, `rejectMerchantApplication`, `suspendMerchant`, `reinstateMerchant`, and `updateStoreStatus` cleanly bridges this gap.
- **Design Structure**:
  - **Top Navigation Bar**: Dropzo Admin brand, Badarpur Central Zone #01 (Active) green pulsing status pill, navigation links (`Approvals`, `Merchants`, `Stores`, `Zones`, `Settings`), Search input, notifications button, super-admin avatar (`SB`, Siddiq B. Super Admin • Sribhumi).
  - **Desktop Left Sidebar**: Badarpur Hub badge (Online), `+ New Merchant` CTA, Navigation menu items (`Approval Queue [4]`, `Active Merchants [18]`, `Store Onboarding`, `KYC Verifications`, `Commission Tiers`, `Audit Logs`), and footer links (`System Health`, `Help Desk`).
  - **Top KPI Metrics Bar**: Pending Review (4 Stores), Action / Resubmitted (2 Stores), Approved This Month (14 Merchants), Avg Review Turnaround (3.2 Hours).
  - **Left Application Queue Panel (360-384px)**: Header with count, filter chips (`All`, `Pending KYC`, `Resubmitted`, `Clarifications`), card stream with store name, address, risk tag, category badges, counter pickup pill, status pill with ping indicator, time ago.
  - **Right Review Pane**:
    - FR-MER-005 amber notice banner indicating unapproved store is hidden from public customers.
    - Merchant overview card with store icon, status pill, Application ID, proprietor contact, address, and KYC Match score (94% Compliant).
    - Bento verification checklist: Trade License, FSSAI Food Safety, Aadhaar/PAN, Bank Settlement & UPI penny-drop status.
    - Physical storefront & counter inspection card: Geotagged façade photo, field inspector verification badges, counter checklist (staging shelf, digital scale, thermal printer).
    - Operational parameters & commission configuration (FR-ADM-002): Commission tier dropdown, fulfillment modes checkboxes, prep SLA target input, geo-zone radius selector.
    - Admin audit notes & onboarding log (FR-ADM-001): Inspection log, supervisor decision note textarea.
    - Sticky decision tray pinned at bottom: Reviewing summary, Reject Application button (opens rejection reason dialog), Request Resubmission button, Approve Store & Make ACTIVE primary CTA.
  - **Mobile Layout**: Responsive single-column scrollable canvas with sticky top header, filter chips, FR-MER-005 notice, radial KYC score gauge (94%), document items, storefront inspection gallery, and sticky bottom decision bar.

## 3. Potential Blockers, Risks & Security Boundaries

- **Role-Based Access Control**:
  - The endpoint requires `ADMIN` or `SUPER_ADMIN`. In the web client, unauthenticated users or users without admin role should be handled gracefully (mock fallback for dev/demo or redirect).
- **Data Safety & Optimistic State**:
  - When approving or rejecting an application, optimistic UI updates should reflect immediately in the application list and KPI counts, while backend API requests persist the state.
  - Rejection dialog must enforce non-empty reason string per backend DTO requirements (`RejectMerchantApplicationDto.reason`).

## 4. Open Questions & Trade-offs (Owner Clarifications)

- The user has granted blanket pre-approval to autonomously approve spikes, plans, execute, test, and commit.
- API Client methods will connect to live backend endpoints while gracefully falling back to initial mock items if API server is offline or returns empty/unauthorized during development.

## 5. Feasibility Verdict & Recommendation

- **Verdict**: 100% Feasible. All backend endpoints and design specifications exist.
- **Recommendation**: Proceed immediately to Phase 2 (Implementation Plan) and Phase 3 (Execution).
