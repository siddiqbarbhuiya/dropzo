# Authentication, session, and authorization design

**Status:** Implemented (BC-005). See
[ADR-0013](../03-decisions/ADR-0013-phone-otp-auth-opaque-refresh-tokens.md) for the identity and
token-format decisions and their alternatives. See
[`API-SPECIFICATION.md`](API-SPECIFICATION.md) for the exact implemented endpoints.

## Overview

Dropzo authenticates every user (customer, merchant, admin) with one flow: phone number + OTP.
There is no password. Authorization layers on top: role-based access control (RBAC) with explicit
roles, and a merchant/store ownership check for merchant-scoped resources.

## OTP lifecycle

1. **Request** (`POST /auth/send-otp`): the phone number is normalized to E.164
   (`src/auth/phone.util.ts`, India-only for now). If a challenge was created for this phone within
   `OTP_RESEND_COOLDOWN_SECONDS` (default 30s), the request returns `{status: "cooldown",
retryAfterSeconds}` without creating a new one or sending anything. Otherwise, per-phone and
   per-IP hourly limits are checked (`OTP_PER_PHONE_HOURLY_LIMIT` / `OTP_PER_IP_HOURLY_LIMIT`,
   counted directly against `otp_challenges` rows in the last hour — database-backed, not an
   in-memory counter, so it survives restarts and works correctly across multiple instances). A
   code of `OTP_CODE_LENGTH` digits (default 6) is generated with `crypto.randomInt` (CSPRNG), its
   HMAC-SHA256 digest (`OTP_HASH_SECRET`) is stored — never the plaintext code — and it is handed to
   the configured `OtpProvider` to send.
2. **Verify** (`POST /auth/verify-otp`): the most recent `PENDING` challenge for the phone is
   locked with `SELECT ... FOR UPDATE` inside one transaction (mirrors the row-locking pattern
   `DATABASE-DESIGN.md` establishes for inventory/FEFO concurrency), then checked for expiry,
   attempt limit, and a constant-time hash comparison (`timingSafeEqual`), all inside that same
   lock — see "Concurrency safety" below for why this matters. A correct code marks the challenge
   `VERIFIED` and proceeds to `findOrCreateUser`; an incorrect code increments `attempt_count` and
   returns how many attempts remain, locking the challenge (`FAILED`) once `max_attempts` is
   reached.
3. **Login vs. registration are the same call.** If no user exists with this phone number, one is
   created with role `CUSTOMER` only, inside a transaction, and `isNewAccount: true` is returned.
   If a user already exists, this is a login. A suspended account (`is_active = false`) is rejected
   at this point with `account_suspended`, before any tokens are issued.

### Concurrency safety

Two classes of races are relevant and are both handled, by different mechanisms:

- **The same OTP verified twice at once** (e.g. a duplicated client request, or an attacker racing
  a guess against a legitimate verification): the `SELECT ... FOR UPDATE` transaction in step 2
  above means the second transaction blocks until the first commits, then observes the
  already-updated row (now `VERIFIED`, or one attempt closer to locked) and responds accordingly.
  Never two successful verifications of the same code.
- **The same new phone number registering twice at once** (e.g. two devices, two already-issued
  valid OTPs for the same never-registered phone, verified simultaneously): `users.phone` is
  `UNIQUE`. `findOrCreateUser` does lookup-then-create; the loser of the race gets a unique
  constraint violation on `INSERT`, which is caught and retried as a plain lookup, which now finds
  the winner's row. Never two accounts for one phone number.

## OTP provider abstraction

`OtpProvider` (`src/auth/otp/otp-provider.interface.ts`) is the seam between OTP generation and
actually delivering it. The only implementation so far is `DevOtpProvider`, which logs the code to
the server console with a loud warning and never sends a real SMS. `OtpModule`'s factory
(`createOtpProvider`) selects the provider named by `OTP_PROVIDER` (default `dev`) and **hard-fails
at application startup** if `OTP_PROVIDER=dev` is configured while `NODE_ENV=production` — a
misconfigured deployment refuses to start rather than silently sending no real SMS to real users.
Selecting an unknown provider name also fails loudly at startup, rather than falling back silently.

