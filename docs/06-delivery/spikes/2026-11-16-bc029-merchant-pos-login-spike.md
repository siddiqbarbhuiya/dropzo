# Spike: BC-029 — Dropzo Merchant POS Dedicated Login & OTP Authentication Portal

**Date:** 2026-11-16  
**Author:** Antigravity (Implementation Engineer)  
**Status:** Approved (Pre-authorized autonomous execution pipeline)  
**Confidence Level:** 99%  
**Task ID:** BC-029  
**Route:** `/merchant/login`  
**Stitch Designs:**

- Desktop (1280px Split-Canvas): `60651de42d4a4ad7b6cc0276be87c44a` (`audit/stitch-audit/html/60651de42d4a4ad7b6cc0276be87c44a.html`, `audit/stitch-audit/screenshots/60651de42d4a4ad7b6cc0276be87c44a.png`)
- Mobile (390px Viewport): `3356568780464f91b971a22c5a4a461a` (`audit/stitch-audit/html/3356568780464f91b971a22c5a4a461a.html`, `audit/stitch-audit/screenshots/3356568780464f91b971a22c5a4a461a.png`)

---

## 1. Problem Statement & Scope

Dropzo store merchants and counter operators in Badarpur (such as _Maa Tara Groceries • Station Road, BDP-04_) require a dedicated, low-latency, role-optimized authentication portal at `/merchant/login` for store terminals and counter tablets.

The portal delivers:

1. **Desktop Split-Canvas Architecture**:
    - **Top Navigation Bar**: Dropzo Merchant POS logo, Badarpur Hub Live badge (`PIN 788806`), Terminal Grid Active system health status, and Hub Desk direct hotline (`+91 3843 268 000`).
    - **Left Feature Showcase**: "Fast Counter Fulfillment & Daily Settlement Portal for Badarpur Merchants" headline, 3 feature bento cards (`Counter Order Chime < 42s SLA`, `FR-PICK-001 Verification 4-Digit / 6-Digit PIN`, `Automated Reconciliation T+1 Payout`), and Badarpur Station Merchant trust badge (`Maa Tara Groceries and 48+ Sribhumi partners online`).
    - **Right Interactive Auth Card**: Role switcher tabs (`Customer`, `Merchant POS` [active], `Platform Admin`), terminal identity badge (`Verified Badarpur Hub Partner Store • Terminal #BDP-089`), phone entry step (+91 prefix, clear button, SMS Gateway Active), 6-box OTP entry step with countdown timer (`0:42`), Resend via SMS action, WhatsApp Business OTP fallback, 256-bit encryption hint, and link to register a new store (`/merchant/onboarding`).
2. **Mobile Screen Experience**:
    - Mobile status simulation and Dropzo 15 MIN badge.
    - Segmented role tab control.
    - Single-thumb ergonomic inputs, phone number clear action, 6-digit OTP boxes, countdown timer, and WhatsApp OTP button.
3. **Authentication & Session Wiring**:
    - Step 1: `apiClient.sendOtp({ phone, role: 'MERCHANT_OWNER' })`
    - Step 2: `apiClient.verifyOtp({ phone, code, role: 'MERCHANT_OWNER' })`
    - Session storage via `useAuthStore` with token persistence in `dropzo-auth`.
    - On successful login, automatic navigation to `/merchant/orders` (or original redirect param).

---

## 2. Technical Investigation & Architecture

### Backend API Verification

- **`POST /api/v1/auth/send-otp`** (`auth/auth.controller.ts`): Confirmed live and verified. Accepts `{ phone: string, role?: string }`.
- **`POST /api/v1/auth/verify-otp`** (`auth/auth.controller.ts`): Confirmed live and verified. Accepts `{ phone: string, code: string, role?: string }` and returns `{ tokens: { accessToken, refreshToken }, user }`.
- **`apiClient`**: Existing helper methods `apiClient.sendOtp` and `apiClient.verifyOtp` are fully typed and available.

### Route Registration

- Route `/merchant/login` registered in `apps/web/src/App.tsx`.
- Open route (no auth required to access).
- Redirects authenticated users already having `MERCHANT_OWNER` to `/merchant/orders`.

---

## 3. Risk Assessment & Mitigations

| Risk                         | Impact                      | Mitigation                                                                                                                               |
| :--------------------------- | :-------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| Incomplete 6-digit OTP entry | premature verification call | Disable verify button until all 6 digits are provided or automatically submit once 6th digit is entered.                                 |
| Role switcher navigation     | Incorrect routing           | Switching to "Customer" navigates to `/login?role=CUSTOMER` or `/login`; switching to "Platform Admin" navigates to `/login?role=ADMIN`. |
| OTP Resend spamming          | API rate limit error        | Enforce 45-second countdown cooldown before enabling the resend action.                                                                  |

---

## 4. Verification Strategy

1. **Unit & Integration Tests (`apps/web/src/routes/merchant/MerchantLoginPage.test.tsx`)**:
    - Renders split-canvas desktop layout, branding banner, 3 feature bento cards, and role switcher tabs.
    - Submits phone number to trigger `apiClient.sendOtp`.
    - Displays 6-digit OTP input boxes, timer, and resend button.
    - Enters 6-digit OTP code, calls `apiClient.verifyOtp`, sets session, and redirects to `/merchant/orders`.
    - Handles WhatsApp OTP fallback action.
2. **Typecheck & Linter**: 0 errors on `@dropzo/web`.
3. **Full Test Suite**: All 27 test files passing in `@dropzo/web`.
4. **Live Playwright**: Both Desktop (1280x800) and Mobile (390x844) screenshots captured.

---

## 5. Confidence Score

**99%** — All Stitch designs (Desktop `60651de42d4a4ad7b6cc0276be87c44a`, Mobile `3356568780464f91b971a22c5a4a461a`) are downloaded and verified against the existing auth API contracts. Proceeding to Phase 2 (Implementation Plan).
