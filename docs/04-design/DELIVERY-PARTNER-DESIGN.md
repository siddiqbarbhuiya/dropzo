# Delivery partner management design (BC-010)

**Status:** Implemented. Covers `DeliveryPartnerService` and
`AdminDeliveryPartnersController`/`DeliveryPartnerController`
(`apps/api/src/delivery/delivery-partner.service.ts` and the two controller files). See
[`DELIVERY-MANAGEMENT-DESIGN.md`](DELIVERY-MANAGEMENT-DESIGN.md) for the assignment/workflow this
partner profile participates in.

## Deliberately minimal onboarding

Per the task brief ("do not require document uploads in this MVP", "do not create a complicated
KYC workflow", "do not introduce a new paid identity or verification provider"), a delivery partner
is nothing more than:

1. An existing `users` row - a delivery partner registers the same way every other user does
   (ordinary OTP login, which always starts as `CUSTOMER` - see `AUTHENTICATION-DESIGN.md`). There
   is no separate delivery-partner registration flow and no bare-user creation inside this module.
2. A `DELIVERY_PARTNER` row in `user_roles`, granted the same way every non-default role is granted
    - `UserRole.upsert`, the exact mechanism `AdminRolesController` already uses (BC-005).
3. One `delivery_partners` row: `vehicle_type` (free text, optional), `is_approved`, `is_available`.

`DeliveryPartnerService.adminCreate` does steps 2 and 3 together, in one transaction, given an
existing user id. There is no document-upload field, no verification-provider integration, and no
multi-stage KYC state machine - a single admin action is the entire onboarding flow.

## `is_approved` vs. `is_available` - two independent flags, not one

- **`is_approved`** (admin-controlled): doubles as both "has this admin vetted and created this
  partner" and "is this partner currently active." The brief's "create or approve a delivery
  partner" and "activate or deactivate a delivery partner" are the same toggle in this design - a
  partner is created already approved (`adminCreate` sets `is_approved: true`), and
  `adminSetActive` flips the same column either direction. Adding a separate `is_active` column
  alongside `is_approved` would be a distinction without a difference for this MVP (there is no
  intermediate "approved but not yet active" state anyone needs), so one column does both jobs.
- **`is_available`** (partner-controlled): the partner's own "I'm online and can take an
  assignment" toggle (`setAvailability`), independent of admin approval. An inactive
  (`is_approved = false`) partner cannot toggle availability at all
  (`ConflictException` in `setAvailability`) - deactivation is the authoritative "stop receiving
  assignments" signal, not something a partner's own availability setting can override.

## RBAC and ownership

- **Admin** (`AdminDeliveryPartnersController`, `@Roles('ADMIN', 'SUPER_ADMIN')`): create, list
  (optionally filtered by `isActive`), get one (with their current active assignment, if any),
  activate, deactivate, view COD summary/handover history. Every admin action is audit-logged
  (`DELIVERY_PARTNER_CREATED`/`_ACTIVATED`/`_DEACTIVATED`).
- **Partner** (`DeliveryPartnerController` + `DeliveryWorkflowController`,
  `@Roles('DELIVERY_PARTNER')`): own profile, own availability, own current assignment, own
  assignment actions, own COD summary. Every lookup resolves the partner from the authenticated
  user first (`getOwnPartnerOrThrow`, shared by `DeliveryAssignmentService`'s uniqueness check and
  `DeliveryWorkflowService.assertOwnAssignment`) - a partner id is never accepted as a client
  parameter, never looked up by a value the partner supplies. A partner cannot access or infer the
  existence of another partner's assignment (a mismatched order id is a `404`, not a `403`).
- No sensitive customer or merchant information is exposed to a partner beyond what their current
  assignment's order actually needs (store pickup address and customer delivery address, both
  already present on the `orders` row they're scoped to) - no admin notes, no other customers'
  data, no other partners' data.

## Eligibility for assignment

An inactive partner (`is_approved = false`) is rejected at assignment time
(`DeliveryAssignmentService.assign` throws `ForbiddenException` before ever touching
`delivery_assignments`) - deactivating a partner takes effect immediately for any _new_ assignment,
though it does not retroactively cancel one already in progress (an in-flight delivery is left to
complete or fail normally; the brief does not ask for forced interruption of active work).

A partner's active-assignment limit (at most one at a time, this MVP's reading of "must not exceed
any configured active-assignment limit" - see `DELIVERY-MANAGEMENT-DESIGN.md`) is enforced at the
database level via the `uq_delivery_assignments_partner_active` partial unique index, not merely
checked in application code - the same DB-enforced-invariant pattern BC-003.3's reservation design
established for "at most one active reservation per cart/order."

## What was deliberately not built

- Document uploads (license, vehicle registration, ID proof) - no field exists for any of these.
- A multi-step KYC/verification workflow - there is exactly one approval flag.
- A third-party identity or background-check provider integration.
- Automatic partner-matching or dispatch optimization - assignment is always a manual admin action
  (`ADR-0010`).
- Live location/GPS tracking of a partner.

Any of these would be a new, separate task with its own ADR if the business later needs it -
nothing here was built with an eye toward silently enabling them.