**No real SMS provider is configured or implemented.** This is an honest, deliberate gap, not an
oversight: no vendor has been chosen yet. Adding one means implementing `OtpProvider` for that
vendor and registering its name in the factory — nothing else in the OTP flow needs to change.

### Test-only OTP retrieval

`DevOtpProvider.getLastCodeForTesting(phone)` is the **only** sanctioned way to recover a sent code
outside of the provider itself (used by the integration test suite). It throws immediately if
`NODE_ENV === 'production'`, and application request-handling code never calls it — it exists
purely for `DevOtpProvider`'s own consumers (tests) to retrieve what a real user's phone would have
received via SMS, without ever exposing it through an API response or a log an attacker could read
remotely.

## Token lifecycle

See ADR-0013 for the format decisions. Summary of the mechanics:

- **Access token**: short-lived JWT (`ACCESS_TOKEN_TTL_SECONDS`, default 900s), claims
  `{sub: userId, sid: sessionId, roles: string[]}`, signed with `JWT_ACCESS_SECRET`. Verified
  per-request by `JwtAuthGuard` with no database lookup.
- **Refresh token**: opaque 32-byte random value (hex), returned to the client once; only its
  SHA-256 hash is ever stored, in `user_sessions.refresh_token_hash`.
- **Issuing a session** (`TokenService.issueSession`): creates a `user_sessions` row with the
  refresh token's hash, an absolute expiry (`REFRESH_TOKEN_TTL_DAYS`, default 30 days), and the
  requesting user agent/IP for the session list the user can see and revoke from.
- **Rotating** (`POST /auth/refresh`): looks up the session by the presented token's hash.
    - No match → `invalid` → `401`.
    - Match, but already revoked → `reused` → `401`, logged as
      `AUTH_REFRESH_TOKEN_REUSE_DETECTED` (see "Audit events" below).
    - Match, but past `expires_at` → `expired` → the session is revoked as a side effect, `401`.
    - Match, active, unexpired → issues a new access+refresh pair, overwrites the session's stored
      hash with the new one's. The old refresh token is now worthless even if it leaks afterward.
- **Suspension is re-checked on every refresh**, not just at login: if the account backing a
  session has since been suspended, the refresh is rejected and every session for that user is
  revoked immediately (not just the one being used) — a suspension always eventually logs the user
  out everywhere, even from sessions that aren't actively presenting a token right now.

## Session management endpoints

- `GET /auth/sessions` — lists the caller's own active (non-revoked) sessions: id, issued time,
  expiry, user agent, IP. Never another user's sessions.
