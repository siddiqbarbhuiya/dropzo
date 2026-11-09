# Merchant onboarding and store management design

**Status:** Implemented (BC-006). See [`API-SPECIFICATION.md`](API-SPECIFICATION.md) for the exact
endpoints and [`DATABASE-DESIGN.md`](DATABASE-DESIGN.md) for the `merchants`/`stores` table specs.

## Overview

A user submits a merchant application; an admin reviews it; once approved, the owner (now holding
the `MERCHANT_OWNER` role - see [`AUTHENTICATION-DESIGN.md`](AUTHENTICATION-DESIGN.md)) can create
and manage stores, each of which an admin must separately approve before it becomes `ACTIVE`. This
is the onboarding/management foundation only - catalogue, inventory, and orders are BC-007+.

## Merchant application lifecycle

States: `DRAFT` (reserved for a future save-as-draft flow - no endpoint produces it yet), `PENDING`,
`APPROVED`, `REJECTED`, `SUSPENDED`. Enforced both in `MerchantApplicationService` and by a database
`CHECK` constraint (`chk_merchants_verification_status`), since `verification_status` predates this
task and was an unconstrained `VARCHAR`.

- **Submit** (`POST /merchants/me`): any authenticated user may submit, once. `merchants
.owner_user_id` is `UNIQUE` - a second submission while one is `PENDING`/`APPROVED`/`SUSPENDED`
  is rejected with a clear conflict, never a second row. The applicant is always the authenticated
  user (`req.user.id`) - the client can never supply or influence whose application this is.
- **Resubmit after rejection**: submitting again while the existing application is `REJECTED`
  updates the _same_ row back to `PENDING` and clears the previous decision
  (`reviewed_at`/`reviewed_by`/`rejection_reason` all reset to `NULL`) - a fresh review cycle, never
  a second merchant row for the same user and never an accumulation of past decisions.
- **Approve** (admin, `PENDING -> APPROVED`): grants the owner the `MERCHANT_OWNER` role (see
  "Role assignment" below for why this is required, not optional).
- **Reject** (admin, `PENDING -> REJECTED`): requires a reason, stored on the row.
- **Suspend** (admin, `APPROVED -> SUSPENDED`): requires a reason. Does **not** revoke
  `MERCHANT_OWNER` or cascade to the merchant's stores' own status (a deliberate, narrower scope -
  see "What suspension does and doesn't do" below).
- **Reinstate** (admin, `SUSPENDED -> APPROVED`): no reason required.
- Every admin decision (`reviewed_at`, `reviewed_by_user_id`) is recorded together or not at all -
  a second `CHECK` constraint (`chk_merchants_reviewed_fields_together`) makes "a reviewed
  application with no recorded reviewer" structurally impossible, not just a code convention.

### Concurrency: two admins can never both decide the same application

`approve`/`reject`/`suspend`/`reinstate` all use the same compare-and-swap shape: an `updateMany`
scoped to both the application's id **and** its expected current status (e.g. `WHERE id = ? AND
verification_status = 'PENDING'`). If another admin's decision already landed first, `count` comes
back `0` and the loser gets a clear `409 Conflict`, never a silently-overwritten decision. This
mirrors the pattern BC-005 established for refresh-token rotation and OTP verification - a
plain read-then-write here would have the same TOCTOU race those fixes closed.

### What suspension does and doesn't do

Suspending a merchant blocks `requireApprovedMerchantForOwner` (used by every store-mutating
service method) from succeeding, so a suspended merchant cannot create a new store or reactivate an
existing one (`PAUSED -> ACTIVE` requires `verification_status === 'APPROVED'`). It does **not**
automatically pause or close the merchant's existing stores, and does **not** revoke the
`MERCHANT_OWNER` role itself. This is a deliberate, narrower scope than "suspension immediately
takes every store offline" - revisit if that stronger cascade turns out to be needed; it was not
implemented here because BC-006 doesn't yet have a public discovery surface where an already-ACTIVE
suspended-merchant's store would actually be reachable by a customer.

## Role assignment on approval

Approving a merchant application grants the owner `MERCHANT_OWNER` (via the existing BC-005 admin
role mechanism - `userRole.upsert`, idempotent). This is not optional convenience: BC-005's own
`SECURITY-STANDARDS.md` requires every protected endpoint to check **both** role and resource
ownership, and the merchant-facing store routes (`@Controller('merchants/me/stores')`) are
`@Roles('MERCHANT_OWNER')`-gated - without the grant, an approved merchant could never reach them
at all. No other role is granted automatically; `MERCHANT_STAFF` delegation (the existing
`merchant_staff` table) is not extended by this task.

## Store lifecycle

States (existing `store_status` enum, unchanged): `PENDING`, `ACTIVE`, `PAUSED`, `SUSPENDED`,
`CLOSED`. A store is created `PENDING` and is **not** publicly discoverable until an admin
approves it into `ACTIVE` - this is the literal mechanism behind "admin approval is required
before a merchant/store becomes publicly discoverable."

| From              | To          | Actor                                                       | Notes                                                                                                                                                                                                 |
| ----------------- | ----------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PENDING`         | `ACTIVE`    | Admin only                                                  | Approval - the gate before public discoverability.                                                                                                                                                    |
| `PENDING`         | `CLOSED`    | Admin only                                                  | Reject-equivalent - `store_status` has no dedicated `REJECTED` value; reusing `CLOSED` avoids adding one for a case this task doesn't otherwise need to distinguish from any other permanent closure. |
| `ACTIVE`          | `PAUSED`    | Merchant or admin                                           | Temporary self-service pause.                                                                                                                                                                         |
| `PAUSED`          | `ACTIVE`    | Merchant (if `APPROVED`) or admin                           | **Blocked if the merchant is suspended** - "suspended merchants cannot activate stores."                                                                                                              |
| `ACTIVE`/`PAUSED` | `SUSPENDED` | Admin only                                                  | Enforcement action.                                                                                                                                                                                   |
| `SUSPENDED`       | `ACTIVE`    | Admin only                                                  | Reinstatement - a merchant can never self-reinstate a suspended store.                                                                                                                                |
| any               | `CLOSED`    | Merchant (from `ACTIVE`/`PAUSED`) or admin (from any state) | Permanent closure.                                                                                                                                                                                    |

