# Spike Report: Dropzo OTP Verification — Expired & Error State Integration (BC-030)

**Date**: 2026-11-16  
**Task ID**: `BC-030`  
**Confidence Level**: 99%  
**Status**: Approved (Autonomous Pipeline Mandate)

---

## 1. Executive Summary

This spike investigates the complete 1:1 integration of the **Dropzo OTP Verification Expired & Error State** into `apps/web/src/routes/LoginPage.tsx` (and component library), adhering to Stitch screens:

- Mobile: `e869ce0a516d40deb03a540d963d7e46` (`Dropzo OTP Verification - Expired & Error State (Mobile)`)
- Desktop: `7ef77919f0f64d24ae6d685267eb9e62` (`Dropzo OTP Verification - Expired & Error State (Desktop)`)

Currently, `LoginPage.tsx` features a generic `<ErrorBanner role="alert"><span>{error}</span></ErrorBanner>` which lacks the rich Stitch visual fidelity, specifically:

1. "Verification Failed" / "00:00 • Code Expired" top status pill.
2. Circular `phonelink_erase` and `timer_off` badges.
3. 6-digit OTP input boxes styled with error tokens (`border-2 border-error bg-error-container/20 text-error font-bold`).
4. High-visibility Error Alert Banner (FR-AUTH-002) citing expiration, invalid code reasons, and remaining attempts (`2 of 5 before temporary security lockout`).
5. Expired Time Validity chip (`00:00 (Expired)`) and failed attempt tracker (`Attempts: X failed`).
6. Dual recovery actions: "Request New OTP via SMS" primary CTA and disabled "Verify & Proceed (Disabled)" CTA when expired.
7. Inline WhatsApp OTP fast connect and "Edit Number" navigation.

All required HTML and screenshots exist in `audit/stitch-audit/html/` and `audit/stitch-audit/screenshots/`.

---

## 2. Technical Investigation & Boundaries

### 2.1 Backend Contract Alignment

- Backend endpoint: `POST /api/v1/auth/verify-otp`.
- When an incorrect or expired OTP is submitted, backend responds with `401 Unauthorized` or `400 Bad Request` and error details (e.g., `Invalid verification code`, `OTP expired`, `Maximum attempts exceeded`).
- In `LoginPage.tsx`, `handleVerifyOtp` catches `err instanceof ApiError ? err.message : ...`.

### 2.2 Component Enhancements

1. **`OTPInput` (`apps/web/src/components/ui/OTPInput.tsx`)**:
    - Add optional `hasError?: boolean` prop.
    - When `hasError` is true, render digits with red border (`theme.colors.error`), error tinted background (`rgba(186, 26, 26, 0.08)`), and bold error text.

2. **`LoginPage` (`apps/web/src/routes/LoginPage.tsx`)**:
    - Track `failedAttempts` count (increments on verification error, resets on new OTP send).
    - Detect expiration when countdown hits 0 (`resendTimer === 0`).
    - Render Stitch 1:1 error elements:
        - `VerificationFailedPill`: `error` icon + "Verification Failed" / "00:00 • Code Expired".
        - `ErrorAlertBanner`: Warning icon, bold title ("OTP Expired or Invalid" / "Code Expired & Verification Failed"), descriptive message with dynamic phone number, remaining attempts (`${Math.max(0, 5 - failedAttempts)} of 5`), and FR-AUTH-002 citation.
        - `TimeValidityRow`: `timer_off` icon, "Time validity:" indicator with `00:00 (Expired)` chip, and `Attempts: ${failedAttempts} failed` label.
        - Error state action buttons: "Request New OTP via SMS" button with `replay` / `refresh` icon.
        - When expired, show primary "Request New OTP" CTA and disabled verify CTA.

---

## 3. Risk Assessment

| Risk                     | Likelihood | Impact | Mitigation                                                                                                                      |
| :----------------------- | :--------- | :----- | :------------------------------------------------------------------------------------------------------------------------------ |
| Breaking normal OTP flow | Low        | High   | Ensure error styling only activates when `error` is non-null or `isExpired` is true; normal successful flow remains unaffected. |
| Accessibility regression | Low        | Medium | Ensure `role="alert"`, `aria-invalid`, and descriptive labels are preserved.                                                    |

---

## 4. Confidence & Gate 1 Self-Approval

- **Confidence Score**: **99%**
- **Decision**: Pre-approved under autonomous pipeline authorization ("approve everything yourself"). Proceeding immediately to Phase 2 (Implementation Plan).
