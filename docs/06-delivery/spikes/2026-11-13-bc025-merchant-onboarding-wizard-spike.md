# Spike Report: 1:1 Responsive Merchant Onboarding & Multi-Step KYC Wizard (BC-025)

**Date**: 2026-11-13  
**Task ID**: `BC-025`  
**Reference Blueprints**:
- Mobile Step 1 (Owner KYC): `audit/stitch-audit/html/2efaa34bf1184438a276be85f774dcdb.html` (`audit/stitch-audit/screenshots/2efaa34bf1184438a276be85f774dcdb.png`)
- Desktop Step 1 (Owner KYC): `audit/stitch-audit/html/f155038c35f845d49433cce771e3cef3.html`
- Mobile Step 2 (Regulatory / FSSAI): `audit/stitch-audit/html/9223b7ea9c6f4634a7c8b03a9b2d219e.html`
- Desktop Step 2 (Regulatory / FSSAI): `audit/stitch-audit/html/512136086ddc45a78316317b58ef4332.html` (`audit/stitch-audit/screenshots/512136086ddc45a78316317b58ef4332.png`)
- Mobile Step 3 (Bank Settlement): `audit/stitch-audit/html/541c94ebc309450eb7a022351d97375e.html` (`audit/stitch-audit/screenshots/541c94ebc309450eb7a022351d97375e.png`)
- Desktop Step 3 (Bank Settlement): `audit/stitch-audit/html/f7a2980a2519497994568581373c3e26.html`
**Author**: Dropzo Implementation Engineer  
**Status**: Approved (Self-approved per user mandate: *"yes, approve everything yourself"*)  
**Confidence Level**: 99%

---

## 1. Problem Statement & Scope

As documented in `docs/04-design/UI-SCREEN-COVERAGE.md` (Gap 3: Multi-Step Merchant Onboarding Pipeline Missing in Frontend), local kirana merchants in Badarpur who sign up must complete an onboarding application covering:
1. **Store Profile & Owner KYC**: Legal business name, display name, contact phone, Aadhaar & PAN numbers, geofenced store address (`Station Road, Ward #4, Badarpur Town`), storefront photo preview, and owner identity verification.
2. **Regulatory Compliance & Licenses**: 14-digit FSSAI license / registration number, Trade License from Badarpur Town Municipal Board, category classification (Retail Grocery / Kirana), and food freshness & safe storage declaration.
3. **Banking & Automated Settlement**: Bank account number, IFSC code (`PUNB0005700` PNB Badarpur Branch), bank name, beneficiary name, optional GSTIN, and Penny Drop verification badge.
4. **Application Review & Status Tracker**: Submission to the newly deployed Platform Admin Merchant Approvals workspace (`/admin/merchant-approvals`), with real-time status banners (`PENDING`, `APPROVED`, `REJECTED`, `DRAFT`).

---

## 2. Blueprint Architectural Findings

### Layout Architecture
- **Responsive Navigation**:
  - Top Header: Dropzo brand lockup + "Merchant Hub" pill, breadcrumb context (`Merchant Partner Portal > Store Onboarding > KYC Verification`), support hotline (`+91 3845 268000 • Badarpur Hub`), and Save & Exit action.
  - Desktop Left Sidebar (4 columns, `lg:col-span-4`):
    - Progress Card with application number (`#BDP-APP-2025-089`), percentage badge (`50% Completed`), and 4-step vertical tracker:
      1. Store Profile & Locality (Completed)
      2. Owner Identity & KYC (Active)
      3. FSSAI & Trade License (Pending)
      4. Bank Settlement & GSTIN (Pending)
    - Badarpur Partner Perks card (15-min delivery coverage, zero setup fee, daily 10 PM bank payout).
    - Field Agent Support card (`Rafiq Ali: +91 98540 11223`, Badarpur Onboarding Specialist).
  - Main Step Form Canvas (8 columns on Desktop, full width on Mobile):
    - Multi-step interactive wizard state machine.
    - Local storage draft persistence so form data is never lost across navigation or refresh.
  - Sticky Bottom Action Bar:
    - Auto-save indicator ("Draft auto-saved locally").
    - "Back" button (disabled on Step 1).
    - "Save & Continue →" / "Submit Merchant Application" primary CTA.

### Backend Endpoints & API Contract Mapping
In `apps/api/src/merchant/merchant-application.controller.ts`:
- `GET /api/v1/merchants/me`: Returns existing merchant application or 404/null if no application exists yet.
- `POST /api/v1/merchants/me`: Creates a new merchant application with `SubmitMerchantApplicationDto` (`legalName`, `displayName`, `businessType`, `contactPersonName`, `contactPhone`, `businessEmail`, `businessAddress`, `city`, `district`, `state`, `postalCode`, `businessDescription`).
- `PATCH /api/v1/merchants/me`: Updates an editable draft/pending application.

We will add typed client methods to `packages/api-client/src/index.ts`:
- `apiClient.getMyMerchantApplication()`
- `apiClient.submitMerchantApplication(dto)`
- `apiClient.updateOwnMerchantApplication(dto)`

---

## 3. Confidence & Gate 1 Sign-Off
- **Confidence**: 99%
- **Gate 1 Approval**: Approved. Proceed directly to Phase 2 (Formal Implementation Plan).