- `DELETE /auth/sessions/:id` — revokes one of the caller's own sessions by id. Returns `{revoked:
false}` (not a 403/404) if the id doesn't belong to the caller or is already revoked — this
  avoids leaking whether a given session id exists at all to someone probing for other users' ids.
- `POST /auth/logout` — revokes the session matching the presented refresh token.
- `POST /auth/logout-all` — revokes every active session for the caller (e.g. "log out everywhere").

## RBAC

Roles (from the existing BC-004 schema, unchanged by BC-005): `CUSTOMER`, `MERCHANT_OWNER`,
`MERCHANT_STAFF`, `DELIVERY_PARTNER`, `ADMIN`, `SUPER_ADMIN`, `SUPPORT_AGENT`. A user can hold
multiple roles (`user_roles` is a many-to-many join).

**Deny-by-default globally.** `JwtAuthGuard` and `RolesGuard` are registered as global `APP_GUARD`
providers (`AuthModule`), so every route requires a valid access token by default; a route opts out
explicitly with `@Public()` (used only by `/auth/send-otp`, `/auth/verify-otp`, `/auth/refresh`, and
`/health`). A route additionally requiring specific roles uses `@Roles('ADMIN', 'SUPER_ADMIN')`
etc.; `RolesGuard` is a no-op (allows through) when a route has no `@Roles()` at all, since
`JwtAuthGuard` has already guaranteed authentication by that point.

### Role assignment

Every registration grants `CUSTOMER` only — there is no self-service or registration-time path to
any other role. The only way a user gains or loses a role beyond that is
`PATCH /admin/users/:id/roles` (`AdminRolesController`), itself `@Roles('ADMIN', 'SUPER_ADMIN')`
protected, with an additional in-code check: granting or revoking `SUPER_ADMIN` itself requires the
acting user to already hold `SUPER_ADMIN` (an `ADMIN` cannot mint another `SUPER_ADMIN`, including
themself). Every change is audit-logged (`AUTH_ROLE_GRANTED` / `AUTH_ROLE_REVOKED`) with the
actor, target, and role.

**First-admin bootstrap is a documented manual/seed-time step, not a public endpoint**, and
deliberately so: there is no mechanism by which an unauthenticated or freshly-registered user can
ever become the first `ADMIN` through the API. An operator grants the first `ADMIN` role directly
(e.g. via a one-off `prisma` script or direct database access against a specific known user id),
exactly as the integration test suite's `bootstrapAdmin()` helper simulates. This is an accepted,
intentional product/operational decision for launch scale, not an oversight — revisit if a
self-service admin-invitation flow becomes necessary.

## Merchant/store authorization (foundation)

`MerchantAccessGuard` (`src/auth/guards/merchant-access.guard.ts`) resolves which merchant a
request concerns — from a `:merchantId` route param directly, or a `:storeId` param resolved to its
owning merchant — and checks the authenticated user is either that merchant's owner
(`merchants.owner_user_id`) or listed in `merchant_staff` for it. Ownership is always re-checked
server-side against the database; the merchant/store id in the URL is never trusted on its own.

This is **foundation only** — it has no merchant/store CRUD routes of its own yet (merchant
onboarding and store management are a separate, later task; see `TASK-TRACKER.md`). It is fully
implemented, unit-tested, and integration-tested (including the cross-tenant-denial case) and ready
to apply to real merchant-scoped routes as they are built, simply by adding
`@UseGuards(MerchantAccessGuard)` to them.

## Audit events

`AuditService.record()` writes to `audit_logs` (pre-existing BC-004 table) for every
security-relevant event this task introduces: `AUTH_OTP_REQUESTED`,
`AUTH_OTP_VERIFICATION_FAILED`, `AUTH_USER_REGISTERED`, `AUTH_LOGIN_SUCCEEDED`,
`AUTH_LOGIN_REJECTED_SUSPENDED`, `AUTH_REFRESH_TOKEN_REUSE_DETECTED`, `AUTH_LOGOUT`,
`AUTH_LOGOUT_ALL`, `AUTH_SESSION_REVOKED`, `AUTH_ROLE_GRANTED`, `AUTH_ROLE_REVOKED`. An audit-write
failure is caught and logged locally rather than propagated — an audit-trail gap is judged less
harmful than an outage caused by the audit trail itself. **Raw OTP codes, access tokens, and
refresh tokens are never written to an audit log entry or any other log line.**

## Environment variables

| Variable                      | Required | Default | Purpose                                                      |
| ----------------------------- | -------- | ------- | ------------------------------------------------------------ |
| `JWT_ACCESS_SECRET`           | Yes      | —       | Signs/verifies access tokens. Min 32 chars, never defaulted. |
| `OTP_HASH_SECRET`             | Yes      | —       | HMACs OTP codes at rest. Min 32 chars, never defaulted.      |
| `ACCESS_TOKEN_TTL_SECONDS`    | No       | 900     | Access token lifetime.                                       |
| `REFRESH_TOKEN_TTL_DAYS`      | No       | 30      | Absolute refresh-token/session lifetime.                     |
| `OTP_CODE_LENGTH`             | No       | 6       | Digits per OTP code.                                         |
| `OTP_EXPIRY_SECONDS`          | No       | 300     | How long a challenge stays verifiable.                       |
| `OTP_MAX_ATTEMPTS`            | No       | 5       | Wrong-code attempts before a challenge locks.                |
| `OTP_RESEND_COOLDOWN_SECONDS` | No       | 30      | Minimum gap between OTP requests for the same phone.         |
| `OTP_PER_PHONE_HOURLY_LIMIT`  | No       | 5       | Max OTP requests per phone per rolling hour.                 |
| `OTP_PER_IP_HOURLY_LIMIT`     | No       | 20      | Max OTP requests per IP per rolling hour.                    |
| `OTP_PROVIDER`                | No       | `dev`   | Which `OtpProvider` to use. `dev` is refused in production.  |

## Security assumptions and limitations (honest, as of BC-005)

- **No production SMS provider is configured.** `OTP_PROVIDER=dev` is the only implementation;
  production deployment requires choosing and implementing a real vendor first (the factory refuses
  to start otherwise — see above).
- **A revoked session's already-issued access token remains valid until it naturally expires**
  (up to `ACCESS_TOKEN_TTL_SECONDS`) — an accepted tradeoff, see ADR-0013.
- **A global, in-memory, per-IP rate limit (`@nestjs/throttler`, 30 req/60s) is defence-in-depth
  only.** It resets on restart and does not coordinate across instances. The authoritative,
  database-backed controls are OtpService's own per-phone/per-IP hourly limits and resend cooldown,
  which survive restarts and would work correctly if Dropzo ever ran more than one instance.
- **`user_sessions` keeps only the latest refresh-token hash, not a history.** This means any
  mismatch is treated as reuse (see ADR-0013's "Reuse/rotation conflict" section) — a legitimate
  client losing a retry race is logged out, not silently recovered.
- **No data-retention policy has been decided** for `otp_challenges` or `audit_logs` rows (how long
  expired/failed OTP challenges or audit log entries are kept before deletion). This is a real,
  open decision deferred to a future task, not an invented default — see `TECHNICAL-DEBT.md`.
- **The phone normalization layer only validates Indian (`IN`) numbers today.** Extending to other
  countries means passing a different `defaultCountry` and validating the caller's claimed country,
  not a structural rewrite — `libphonenumber-js` already supports arbitrary countries.
- **Merchant/store authorization is a foundation with no routes protecting real merchant resources
  yet** (see above) — it has not been exercised against real merchant-onboarding or store-CRUD
  flows because those don't exist yet.

## Browser/client token storage

This task implements the backend only; no frontend storage decision has been made or implemented
yet. Documenting the assumption this design was built against: an access token is intended to be
held in memory (not `localStorage`, to limit XSS exposure) and a refresh token held more durably
(exact mechanism — httpOnly cookie vs. a mobile-app-only concern — is a frontend decision for a
later task, not decided here). This is called out explicitly so a future frontend task does not
default to unexamined `localStorage` token storage for both tokens.

## Related documents

- [ADR-0013](../03-decisions/ADR-0013-phone-otp-auth-opaque-refresh-tokens.md)
- [`API-SPECIFICATION.md`](API-SPECIFICATION.md)
- [`DATABASE-DESIGN.md`](DATABASE-DESIGN.md) — `users`, `user_roles`, `user_sessions`,
  `otp_challenges`, `audit_logs`, `merchants`, `merchant_staff` table definitions
- [`../05-engineering/SECURITY-STANDARDS.md`](../05-engineering/SECURITY-STANDARDS.md)
- [`../01-requirements/FUNCTIONAL-REQUIREMENTS.md`](../01-requirements/FUNCTIONAL-REQUIREMENTS.md)
  — FR-AUTH-001, FR-AUTH-002, FR-AUTH-003
