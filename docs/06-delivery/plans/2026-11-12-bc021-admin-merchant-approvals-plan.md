# Implementation plan: BC-021 — Platform Admin Merchant Approvals & Store Onboarding Workspace

## Scope

This task implements the 1:1 responsive platform admin merchant approvals and store onboarding workspace at route `/admin/merchant-approvals` corresponding to Stitch blueprints `0692e238094a4181a8b2dd0e0c9f80e8` (desktop) and `5daffa168d524dfca9293602713df5df` (mobile).

**In Scope**:
- Extend `@dropzo/api-client` with typed admin merchant methods: `listMerchantApplications`, `getMerchantApplication`, `approveMerchantApplication`, `rejectMerchantApplication`, `suspendMerchant`, `reinstateMerchant`, and `updateStoreStatus`.
- Implement `apps/web/src/routes/admin/AdminMerchantApprovalsPage.tsx`:
  - Top Admin Header with Badarpur Central Zone #01 pill, navigation links, search, notifications, and super-admin profile pill.
  - Desktop Left Sidebar with Badarpur Hub status, "+ New Merchant" CTA, navigation tabs with counts, system health & help desk.
  - Header & Glanceable KPI bar (Pending Review, Resubmitted, Approved, Avg Turnaround).
  - Left Panel: Application Pipeline Queue stream with filter tabs (`All`, `Pending KYC`, `Resubmitted`, `Clarifications`), risk chips, tags, status indicator, and selection state.
  - Right Detail Review Canvas:
    - FR-MER-005 Protection notice banner (hidden storefront alert).
    - Merchant overview card with store icon, status pill, Application ID, proprietor contact, address, and KYC match score.
    - Bento compliance checklist: Trade License, FSSAI Food Safety, Aadhaar/PAN, Bank Settlement & UPI verification status.
    - Physical Storefront & Pickup Counter inspection card: Geotagged façade photo, field inspector badge, counter staging shelf, scale, printer checks.
    - Operational Parameters & Commission Config (FR-ADM-002): Commission model dropdown, fulfillment mode checkboxes, prep time SLA input, geo-zone radius selector.
    - Admin Audit Notes & Log (FR-ADM-001): Audit history trail and supervisor decision note textarea.
    - Sticky Decision Tray: Reviewing target info, Reject Application button (with modal for mandatory rejection reason), Request Resubmission button, and Approve Store & Make ACTIVE button.
  - Responsive Mobile Adaptations: Single-column layout with radial KYC match meter, checklist cards, photo inspection gallery, and sticky bottom action bar.
- Register route `/admin/merchant-approvals` in `apps/web/src/App.tsx`.
- Create comprehensive unit & integration tests in `apps/web/src/routes/admin/AdminMerchantApprovalsPage.test.tsx`.
- Synchronize documentation (`TASK-TRACKER.md` and `PROGRESS.md`).

**Explicitly Out of Scope**:
- Modifying backend database schemas or creating migrations (all database tables and controllers were implemented in BC-006).
- Creating other admin routes (`/admin/delivery-queue` belongs to BC-024).

## Files/modules affected

- `packages/api-client/src/index.ts`: Add `MerchantApplication` interfaces and admin merchant client methods.
- `apps/web/src/routes/admin/AdminMerchantApprovalsPage.tsx`: New component.
- `apps/web/src/routes/admin/AdminMerchantApprovalsPage.test.tsx`: New unit & integration test suite.
- `apps/web/src/App.tsx`: Register `/admin/merchant-approvals` route.
- `docs/06-delivery/TASK-TRACKER.md`: Mark BC-021 Done.
- `docs/06-delivery/PROGRESS.md`: Record verification results.

## Steps

1. **API Client Extension**: Add `MerchantApplication` interface, `ListMerchantApplicationsParams`, and API client methods `listMerchantApplications`, `getMerchantApplication`, `approveMerchantApplication`, `rejectMerchantApplication`, `suspendMerchant`, `reinstateMerchant`, `updateStoreStatus`.
2. **Page Implementation**: Implement `AdminMerchantApprovalsPage.tsx` using Dropzo theme tokens, styled-components, and full Stitch visual fidelity.
3. **Modal & Microinteractions**: Implement rejection reason dialog, resubmission alert, and approval confirmation with feedback toast.
4. **App Routing**: Wire `/admin/merchant-approvals` in `App.tsx`.
5. **Testing**: Write unit/integration tests verifying KPI rendering, application list selection, filter chips, rejection modal, approval interaction, and API client fallback.
6. **Verification**: Run `npm run test`, `npm run typecheck`, and `npm run lint`.
7. **Docs & Commit**: Update `TASK-TRACKER.md` and `PROGRESS.md`, commit with message `feat(web): implement 1:1 responsive platform admin merchant approvals workspace (BC-021)`.

## Risks / open questions

- *Risk*: Backend may not be running during frontend tests.
  - *Mitigation*: Fallback to initial mock applications in the component when API requests fail or during isolated testing, and mock the API client in unit tests.

## Database changes (if any)

None. Backend endpoints already exist in `apps/api/src/merchant/admin-merchant.controller.ts`.

## Test plan

- Test KPI metrics rendering (Pending Review: 4 Stores, Resubmitted: 2, etc.).
- Test filtering application cards via filter chips (`All`, `Pending KYC`, `Resubmitted`).
- Test selecting an application from the queue updates the review pane with that merchant's details.
- Test rejection button opens the rejection reason modal and rejects with valid reason.
- Test approval button invokes `approveMerchantApplication` and updates store status to `ACTIVE`.

## Documentation to update after implementation

- `docs/06-delivery/TASK-TRACKER.md`
- `docs/06-delivery/PROGRESS.md`
