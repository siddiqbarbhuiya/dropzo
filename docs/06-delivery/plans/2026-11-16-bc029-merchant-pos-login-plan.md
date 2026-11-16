# Implementation Plan: BC-029 — Dropzo Merchant POS Dedicated Login & OTP Authentication Portal

**Date:** 2026-11-16  
**Author:** Antigravity (Implementation Engineer)  
**Status:** Approved (Pre-authorized autonomous execution pipeline)  
**Task ID:** BC-029  
**Route:** `/merchant/login`  
**Stitch Designs:** Desktop `60651de42d4a4ad7b6cc0276be87c44a` / Mobile `3356568780464f91b971a22c5a4a461a`

---

## 1. Scope & Objective

Implement a responsive, dedicated **Merchant POS Login & OTP Portal** at `/merchant/login` in `apps/web`.

### Key Features:

- **Top Navigation Bar**: Dropzo Merchant POS logo, Badarpur Hub Live badge (`PIN 788806`), Terminal Grid Active indicator, and Hub Desk direct hotline (`+91 3843 268 000`).
- **Left Feature Showcase**:
    - Headline: "Fast Counter Fulfillment & Daily Settlement Portal for Badarpur Merchants".
    - 3 feature bento cards:
        1. _Counter Order Chime_ (< 42s SLA acknowledgement)
        2. _FR-PICK-001 Verification_ (4-digit / 6-digit PIN confirmation before item handoff)
        3. _Automated Reconciliation_ (T+1 unified UPI & COD balance clearing)
    - Badarpur Station merchant trust badge (Maa Tara Groceries and 48+ Sribhumi partners online).
- **Right Interactive Auth Card**:
    - Role switcher segmented control (`Customer`, `Merchant POS` [active], `Platform Admin`).
    - Terminal Identity badge (`Verified Badarpur Hub Partner Store • Terminal #BDP-089`).
    - Step 1: Phone number entry (+91 94351 XXXXX) with clear input button, SMS Gateway Active badge, and "Continue to Store POS →" action wired to `apiClient.sendOtp`.
    - Step 2: 6-Digit Counter OTP verification with individual digit boxes, countdown timer (0:45), Resend via SMS action, and "Verify & Open Counter POS →" CTA wired to `apiClient.verifyOtp`.
    - Secondary verification: "Get OTP on WhatsApp Business (Instant)" option.
    - Security hint: "256-bit encrypted authentication. Verified by Dropzo Badarpur Dispatch Station."
    - Footer link: "New store in Badarpur or Karimganj? Apply for Dropzo Merchant Partnership →" linking to `/merchant/onboarding`.
- **Global Footer**: Copyright, Badarpur Junction Local Fulfillment Hub notice, Merchant Terms, Commission Policy, POS Terminal Help, and build version (`v2.4.12-rc`).

---

## 2. File Changes

### Files to Create:

1. `apps/web/src/routes/merchant/MerchantLoginPage.tsx`
2. `apps/web/src/routes/merchant/MerchantLoginPage.test.tsx`

### Files to Modify:

1. `apps/web/src/App.tsx` (register `/merchant/login` route)
2. `docs/06-delivery/TASK-TRACKER.md` (add BC-029 entry)
3. `docs/06-delivery/PROGRESS.md` (append BC-029 completion)

---

## 3. Test Specifications

File: `apps/web/src/routes/merchant/MerchantLoginPage.test.tsx`

- **Test 1**: Renders header with Badarpur Hub Live status, feature showcase, and role switcher tabs.
- **Test 2**: Allows typing phone number, clears input on clear button, and submits Step 1 to call `apiClient.sendOtp`.
- **Test 3**: Renders Step 2 6-digit OTP inputs, countdown timer, and calls `apiClient.verifyOtp` to log in and navigate to `/merchant/orders`.
- **Test 4**: Handles role tab switching to Customer and Platform Admin.

---

## 4. Execution Steps

1. Create `apps/web/src/routes/merchant/MerchantLoginPage.tsx`.
2. Register `/merchant/login` in `apps/web/src/App.tsx`.
3. Create `apps/web/src/routes/merchant/MerchantLoginPage.test.tsx`.
4. Run vitest for `MerchantLoginPage`.
5. Run full typecheck, lint, and test suite.
6. Run live Playwright verification on desktop (1280x800) and mobile (390x844).
7. Sync documentation and commit.
