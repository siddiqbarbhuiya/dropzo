# Implementation Plan: Dropzo Login & OTP Authentication Portal (BC-017)

## Metadata

- **Task**: BC-017 — Dropzo Login & OTP Authentication Portal (`/login`)
- **Status**: Approved (Self-approved per user authorization)
- **Author**: Senior Full-Stack Implementation Engineer
- **Date**: 2026-11-12

---

## 1. Objectives

Refactor and enhance `apps/web/src/routes/LoginPage.tsx` and its test suite `LoginPage.test.tsx` to achieve 100% visual and behavioral fidelity to Stitch Mobile `6e8e53ec0dd94139be2dd1ea038a8dde` and Desktop `e7a900663c134b239399436c60b94820`:

1. Ensure responsive viewport adaptation:
    - On Mobile: Hide left hero panel from the top of the viewport; show the mobile brand badge and headline above the card; render bottom trust badges ("15 Mins", "Farm Fresh", "No Minimum") and shop owner callout card.
    - On Desktop: Display the complete 12-column split canvas with Left Hero branding panel (5 cols) and Right Auth Card (7 cols).
2. Wire interactive controls:
    - Phone input clear button (`cancel` icon) when phone is non-empty.
    - Edit phone link in OTP verification step returning user to phone input.
    - Active countdown timer (45s) enabling "Resend via SMS" button upon completion.
    - WhatsApp OTP alternate action with notification/dispatch feedback.
    - Role switching updating portal headers, icons, and redirect destinations.
3. Verify comprehensive test coverage and visual rendering via Playwright.

---

## 2. File Modifications

- Modify: `apps/web/src/routes/LoginPage.tsx`
    - Responsive conditional styles for mobile header vs desktop split canvas.
    - Clear button on phone input field.
    - Edit phone button in OTP card.
    - Bottom trust badges grid on mobile.
    - WhatsApp CTA and merchant callout banner.
- Modify: `apps/web/src/routes/LoginPage.test.tsx`
    - Test role switching, phone input clear, OTP edit number, countdown timer, resend button, and error display.

---

## 3. Verification Criteria

1. Unit tests pass: `npm run test -w @dropzo/web -- LoginPage`
2. Typecheck passes: `npm run typecheck -w @dropzo/web`
3. Lint passes: `npm run lint -w @dropzo/web`
4. Playwright screenshots on both 375x812 (mobile) and 1280x800 (desktop) verified.
