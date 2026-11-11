---
name: dropzo-database-prisma
description: PostgreSQL and Prisma schema/migration changes for Dropzo, plus the concurrency and integration tests they require. Use for any change touching the database schema, a Prisma migration, inventory, orders, payments, the financial ledger, or reservation logic. This is the most consequential skill in the toolkit - the database design has been through three review rounds and is closed; do not casually deviate from it.
when_to_use: "add a migration", "change the schema", "Prisma", database design, inventory, FEFO, reservations, ledger, settlement, idempotency, webhook
paths: "apps/api/prisma/**"
---

# Dropzo: database schema, Prisma, and concurrency

## Purpose

[`docs/04-design/DATABASE-DESIGN.md`](../../../docs/04-design/DATABASE-DESIGN.md) is the
**finalized, closed** canonical specification (as of BC-003.4 — three independent review rounds).
This skill's job is to keep Prisma implementation, migrations, and tests faithful to that document
— not to re-derive schema decisions ad hoc, and not to reopen the review.

## When to use this skill

- Writing or changing `apps/api/prisma/schema.prisma`.
- Writing or reviewing a Prisma migration.
- Implementing checkout, stock reservation, order, payment, refund, settlement, or notification
  logic that touches the database.
- Writing a concurrency or integration test for any of the above.

## When NOT to use this skill

- Changing the _design_ itself (table shape, new business rule) — that requires updating
  `DATABASE-DESIGN.md` through the same rigor as its prior revisions, with product-owner approval;
  it is not a decision to make inline while implementing. If you believe the design has an actual,
  demonstrable defect (not a preference), say so explicitly and stop rather than silently diverging
  — see `DATABASE-DESIGN.md`'s own framing: "further changes should only happen if BC-004
  implementation discovers an actual, demonstrable defect."
- Frontend-only changes — use `dropzo-frontend-e2e`.

## Mandatory rules this skill must enforce

These are not suggestions — they are specific, already-decided invariants from
`DATABASE-DESIGN.md` and [`BUSINESS-RULES.md`](../../../docs/04-design/BUSINESS-RULES.md):

- **Merchant tenant isolation**: every query must be scoped to the authenticated user's own
  merchant (via `merchant_staff`/`merchants.owner_user_id`) — never trust a merchant ID from the
  request alone.
- **One store per order** (MVP) — an order's `store_id` is singular; do not implement multi-store
  checkout.
- **Inventory concurrency / last-unit protection**: checkout must lock the `inventory` row
  (`SELECT ... FOR UPDATE`) before checking availability and reserving stock, all in one
  transaction.
- **Stock reservations and expiry**: every reservation has an `expires_at`; releasing/expiring one
  must restore exactly the batch/quantity it held — see "Reservation lifecycle" in
  `DATABASE-DESIGN.md`.
- **FEFO batch allocation**: allocate `expiry_date ASC NULLS LAST, id ASC` (the `id` tiebreaker is
  required for deadlock-safe locking — don't drop it for convenience).
- **Never mix batch-tracked and counter-based inventory for the same listing** —
  `store_products.uses_batch_tracking` decides which, exclusively.
- **Balanced, double-entry financial ledger**: every `ledger_transactions` row's entries must debit
  = credit; never `UPDATE`/`DELETE` a posted `ledger_entries`/`ledger_transactions` row — see
  "Financial accounting model."
- **Corrections are reversal/adjustment transactions**, never edits to history.
- **COD recognition point**: the `ORDER_SALE` ledger transaction posts when `orders.status`
  becomes `COMPLETED`, not at order placement.
- **Refund and settlement reconciliation**: follow the worked example in "Settlement
  reconciliation" exactly — the payout entry is tagged with its own settlement at creation; a
  failed payout re-exposes its amount via `OR settlement.status = 'FAILED'`, never by editing
  history.
- **Payment webhook idempotency**: rely on the `(provider, provider_event_id)` unique constraint,
  not an application-level "have I seen this before" check alone.
- **Outbox and notification deduplication**: database-side processing is idempotent
  (`notifications.source_outbox_event_id` unique); external push delivery is at-least-once by
  design — do not attempt to "fix" this with more database constraints; the mitigation is the
  client-side dedup key (`notifications.id`), already specified.
- **Audit logging and scoped idempotency**: `idempotency_records` keys are scoped
  `(scope, user_id, idempotency_key)`; `orders.idempotency_key` is scoped
  `(customer_id, idempotency_key)` — never a bare global unique key.

## Workflow

1. Open `DATABASE-DESIGN.md` and find the exact table(s) involved — column names, types,
   constraints, indexes, `ON DELETE` behavior. Copy these faithfully into Prisma; do not
   paraphrase or "improve" them inline.
2. Work through `DATABASE-DESIGN.md`'s **"Prisma Implementation Readiness Checklist"** before
   generating a migration — it lists every constraint Prisma's schema language cannot express
   (the ledger balance trigger, the two `stock_reservations` partial unique indexes, the
   `financial_accounts` platform-account partial unique index, the `ledger_entries` partial index,
   several `CHECK` constraints, and the `UPDATE`/`DELETE` privilege revocation on ledger tables).
   Each of these needs a hand-written SQL step (`prisma migrate dev --create-only`, then edit the
   generated SQL) — generating the migration and stopping there silently reintroduces bugs that
   were specifically found and fixed across three review rounds.
3. Follow [`docs/06-delivery/BC-004-IMPLEMENTATION-PLAN.md`](../../../docs/06-delivery/BC-004-IMPLEMENTATION-PLAN.md)'s
   staged sequence — don't build the full schema in one step; it's explicitly staged.
4. Write the integration/concurrency tests listed in that plan's Stage 9 (last-unit race, ledger
   balance rejection, duplicate webhook, duplicate idempotency key, the worked settlement example
   reproduced against a real database) — these exist precisely because the design review found
   these exact failure modes possible if unguarded.

## Required checks

- `npx prisma validate` and `npx prisma migrate status` against a real database.
- Diff the generated migration SQL against `DATABASE-DESIGN.md`'s table specifications — don't just
  trust that Prisma generated something reasonable.
- The concurrency tests above, actually executed, not just written.

## Expected output

Schema/migration changes that match `DATABASE-DESIGN.md` exactly, with the custom-SQL invariants
present and tested, and a note of anything the checklist flagged as still open.

## Failure handling

- If a requirement in `DATABASE-DESIGN.md` seems wrong or impractical once you're actually
  implementing it, stop and say so explicitly — with the specific defect, not a preference — rather
  than quietly building something different.
- If a migration would be destructive against a non-empty database, stop and get explicit approval
  per `AGENTS.md`'s database rules, regardless of how the design document is worded.

## This skill does not

- Reopen database design review — see `dropzo-docs-and-adr` if a documented, approved change to
  `DATABASE-DESIGN.md` itself is actually needed.
- Guarantee migrations are reversible or that the schema is free of defects beyond what three
  review rounds already found — ordinary engineering judgment still applies.