Every transition is a compare-and-swap (`updateMany` scoped to `id` + expected current `status`),
the same concurrency-safety pattern as merchant-application decisions - two requests racing to
change one store's status can never both succeed from a state that's already moved on.

### Ownership enforcement

Every merchant-facing store route resolves "which merchant" from the authenticated user
(`owner_user_id`), never from a client-supplied merchant id, and every store lookup is re-scoped to
`WHERE id = :storeId AND merchant_id = :resolvedMerchantId` - a storeId belonging to a different
merchant returns `404 Not Found` (never `403`, so a client can't distinguish "not yours" from
"doesn't exist" and enumerate other merchants' store ids). This check lives in `StoreService`
itself (the service/data-access boundary), not only in the controller.

## Structured address and service-zone membership

`merchants`/`stores` gained structured `city`/`district`/`state`/`postal_code` fields (previously
only a single free-text address blob) and `stores.service_zone_id` - a real foreign key to
`service_zones` that `DATABASE-DESIGN.md`'s own delivery-eligibility rule already assumed ("the
store's `service_zones` membership") but the schema never actually implemented until now. A store's
lat/lng is still the existing single PostGIS `location` point - no duplicate geographic
representation was added.

## Operating hours

Reuses `stores.opening_hours` (existing `JSONB` column, previously unvalidated) with a per-weekday
shape:

```json
{ "mon": { "open": "09:00", "close": "21:00" }, "tue": null, "...": "..." }
```

A missing or `null` day means closed that day. Validated at the DTO layer (24-hour `HH:mm` format,
`open < close`) - the database still stores a plain `JSONB` blob, matching the existing column;
no schema change was needed for this.

## Timezone

`stores.timezone` (new column, IANA string, default `Asia/Kolkata`) - a per-store value, not a
hardcoded assumption that every merchant operates in one timezone. No timezone-aware scheduling
logic consumes this yet (there's nothing to schedule until orders/delivery exist); it exists so a
later task has a real per-store value to read instead of inventing one then.

## API summary

See [`API-SPECIFICATION.md`](API-SPECIFICATION.md) for the full endpoint table. Merchant-facing
routes live under `/merchants/me` and `/merchants/me/stores` (ownership resolved from the token,
never a client-supplied id); admin routes live under `/admin/merchants` and `/admin/stores`
(`ADMIN`/`SUPER_ADMIN` only, every decision audited).

## Audit events

`STORE_CREATED`, `STORE_UPDATED`, `STORE_HOURS_UPDATED`, `STORE_AVAILABILITY_UPDATED`,
`STORE_STATUS_CHANGED` (records `beforeState`/`afterState` status), `MERCHANT_APPLICATION_SUBMITTED`,
`MERCHANT_APPLICATION_RESUBMITTED`, `MERCHANT_APPLICATION_UPDATED`,
`MERCHANT_APPLICATION_APPROVED`, `MERCHANT_APPLICATION_REJECTED` (records the reason),
`MERCHANT_SUSPENDED` (records the reason), `MERCHANT_REINSTATED`. Every `entityId` is the real
`merchants`/`stores` row UUID (never a phone number or other non-UUID value - see BC-005's own
`audit_logs.entity_id` UUID-column fix for why this matters).

## Deferred, out of scope for BC-006

- Product catalogue, inventory, cart, checkout, orders, payments, delivery partner management
  (BC-007+).
- Public store-discovery APIs (customer-facing "browse approved stores").
- `MerchantStaff`-delegated store management (the table exists; this task doesn't extend its use).
- Suspension cascading to a merchant's existing stores (see "What suspension does and doesn't do").
- A real `DRAFT` save-and-resume application flow (the state is reserved in the `CHECK` constraint;
  no endpoint produces it).
- Production file/image uploads for a store's photos, logo, etc.
- Store-level commission/delivery-fee configuration beyond the existing merchant-level
  `commission_percent`.

## Related documents

- [`API-SPECIFICATION.md`](API-SPECIFICATION.md)
- [`DATABASE-DESIGN.md`](DATABASE-DESIGN.md) - `merchants`, `stores`, `service_zones` table specs
- [`AUTHENTICATION-DESIGN.md`](AUTHENTICATION-DESIGN.md) - RBAC, `MERCHANT_OWNER` role assignment
- [`../01-requirements/FUNCTIONAL-REQUIREMENTS.md`](../01-requirements/FUNCTIONAL-REQUIREMENTS.md) -
  FR-MER-001, FR-MER-003, FR-MER-004, FR-MER-005, FR-ADM-001
