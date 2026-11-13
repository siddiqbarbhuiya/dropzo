# Implementation Plan: 1:1 Responsive Merchant Onboarding & Multi-Step KYC Wizard (BC-025)

**Date**: 2026-11-13  
**Task ID**: `BC-025`  
**Reference Spike**: `docs/06-delivery/spikes/2026-11-13-bc025-merchant-onboarding-wizard-spike.md`  
**Status**: Approved (Self-approved per user mandate: *"yes, approve everything yourself"*)  

---

## 1. Overview & Scope

Implement the comprehensive 4-step Merchant Onboarding Wizard screen (`apps/web/src/routes/merchant/MerchantOnboardingPage.tsx`) matching Stitch blueprints `#6`, `#8`, `#20`, `#34`, `#35`, `#36`:
- Route: `/merchant/onboarding`
- Full 1:1 responsive layout for both Desktop and Mobile viewports.
- Step 1: Store Profile & Owner KYC (Aadhaar, PAN, storefront photo preview, geofence address).
- Step 2: Regulatory Compliance (14-digit FSSAI, Badarpur Town Municipal Board Trade License, storage declaration).
- Step 3: Bank Settlement & GSTIN (Account number, IFSC `PUNB0005700`, Penny Drop instant check, GSTIN).
- Step 4: Final Review & Submission, wired to `apiClient.submitMerchantApplication`.
- Real-time status tracker (Draft, Pending Review, Approved with link to Store POS, Rejected with reason and resubmit).

---

## 2. Technical Steps & Architecture

### Task 1: Update `@dropzo/api-client`
Add applicant-facing methods to `packages/api-client/src/index.ts`:
- `getMyMerchantApplication()` -> `GET /merchants/me`
- `submitMerchantApplication(dto)` -> `POST /merchants/me`
- `updateOwnMerchantApplication(dto)` -> `PATCH /merchants/me`

### Task 2: Create `MerchantOnboardingPage.tsx`
- File: `apps/web/src/routes/merchant/MerchantOnboardingPage.tsx`
- Layout:
  - Header: Dropzo logo, "Merchant Hub" badge, breadcrumb stepper, Badarpur Hub support hotline (`+91 3845 268000`), Save & Exit action.
  - Left Sidebar (Desktop): Stepper progress card, 4-step vertical progress indicator, Badarpur perks callout, and local onboarding specialist card (`Rafiq Ali: +91 98540 11223`).
  - Mobile Stepper: Horizontal segmented step bar with current step chip.
  - Main Canvas: Step 1, Step 2, Step 3, Step 4 form cards with validation and input formatters.
  - Sticky Bottom Action Bar: Draft saved indicator, Back button, and Continue / Submit CTA.

### Task 3: Route Registration in `apps/web/src/App.tsx`
Add route:
```tsx
<Route
    path="/merchant/onboarding"
    element={
        <RequireAuth allowedRoles={['MERCHANT', 'ADMIN']}>
            <MerchantOnboardingPage />
        </RequireAuth>
    }
/>
```

### Task 4: Unit & Integration Tests
File: `apps/web/src/routes/merchant/MerchantOnboardingPage.test.tsx`
- Test 1: Renders onboarding header, stepper, application info, and Step 1 form fields.
- Test 2: Advances through steps (Step 1 -> Step 2 -> Step 3 -> Step 4) and validates mandatory inputs.
- Test 3: Submits the application and displays the "Application Submitted for Badarpur Hub Verification" success banner.
- Test 4: Renders application status when existing application is loaded (e.g. PENDING or REJECTED with reason).

### Task 5: Verification Suite & Git Commit
- `npm run test -w @dropzo/web -- MerchantOnboardingPage`
- `npm run typecheck -w @dropzo/web`
- `npm run lint -w @dropzo/web`
- `npm run build -w @dropzo/web`
- Full test suite execution.
- Update `TASK-TRACKER.md` and `PROGRESS.md`.
- Git commit.

---

## 3. Gate 2 Sign-Off
Approved. Proceed to Phase 3 Execution.
