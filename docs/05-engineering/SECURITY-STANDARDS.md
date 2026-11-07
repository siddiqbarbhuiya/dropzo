# Security standards

**Status: Accepted** (standards to follow). Authentication/authorization controls were implemented
in BC-005; most business-module controls below remain **Planned**, since those modules don't exist
yet — each is labelled.

## Authentication and authorisation (Implemented, BC-005)

- Phone OTP authentication, verified server-side; never trust a phone number sent in a request
  body without verification (FR-AUTH-001). **Implemented** — see
  [`../04-design/AUTHENTICATION-DESIGN.md`](../04-design/AUTHENTICATION-DESIGN.md).
- OTP must expire and must not be reusable (FR-AUTH-002). **Implemented.**
- Short-lived access tokens with refresh tokens; no long-lived unrevokable sessions.
  **Implemented** — see
  [ADR-0013](../03-decisions/ADR-0013-phone-otp-auth-opaque-refresh-tokens.md).
- Admin accounts should use stronger authentication (MFA), once an admin surface exists. **Still
  Planned** — BC-005 implements RBAC and audited role assignment, not MFA; there is no admin
  dashboard/surface yet.

## Role-based and resource-level access control (Partially implemented, BC-005)

- Every protected endpoint must check both role and resource ownership. Hiding a UI button is not
  authorization. **Implemented as a global default** — every route requires authentication and
  (where declared) a role by default (`JwtAuthGuard`/`RolesGuard` as global guards); no endpoint
  relies on client-side hiding.
- A merchant must only access their own stores, products, and orders (FR-MER-003). **Foundation
  implemented** (`MerchantAccessGuard` — server-side ownership check against `merchants`/
  `merchant_staff`), but not yet applied to any real merchant/store/product/order route, since
  those routes don't exist yet (a later task). See AUTHENTICATION-DESIGN.md's "Merchant/store
  authorization" section.
- A customer must only access their own orders and addresses. **Still Planned** — no
  order/address routes exist yet to apply this to.
- A delivery partner must only see assigned deliveries. **Still Planned** — no delivery routes
  exist yet.

## Input validation and data integrity (Planned)

- Validate all external input (NestJS `ValidationPipe`, already wired globally in `apps/api`).
- Never trust client-supplied prices, totals, or stock counts — the server recalculates them.
- Monetary values use decimal/numeric types, never floating-point.

## Secrets management (Implemented as a practice)

- No secrets committed to the repository. `.env` is gitignored; `.env.example` holds placeholder
  names only.
- Secrets are read from environment variables, validated at startup (see `apps/api/src/config/env.validation.ts`).
- Production secrets belong in the hosting provider's secret manager, not in any file in the repo.

## OTP and pickup-code protection (OTP implemented BC-005; pickup codes still Planned)

- OTP and pickup verification codes must be hashed at rest, time-limited, and rate-limited against
  repeated/incorrect attempts. **OTP: Implemented** (HMAC-SHA256 at rest, `OTP_EXPIRY_SECONDS`,
  `OTP_MAX_ATTEMPTS`, per-phone/per-IP hourly limits, resend cooldown — all database-backed, not
  in-memory-only). **Pickup codes: still Planned** — pickup verification doesn't exist yet.
- Never log OTPs, tokens, secrets, or payment credentials. **Implemented** for OTPs/tokens as of
  BC-005 — verified by code review of every log/audit call site; no raw OTP, access token, or
  refresh token is ever passed to a logger or `AuditService.record()`.

## Webhook and payment security (Planned)

- Payment webhook signatures must be verified before processing.
- Webhook processing must be idempotent — a repeated webhook must never double-charge or
  double-fulfil.
- No raw card/payment credentials are ever stored by Dropzo; the payment gateway handles that.

## Audit logging (Partially implemented, BC-005)

- Sensitive operations (refunds, stock adjustments, settlements, merchant approval/suspension)
  must be audit-logged: who, what, when, and why. **Mechanism implemented and in use for
  authentication/authorization events** (`AuditService`, writing to the pre-existing `audit_logs`
  table — see AUTHENTICATION-DESIGN.md's "Audit events" list: OTP requests/failures, registration,
  login, suspension rejection, refresh-token reuse detection, logout/logout-all, session
  revocation, role grants/revocations). **Still Planned** for refunds, stock adjustments,
  settlements, and merchant approval/suspension themselves — those operations don't exist yet.

## Dependency vulnerability management (Implemented as a practice; see current findings below)

- Run `npm audit` regularly. Fix non-breaking vulnerabilities promptly.
- A breaking-change fix (major version upgrade) requires its own task and explicit approval before
  being applied — never force it silently.
- Distinguish production-impacting vulnerabilities (`npm audit --omit=dev`) from dev-tooling-only
  ones; prioritise the former.

### Current known findings (as of BC-002.1 — verify against `npm audit` before relying on this)

| Finding                                                                      | Severity       | Production or dev-only                    | Status                                                      |
| ---------------------------------------------------------------------------- | -------------- | ----------------------------------------- | ----------------------------------------------------------- |
| `react-router`/`react-router-dom` — GHSA-wrjc-x8rr-h8h6, GHSA-337j-9hxr-rhxg | Moderate       | **Production**                            | Unresolved — fix needs a major v7 upgrade, not yet approved |
| `vite`/`vitest`/`esbuild` family                                             | Up to Critical | Dev-only (local dev server / test runner) | Unresolved — fix needs major upgrades, not yet approved     |
| Nx's nested `minimatch` (GHSA-g3hv-75wg-m249)                                | Moderate       | Dev-only (CLI tooling)                    | Unresolved — no automatic fix path available                |

Full detail and reasoning: [`../06-delivery/PROGRESS.md`](../06-delivery/PROGRESS.md) (BC-002.1
section) and [`../08-quality/RISK-REGISTER.md`](../08-quality/RISK-REGISTER.md). **These have not
been fixed** — do not report them as resolved without re-running `npm audit` and verifying.

## Related documents

- [`CODING-STANDARDS.md`](CODING-STANDARDS.md)
- [`../04-design/BUSINESS-RULES.md`](../04-design/BUSINESS-RULES.md)
- [`../08-quality/RISK-REGISTER.md`](../08-quality/RISK-REGISTER.md)
