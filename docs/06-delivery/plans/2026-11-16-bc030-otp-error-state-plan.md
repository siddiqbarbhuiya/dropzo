# Implementation Plan: Dropzo OTP Verification — Expired & Error State Integration (BC-030)

**Date**: 2026-11-16  
**Task ID**: `BC-030`  
**Related Documents**:

- Spike: [`spikes/2026-11-16-bc030-otp-error-state-spike.md`](spikes/2026-11-16-bc030-otp-error-state-spike.md)
- Stitch Designs: `audit/stitch-audit/html/e869ce0a516d40deb03a540d963d7e46.html` (Mobile), `audit/stitch-audit/html/7ef77919f0f64d24ae6d685267eb9e62.html` (Desktop)

---

## 1. Overview & Objectives

Deliver a 1:1 visual and functional implementation of the Dropzo OTP Expired & Error State across mobile and desktop viewports, enhancing `OTPInput` and `LoginPage.tsx` with:

- Error indicator badges and `phonelink_erase` circular badge.
- `hasError` state on `OTPInput` with red borders and error container background.
- High-visibility Error Alert Banner (FR-AUTH-002) with dynamic attempts remaining (`2 of 5 before temporary security lockout`).
- Time validity indicator with `00:00 (Expired)` badge and failed attempts counter.
- Dual recovery actions: "Request New OTP via SMS" and disabled "Verify & Proceed (Disabled)" CTA.
- Full unit test coverage and Playwright verification.

---

## 2. File Changes

### Task 1: Update `OTPInput.tsx` with `hasError` prop

- **File**: `apps/web/src/components/ui/OTPInput.tsx`
- **Changes**:
    - Add optional `hasError?: boolean` to `OTPInputProps`.
    - Pass `$hasError={hasError}` to `Digit` styled component.
    - Apply error styling: `border: 2px solid ${({ theme }) => theme.colors.error}; background: rgba(186, 26, 26, 0.08); color: ${({ theme }) => theme.colors.error};` when `$hasError` is true.

### Task 2: Update `LoginPage.tsx` with 1:1 Stitch Error State

- **File**: `apps/web/src/routes/LoginPage.tsx`
- **Changes**:
    - Add `failedAttempts` state (`const [failedAttempts, setFailedAttempts] = useState(0)`).
    - Reset `failedAttempts` to 0 when `handleSendOtp` is called.
    - Increment `failedAttempts` when `handleVerifyOtp` fails.
    - Calculate `isExpired = step === 'code' && resendTimer === 0`.
    - Add styled components:
        - `VerificationFailedPill`: red pill with `error` icon.
        - `ErrorBadgeCircle`: red circular container with `phonelink_erase` or `timer_off`.
        - `HighVisibilityErrorAlert`: banner with warning icon, bold title ("OTP Expired or Invalid"), message with phone, attempts remaining, and FR-AUTH-002.
        - `TimeValidityRow`: displays validity (`00:00 (Expired)` or countdown) and `Attempts: X failed`.
        - `ErrorResendActions`: buttons for "Request New OTP via SMS" and WhatsApp OTP.
    - Wire conditionally when `Boolean(error) || isExpired`.

### Task 3: Unit & Integration Tests

- **File**: `apps/web/src/routes/LoginPage.test.tsx`
- **Changes**:
    - Add test: verifies error state displays "Verification Failed", error alert banner, and remaining attempts when OTP verification fails.
    - Add test: verifies expired countdown renders "00:00 (Expired)" and "Request New OTP via SMS" button.

### Task 4: Verification Suite & Documentation

- Run `npm run test -w @dropzo/web -- LoginPage`.
- Run `npm run typecheck -w @dropzo/web`.
- Run `npm run lint -w @dropzo/web`.
- Run `npm run build -w @dropzo/web`.
- Playwright screenshots (Desktop: 1280x800, Mobile: 390x844).
- Update `TASK-TRACKER.md`, `PROGRESS.md`, `UI-SCREEN-COVERAGE.md`.
- Git commit.

---

## 3. Gate 2 Self-Approval

- **Status**: Approved under autonomous pipeline mandate.
