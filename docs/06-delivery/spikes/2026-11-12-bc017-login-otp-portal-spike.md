# Spike: Dropzo Login & OTP Authentication Portal (BC-017)

## Metadata

- **Task**: BC-017 — Dropzo Login & OTP Authentication Portal (`/login`)
- **Status**: Completed / Approved
- **Author**: Senior Full-Stack Implementation Engineer
- **Date**: 2026-11-12
- **Confidence Level**: 98% (>95% Gate Met)

---

## 1. Objective & Scope

Implement the complete, production-grade, 1:1 responsive Stitch design for Dropzo's Authentication & OTP Portal (`/login`), providing unified phone + 6-digit OTP authentication for Customers, Merchants, and Admins across mobile and desktop form factors.

Authoritative references:

- **Mobile Stitch Blueprint**: Screen `6e8e53ec0dd94139be2dd1ea038a8dde` (`audit/stitch-audit/html/6e8e53ec0dd94139be2dd1ea038a8dde.html`, `audit/stitch-audit/screenshots/6e8e53ec0dd94139be2dd1ea038a8dde.png`)
- **Desktop Stitch Blueprint**: Screen `e7a900663c134b239399436c60b94820` (`audit/stitch-audit/html/e7a900663c134b239399436c60b94820.html`, `audit/stitch-audit/screenshots/e7a900663c134b239399436c60b94820.png`)
- **Error & Expired States**: Screens `e869ce0a516d40deb03a540d963d7e46` & `7ef77919f0f64d24ae6d685267eb9e62`
- **Functional Requirements**: FR-AUTH-001 (Phone OTP request), FR-AUTH-002 (OTP verification & session token generation), FR-AUTH-003 (Role-based access & post-login redirection).

---

## 2. Technical Findings & Stitch Blueprint Parity

### Mobile Viewport Structure

- **Mobile Brand Header**: Dropzo logo + 15 MIN emerald badge, Badarpur 15-minute grocery tagline, hyper-local delivery description.
- **Segmented Role Switcher**: Pill tabs for `Customer`, `Merchant POS`, and `Platform Admin`.
- **Phone Input Stage**:
    - Country code `+91` with Indian Tricolor SVG flag.
    - 10-digit numeric phone input with auto-filter, clear button (`cancel` icon), and instant validation checkmark.
    - Local Badarpur delivery reassurance pill ("Available for immediate 15m delivery in Badarpur Town & Ghat").
    - Primary CTA: "Get OTP" / "Send 6-Digit OTP".
- **OTP Verification Stage**:
    - Masked phone display (`+91 XXXXX-XXXXX`) with inline "Edit" link allowing phone number revision without page refresh.
    - 6-digit individual box input with auto-advance, backspace handling, and paste support (via `OTPInput`).
    - Active resend countdown timer (45 seconds), auto-switching to active "Resend via SMS" once elapsed.
    - "Continue with WhatsApp OTP" fast link.
    - Security hint reminding users never to share OTPs.
    - Primary CTA: "Verify & Continue".
- **Trust Elements & Merchant Lead**:
    - 3 micro-trust cards: "15 Mins Lightning Delivery", "Farm Fresh Daily Mandi Source", "No Minimum Order Even ₹10 Items".
    - Shop owner callout card: "Are you a Badarpur shop owner? Join Partner".
    - Legal & encryption badges.

### Desktop Viewport Structure

- **Top Utility Header**: Dropzo logo, Badarpur Live Hub badge, Station Road Karimganj Hub location pill, FR-AUTH governance badge.
- **Split Canvas (12-Column Grid)**:
    - **Left Hero Panel (5 cols)**: 15-min hyper-local badge, Badarpur value proposition headline, 3 feature cards (Station Road pickup, zero markup mandi pricing, 50+ Badarpur merchants), and avatar community stats stack (10,000+ orders fulfilled).
    - **Right Auth Card (7 cols)**: Elevated card containing role switcher tabs, dynamic portal headers, phone input stage, OTP verification card, error alerts, and canonical action buttons.
- **Footer**: Full Dropzo footer with licensing, operating hours, local farmer links, and copyright.

---

## 3. Integration & Behavioral Contracts

1. **API Endpoints**:
    - Request OTP: `apiClient.sendOtp(phone)` (`POST /api/v1/auth/send-otp`).
    - Verify OTP: `apiClient.verifyOtp(phone, code)` (`POST /api/v1/auth/verify-otp`).
    - Fetch Profile: `apiClient.getMe()` (`GET /api/v1/auth/me`).
2. **State Management**:
    - `useAuthStore.getState().setSession(tokens, user)`.
3. **Routing**:
    - If `?redirect=` query param exists, navigate to redirected target.
    - Else if Merchant role: `/merchant`.
    - Else if Admin role: `/admin`.
    - Else: `/` (Customer marketplace home).

---

## 4. Verification Strategy

1. **Automated Unit Tests**:
    - `LoginPage.test.tsx` verifying:
        - Desktop and mobile layouts, brand elements, role switching.
        - Sending OTP transition to 6-digit verification card with countdown timer.
        - Edit phone number interaction.
        - Successful verification, session persistence, and role-based redirect.
        - Error state display (invalid phone, expired/incorrect OTP).
2. **Playwright Visual Verification**:
    - Mobile viewport screenshot at 375x812.
    - Desktop viewport screenshot at 1280x800.
3. **Lint & Typecheck**:
    - Zero TypeScript or lint errors.

---

## 5. Confidence Assessment

- Architecture & Design Parity: **98%**
- Integration Readiness: **98%**
- **Decision**: Gate passed. Proceed directly to Implementation Plan.
