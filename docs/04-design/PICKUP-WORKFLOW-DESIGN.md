# One-time pickup code design (BC-009)

**Status:** Implemented. Covers `PickupVerificationService`
(`apps/api/src/fulfilment/pickup-verification.service.ts`) and the `pickup_verifications` table
(modeled by BC-004: `id, order_id (unique), code_hash, expires_at, verified_at, attempt_count,
max_attempts (default 5)` - no schema change needed). See
[`ORDER-FULFILMENT-DESIGN.md`](ORDER-FULFILMENT-DESIGN.md) for where this fits into the order
lifecycle (`markReady` generates the code; `completePickup` verifies it).

The implementation deliberately mirrors `OtpService`'s already-reviewed cryptographic pattern
(`apps/api/src/auth/otp/otp.service.ts`) rather than inventing a new one: `randomInt` generation,
HMAC-SHA256 hashing with a dedicated secret, `timingSafeEqual` comparison, and a `SELECT ... FOR
UPDATE` row lock before reading or writing the verification row.

## Generation (`generateForOrder`, called from `markReady`)

1. `randomInt(0, 10**6)` - a cryptographically secure, uniformly distributed 6-digit code
   (zero-padded, e.g. `004213`), **numeric only** (no ambiguous letters, easy to read aloud/key in
   at a counter).
2. Hashed with HMAC-SHA256 using `PICKUP_CODE_HASH_SECRET` (see "Secret management" below) and
   persisted as `code_hash` - **the plaintext is never written to any durable store.**
3. `expires_at = now + 48 hours` - long enough to cover a customer who doesn't collect same-day,
   short enough that a stale code doesn't linger indefinitely.
4. Returned to the caller (`MerchantOrdersService.markReady`), which puts it **only** in the
   `ORDER_READY_FOR_PICKUP` outbox event payload - **never returned from any merchant-facing API
   response.** A merchant never sees their own customer's code through the API; they see it only
   because the customer reads it aloud at the counter, which is the entire point of the pickup-code
   check.

## Verification (`verify`, called from `completePickup`)

Runs inside the same transaction as order completion, so a wrong code can never accidentally
complete an order and a correct code can never be observed as correct without the transaction that
completes the order also committing:

1. `SELECT ... FROM pickup_verifications WHERE order_id = $1 FOR UPDATE` - locks the row before
   reading it. Two simultaneous verification attempts for the same order (e.g. a double-tapped
   "submit" button, or two merchant devices) can never both observe `verified_at IS NULL` and both
   proceed: the second blocks until the first's transaction commits, then sees the now-`verified_at`
   row and returns `'locked'`. Proven directly by `fulfilment.integration-spec.ts`'s "never lets a
   concurrent double-verification both succeed" test, which fires two real simultaneous requests
   with the correct code and asserts exactly one order reaches `COMPLETED`.
2. Outcome, in priority order:
    - No row -> `'not_found'`.
    - Already `verified_at` -> `'locked'` (a used code can never be reused - this is also what makes
      a second **correct**-code submission after the first succeeds fail cleanly, rather than
      re-completing an already-completed order).
    - `expires_at` passed -> `'expired'`.
    - `attempt_count >= max_attempts` (5) -> `'locked'` (brute-force protection; this is an
      additional, row-level counter on top of the pickup-verification endpoint's own
      `@Throttle({limit: 10, ttl: 60_000})` rate limit - two independent layers, not one relied on
      alone).
    - Hash mismatch -> increments `attempt_count`, returns `'invalid'` with `attemptsRemaining`.
    - Hash match (`timingSafeEqual`, never a plain `===` on the hash) -> sets `verified_at`, returns
      `'verified'`.
3. **A failed verification never reveals whether the supplied code belongs to a different,
   existing order** - verification is always scoped to the one `orderId` the merchant is already
   operating on (resolved via `assertCanOperate`/`getOwnedOrThrow`'s store-ownership check before
   `completePickup` ever calls `verify`); there is no code-lookup-by-value endpoint anywhere that
   could leak this.
4. **The plaintext is never logged** - `verify` only ever receives and compares the supplied code
   in memory; no `console.log`/`Logger` call anywhere in this service includes `suppliedCode` or
   the stored hash's plaintext source.

## Customer retrieval (`getOwnCode`, called from `CustomerPickupController`)

