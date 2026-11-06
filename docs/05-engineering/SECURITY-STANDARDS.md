# Security standards

**Status: Accepted** (standards to follow). Most controls below are **Planned**, since the
authentication and business modules they apply to don't exist yet — each is labelled.

## Authentication and authorisation (Planned)

- Phone OTP authentication, verified server-side; never trust a phone number sent in a request
  body without verification (FR-AUTH-001).
- OTP must expire and must not be reusable (FR-AUTH-002).
- Short-lived access tokens with refresh tokens; no long-lived unrevokable sessions.
- Admin accounts should use stronger authentication (MFA), once an admin surface exists.

## Role-based and resource-level access control (Planned)

- Every protected endpoint must check both role and resource ownership. Hiding a UI button is not
  authorization.
- A merchant must only access their own stores, products, and orders (FR-MER-003).
- A customer must only access their own orders and addresses.
- A delivery partner must only see assigned deliveries.

## Input validation and data integrity (Planned)

- Validate all external input (NestJS `ValidationPipe`, already wired globally in `apps/api`).
- Never trust client-supplied prices, totals, or stock counts — the server recalculates them.
- Monetary values use decimal/numeric types, never floating-point.

## Secrets management (Implemented as a practice)

- No secrets committed to the repository. `.env` is gitignored; `.env.example` holds placeholder
  names only.
- Secrets are read from environment variables, validated at startup (see `apps/api/src/config/env.validation.ts`).
- Production secrets belong in the hosting provider's secret manager, not in any file in the repo.

## OTP and pickup-code protection (Planned)

- OTP and pickup verification codes must be hashed at rest, time-limited, and rate-limited against
  repeated/incorrect attempts.
- Never log OTPs, tokens, secrets, or payment credentials.

## Webhook and payment security (Planned)

- Payment webhook signatures must be verified before processing.
- Webhook processing must be idempotent — a repeated webhook must never double-charge or
  double-fulfil.
- No raw card/payment credentials are ever stored by Dropzo; the payment gateway handles that.

## Audit logging (Planned)

- Sensitive operations (refunds, stock adjustments, settlements, merchant approval/suspension)
  must be audit-logged: who, what, when, and why.

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
