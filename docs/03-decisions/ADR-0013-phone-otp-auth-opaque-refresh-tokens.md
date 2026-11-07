# ADR-0013: Phone+OTP authentication with stateless access tokens and opaque, hashed refresh tokens

- **Status:** Accepted
- **Date:** 2026-11-07
- **Related requirements/tasks:** FR-AUTH-001, FR-AUTH-002, FR-AUTH-003, NFR-SEC-001 through
  NFR-SEC-003, BC-005

## Context

Dropzo needed a first authentication mechanism for customers, merchants, and admins, plus session
management, RBAC, and a foundation for merchant/store authorization (BC-005). The user base is
Indian mobile users; email/password is not the expected primary identity for this market, and
requiring one adds a credential customers would need to remember for an infrequent-purchase app.

## Problem

Three related decisions were needed:

1. How does a user prove who they are (identity + credential)?
2. How does an authenticated session stay authenticated across requests (access tokens), and how
   does it survive longer than a short-lived token without re-authenticating every few minutes
   (refresh tokens)?
3. How is a refresh token stored and rotated so that a stolen token cannot be replayed indefinitely?

## Decision

### Identity: phone number + OTP, no password

A phone number (normalized to E.164, India-only for now via `libphonenumber-js`) is the primary
identity. Registration and login share one flow: requesting and verifying an OTP. The first
successful OTP verification for a phone number that has never registered creates a new `CUSTOMER`
account; every later verification is a login. There is no separate "register" step and no
password — see `docs/04-design/AUTHENTICATION-DESIGN.md` for the full lifecycle.

### Access tokens: short-lived, stateless JWTs

Access tokens are JWTs signed with a dedicated `JWT_ACCESS_SECRET`, carrying only `{sub, sid,
roles}` — no personal data. They are not looked up in the database on every request; a valid
signature and unexpired `exp` are sufficient. **Accepted tradeoff:** revoking a session (logout,
suspension, refresh-token reuse detection) does not invalidate an already-issued access token —
it simply expires naturally, within `ACCESS_TOKEN_TTL_SECONDS` (default 900s / 15 minutes). This
tradeoff is deliberately accepted, not an oversight: a 15-minute worst-case window after logout or
suspension is judged acceptable for Dropzo's threat model (low-value consumer orders, not a
financial/banking system), against the cost of looking up every access token on every request.

### Refresh tokens: opaque random values, hashed at rest, not JWTs

Refresh tokens are **not** JWTs. They are 32 random bytes (`crypto.randomBytes`), hex-encoded, with
only their SHA-256 hash ever stored, in `user_sessions.refresh_token_hash`. Presenting a refresh
token means looking it up by its hash; a match proves possession of the original value. Rotation:
every successful refresh issues a new refresh token and overwrites the stored hash. Reuse
detection: `user_sessions` keeps only the latest hash, not a history. Rotation is a one-way
ratchet; a session has one valid token's hash at a time.

**Why opaque tokens, not JWT refresh tokens:** a refresh token already carries 256 bits of entropy
from a CSPRNG — it needs no signature to prove authenticity, and hashing it at rest (so a database
read alone cannot produce a usable token) is the standard mitigation for long-lived bearer tokens.
A JWT refresh token would add a decode/verify step for no security benefit here, and would also
need a revocation list to support logout (since JWTs are stateless by design) — effectively
reinventing what `user_sessions` already provides directly.

### Reuse/rotation conflict: a stolen token replayed after rotation revokes the whole session

Because only the latest hash is stored (no history), a presented token that doesn't match the
current hash is indistinguishable from "stale, already-rotated token" and "stolen token being
replayed by an attacker after the legitimate client already rotated." The conservative response —
revoke the session outright rather than silently rotating anyway — is the standard mitigation
(OWASP ASVS 3.3.1-class guidance): a legitimate client that loses a race is forced to re-login,
which is an acceptable cost against the alternative of an indefinitely-replayable stolen token.

## Alternatives considered

- **Password-based auth** — rejected: not the expected identity model for this market; adds a
  credential-reset flow (email, which many target users may not have) for no corresponding benefit.
- **JWT refresh tokens** — rejected: see above; adds complexity (signature, its own secret,
  needing a revocation mechanism anyway) without a security or simplicity gain over opaque+hashed.
- **A refresh-token-hash history (not just the latest)** — would let a stale-vs-stolen distinction
  be made (e.g. only revoke if the presented token is more than one rotation behind), rather than
  always revoking on any mismatch. Deferred: the schema has no such history table, and the BC-005
  task's explicit instruction was to prefer the smallest compatible schema addition. The always-
  revoke behavior is strictly safer, just occasionally less convenient to a legitimate client that
  loses a retry race; revisit if that proves to be a real-world problem.
- **Redis-backed session/rate-limit store** — rejected for this task: no demonstrated need yet: a
  single-instance modular monolith with PostgreSQL already provides the durability and atomicity
  (`SELECT ... FOR UPDATE`) that OTP/session state needs. See ADR-0001.

## Consequences

- Easier: no password-reset flow to build; refresh-token theft has a bounded, auditable blast
  radius (one session, revoked wholesale on detected reuse); access-token verification needs no
  database round-trip.
- Harder: a revoked session's access token stays valid for up to `ACCESS_TOKEN_TTL_SECONDS` after
  revocation (documented tradeoff above); a legitimate client racing a retry during rotation is
  logged out rather than silently recovered (documented tradeoff above).

## Security and operational implications

- `JWT_ACCESS_SECRET` and `OTP_HASH_SECRET` are required, never defaulted, minimum 32 characters
  (`src/config/env.validation.ts`) — a predictable value would defeat both.
- OTP codes are never stored in plaintext; only an HMAC-SHA256 digest (`OTP_HASH_SECRET`), compared
  via `timingSafeEqual` to avoid timing attacks on the comparison itself.
- See `docs/04-design/AUTHENTICATION-DESIGN.md` for the full security assumptions and limitations
  list (OTP provider abstraction, rate limiting, audit events, production SMS requirement).

## Revisit conditions

Revisit if: a refresh-token-hash history becomes necessary to reduce false-positive "reuse"
revocations under real traffic; Redis-backed session storage becomes necessary for genuine
multi-instance scaling; or a second country's phone numbering plan needs to be supported (the
normalization layer is already written to make this an additive change, not a rewrite — see
`src/auth/phone.util.ts`).