`GET /api/v1/customers/me/orders/:orderId/pickup-code`. Ownership is resolved **before** this
service is ever touched: the controller calls `OrdersService.getOwnOrder(user.id, orderId)` first
(scoped to `customer_id = <authenticated user>`, `404` for any order that isn't theirs), and only
then checks `order.status === 'READY'` (otherwise `403` - a customer can never see a code for an
order that isn't ready, whether or not one has been generated). Only after both checks pass does
`getOwnCode(order.id)` run - another customer's order, or an order of their own that isn't READY
yet, never reaches this service at all.

- `NotFoundException` if no code has been issued yet.
- `ConflictException` if already collected (`verified_at` set) or expired.
- Otherwise returns `{expiresAt, codeAvailable, code}` - see "Code retrieval after the first view"
  below for what `codeAvailable`/`code` actually mean.

## Code retrieval after the first view: a real, documented limitation

Hash-only storage is irreversible by design - `code_hash` cannot be turned back into the original
6 digits. This creates a genuine tension with the task's requirement that a customer be able to
retrieve their own code (e.g. after closing the app and reopening it): the durable record alone
cannot satisfy both "hash-only" and "retrievable" at once.

**Resolved design:** the plaintext is cached, immediately after generation, in this **process's own
in-memory `Map<orderId, {code, expiresAt}>`** (`PickupVerificationService.plaintextCache`),
evicted at the code's own 48-hour expiry (checked lazily on read, not via a timer). A `getOwnCode`
call within the same process lifetime, before expiry, still returns the plaintext
(`codeAvailable: true`). After a process restart, a deploy, or simple cache eviction, it returns
`codeAvailable: false, code: null` with a clear message - the frontend shows "contact the store for
your code" rather than a blank or broken field.

This is an **accepted limitation for this single-instance MVP, not a security compromise**:

- The durable record (the only thing a database backup, a DB admin with read access, or an
  attacker who dumps the table could ever see) is always hash-only, with no code path that ever
  persists the plaintext anywhere durable.
- It does not work correctly if the API is ever horizontally scaled to more than one instance
  without a shared cache (a customer's retrieval could hit a different instance than the one that
  generated the code and see `codeAvailable: false` even though the code is still valid) - tracked
  in `TECHNICAL-DEBT.md` as the thing to fix (a Redis-backed cache, or a short-lived encrypted
  value) **if and when** this project actually scales beyond one instance, per the "no Redis unless
  genuinely needed" constraint.
- The outbox event (`ORDER_READY_FOR_PICKUP`) is the durable, delivery-channel source of truth for
  the code reaching the customer at all (push notification, SMS, etc., once a dispatch worker
  exists - see "Notifications" below); `getOwnCode`'s in-app view is a convenience, not the only
  way the customer learns their code.

## Secret management (`PICKUP_CODE_HASH_SECRET`)

A new required env var (`Joi.string().min(32).required()` in `env.validation.ts`), **deliberately
separate from `OTP_HASH_SECRET`** - different purpose, a compromised OTP secret should never also
compromise pickup-code hashes and vice versa. Added to `.env`, `.env.test`, `.env.example`,
`.env.test.example`, and both env blocks in `.github/workflows/ci.yml` (real random hex locally,
`test-only-...`/`ci-only-...` placeholders elsewhere, all ≥32 characters - never a hardcoded
production-looking secret in version control).

## Notifications

This milestone implements the **transactional outbox write only** - every order-status transition
(including `ORDER_READY_FOR_PICKUP`, carrying the pickup code) inserts an `outbox_events` row in
the same database transaction as the business change, via `OutboxService` (the first application
code in the repository to use this table). **There is still no dispatch worker** that claims
`PENDING` outbox rows and actually sends a push notification/SMS - building one requires picking an
actual delivery channel (FCM, SMS gateway), which is a paid external service decision outside this
task's "no new paid infra" constraint. This is intentional, incremental scope, not an oversight:
writing the event transactionally and decoupling it from ever delivering it means the dispatch
worker can be added later as a pure consumer of `outbox_events`, with zero changes to any of the
business logic in this milestone. Tracked in `TECHNICAL-DEBT.md`.

## Rate limiting

`POST /api/v1/merchants/me/stores/:storeId/orders/:orderId/verify-pickup` carries its own
`@Throttle({default: {limit: 10, ttl: 60_000}})` (10 requests/minute/IP), on top of the app-wide
`ThrottlerGuard` baseline - the same per-route-override pattern `CheckoutController` already
established for `POST /checkout` (see `ORDER-MANAGEMENT-DESIGN.md`'s "Abuse resistance" section),
reusing the same Jest `@nestjs/throttler` mock so this never needed its own test-harness fix.
