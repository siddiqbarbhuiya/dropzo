# Database design review (BC-003.1)

**Status: Resolved (BC-003.2).** This review's findings were addressed by product-owner decisions
and incorporated into a full revision of [`DATABASE-DESIGN.md`](DATABASE-DESIGN.md) in BC-003.2.
This document is kept as the historical record of the review itself — it is not rewritten to look
as though the corrections already existed when it was written. See
[`../06-delivery/PROGRESS.md`](../06-delivery/PROGRESS.md) (BC-003.2 section) for what changed and
why, and the current [`DATABASE-DESIGN.md`](DATABASE-DESIGN.md) for the resulting design.

Original status when written: **Proposed** — this was a review of `DATABASE-DESIGN.md` as it stood
after BC-003. It did not change that document at the time; see "Proposed corrections" below for
what was recommended, since approved. No schema, migration, or Prisma installation resulted from
this review.

## 1. Overall assessment

The current `DATABASE-DESIGN.md` is a correct **high-level entity/module overview**, but it is a
step back in detail from the original design work this project is based on (the ChatGPT roadmap
that produced full `CREATE TABLE` SQL, enums, checks, and indexes). BC-003 deliberately
consolidated that detail into a module-by-table list plus a simplified ERD, to keep the document
short. That consolidation went slightly too far: several entities explicitly required by this
review's checklist are missing entirely, and no document in the repository currently specifies
columns, keys, constraints, or indexes at a level a Prisma schema could be written from directly.

**Recommendation: restore column-level detail before Prisma work starts**, either by expanding
`DATABASE-DESIGN.md` or by keeping it as the module index and adding one file per module with the
actual table definitions. This review proposes which, see "Proposed corrections."

## 2. Missing entities

Classified per the requested checklist (section 2.1). "Present" means listed in the current
`DATABASE-DESIGN.md` table; "In ERD" means it also appears in the Mermaid diagram.

| Entity group                                   | Present?             | In ERD?                                                                 | Classification                                                                                                                        | Note                                                                                                                                                   |
| ---------------------------------------------- | -------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Users, roles, sessions, addresses              | Yes                  | Partial (addresses only)                                                | MVP required                                                                                                                          | `user_roles`, `user_sessions` missing from the diagram                                                                                                 |
| Merchants, merchant staff, stores              | Yes                  | Partial (stores only)                                                   | MVP required                                                                                                                          | `merchant_staff` missing from the diagram                                                                                                              |
| Service zones, store locations                 | Yes (as two tables)  | No                                                                      | MVP required (service zones); **store_locations questionable**                                                                        | See finding #1 below                                                                                                                                   |
| Categories, products, variants, store listings | Yes                  | Yes                                                                     | MVP required                                                                                                                          | OK                                                                                                                                                     |
| Inventory, stock movements, stock reservations | Partial              | **`stock_reservations` missing from ERD entirely**                      | MVP required                                                                                                                          | See finding #2                                                                                                                                         |
| Stock batches and expiry                       | Yes                  | Yes                                                                     | MVP optional (only matters once perishables are sold)                                                                                 | OK, correctly scoped                                                                                                                                   |
| Carts and cart items                           | **Missing from ERD** | No                                                                      | MVP required                                                                                                                          | Listed in the table but absent from the diagram                                                                                                        |
| Orders, order items, order status history      | Yes                  | Yes                                                                     | MVP required                                                                                                                          | OK                                                                                                                                                     |
| Payments, refunds, webhook events              | Partial              | **Only `payments` in ERD; `refunds`, `payment_webhook_events` missing** | Payments: MVP required (even for COD, a payment record exists). Refunds/webhooks: MVP optional until online payment ships             | See finding #3                                                                                                                                         |
| Pickup verification                            | Yes                  | Yes                                                                     | MVP required                                                                                                                          | OK                                                                                                                                                     |
| Delivery partners and assignments              | Yes                  | Yes                                                                     | MVP required (manual assignment still needs these tables)                                                                             | OK                                                                                                                                                     |
| Commissions, settlements, financial ledger     | Partial              | Partial                                                                 | Settlements: MVP optional (needed once merchants are paid out, not for the very first pilot order). **No ledger table exists at all** | See finding #4 — significant gap                                                                                                                       |
| Coupons and promotions                         | **Missing entirely** | No                                                                      | Future phase                                                                                                                          | Not in MVP scope per `docs/00-project/SCOPE.md` (deferred) — correct to omit for now, but should be listed as explicitly deferred, not silently absent |
| Notifications and notification devices         | **Missing entirely** | No                                                                      | MVP optional                                                                                                                          | Needed for order-status push notifications; arguably MVP-required for a usable product, but no FR currently covers it — see open question in section 9 |
| Complaints and audit logs                      | Yes                  | **Missing from ERD**                                                    | Complaints: MVP optional. Audit logs: **MVP required** (NFR-SEC-003 explicitly requires this)                                         | See finding #5                                                                                                                                         |
| Idempotency records and outbox events          | **Missing entirely** | No                                                                      | **MVP required**                                                                                                                      | See finding #6 — significant gap, contradicts NFR-API-001                                                                                              |

## 3. Incorrect relationships

- **Finding #1 — `store_locations` as a separate table is likely wrong.** The original design (and
  the `stores` table itself) puts a `location GEOGRAPHY(POINT, 4326)` column directly on `stores`.
  A separate `store_locations` table implies a one-to-many relationship (multiple locations per
  store) that no requirement currently describes. Recommend: drop `store_locations` as a table;
  keep `location` as a column on `stores`, unless a real future need (e.g. multiple pickup points
  per store) justifies the split — and if so, make that relationship explicit in the ERD.
- No other relationship in the current ERD is factually wrong; the ones present (merchant→stores,
  store→store_products, product→variants, etc.) are consistent with `BUSINESS-RULES.md`.

## 4. Missing constraints and indexes

The current `DATABASE-DESIGN.md` specifies none at the column level — it stops at table names and
one prose paragraph of principles. This is not an error so much as a gap: the document cannot yet
be used to write a correct Prisma schema. At minimum, before implementation, the following must be
specified per table (not necessarily in this document, but somewhere before BC-004 schema work):

- Primary keys (UUID, per the stated principle) and foreign keys for every relationship shown in
  the ERD.
- Unique constraints: e.g. `(store_id, variant_id)` on `store_products`, so a store can't list the
  same variant twice; `(phone)` on `users`.
- Indexes: at minimum on frequently filtered/joined columns — `orders(customer_id, created_at)`,
  `orders(store_id, status)`, `stock_batches(inventory_id, expiry_date)`, a GIST index on any
  geography column.
- Nullability: explicit for every column, not assumed.
- Decimal precision for monetary columns (e.g. `NUMERIC(12,2)`) — the principle is stated
  ("NUMERIC/decimal, never floating-point") but no actual precision/scale is specified anywhere.
- Check constraints for obvious invariants (e.g. `reserved_quantity + blocked_quantity <=
on_hand_quantity` on `inventory`).

## 5. Data-integrity problems

- **Finding #6 (detail): no idempotency mechanism is modelled.** `BUSINESS-RULES.md` and
  `NON-FUNCTIONAL-REQUIREMENTS.md` (NFR-API-001) both require that a repeated checkout or payment
  webhook never create a duplicate order or charge. Without an `idempotency_records` table (or an
  equivalent unique idempotency-key constraint directly on `orders`/`payments`), this requirement
  has no data-model support. This must be added before the checkout/payment modules are built.
- **Finding #4 (detail): no financial ledger.** `settlements`/`settlement_items` aggregate
  completed orders into payouts, but there's no append-only record of individual financial events
  (commission charged, refund issued, adjustment made) independent of settlement batching. Without
  one, reconstructing "what happened and why" for a disputed settlement requires replaying order
  history instead of reading a ledger. Recommend adding a `ledger_entries` (or similarly named)
  table: append-only, one row per financial event, referencing its source (order, refund,
  settlement).
- Order price snapshots are correctly described in principle ("Order item prices are historical
  snapshots") but, again, no actual snapshot columns are specified (e.g. `order_items` needs its
  own `product_name_snapshot`, `unit_price`, not a live reference to `store_products`).

## 6. Security issues

- **Merchant data isolation**: the ERD and table list support this (orders/stores are scoped to a
  merchant via `stores.merchant_id`), but there is no explicit mention of how NestJS guards will
  enforce it at the data-access layer — that belongs in `SECURITY-STANDARDS.md` (already states
  the rule) and in the eventual repository/service layer, not the schema itself. No schema change
  needed, but call this out so BC-004 doesn't treat the schema alone as sufficient.
- **Pickup verification code security**: `pickup_verifications` is listed, but the document
  doesn't state that the code must be stored hashed, not plaintext. `BUSINESS-RULES.md` already
  states this rule; the schema document should explicitly note the column is a hash, with an
  `expires_at` and an `attempt_count` for rate-limiting repeated guesses (the original full design
  had these columns; they should not be lost in the consolidated version).
- **Personal information handling**: `user_addresses` and `users` will hold PII (phone, address).
  No explicit note on this in the design doc. Recommend a short note on retention/deletion once
  authentication is designed (NFR scope, not schema scope, but worth a forward reference).
- **Payment data handling**: correctly, no card/payment-credential storage is implied anywhere in
  the design — the gateway handles that. This is consistent with `SECURITY-STANDARDS.md`.
- **Audit logs**: present in the table list but, per finding #5, missing from the ERD and without
  any stated structure (what fields an audit log row needs: actor, action, entity, before/after,
  timestamp). This needs to exist before any sensitive operation (refund, stock adjustment,
  merchant suspension) is implemented, per NFR-SEC-003.
- **Idempotency and webhook security**: see finding #6. No webhook-event table exists to record
  that a given provider webhook ID was already processed, which is required to make webhook
  handling idempotent and safe against replay.

## 7. Concurrency risks

- `stock_reservations` is named in the table list as the mechanism for reserving stock during
  checkout, but it does not appear in the ERD, and no reservation **expiry** column or cleanup
  mechanism is described. Without reservation expiry, an abandoned checkout (customer closes the
  tab before paying) would hold stock reserved indefinitely. This must be resolved before
  checkout/payment implementation — not a documentation nitpick, a real correctness bug if left
  unspecified.
- The "last unit" / concurrent-checkout scenario is correctly called out as a principle in
  `BUSINESS-RULES.md` ("Stock reservations must prevent overselling... use row locking"), but the
  design document itself doesn't specify the actual locking strategy (e.g. `SELECT ... FOR UPDATE`
  on the `inventory` row) — this belongs in the eventual implementation task, not necessarily this
  document, but should be referenced from here so it isn't forgotten.

## 8. MVP vs. future-phase recommendations

**MVP required** (needed for the first working pickup-order milestone described in the roadmap):
`users`, `user_roles`, `user_sessions`, `user_addresses`, `merchants`, `merchant_staff`, `stores`,
`service_zones`, `categories`, `products`, `product_variants`, `store_products`, `inventory`,
`stock_movements`, `stock_reservations`, `carts`, `cart_items`, `orders`, `order_items`,
`order_status_history`, `payments`, `pickup_verifications`, `audit_logs`, an idempotency mechanism
(new), and a financial ledger (new, recommended).

**MVP optional** (needed once delivery/stock features mature, but not for the first pickup order):
`stock_batches` (perishables), `delivery_partners`, `delivery_assignments`, `refunds`,
`payment_webhook_events`, `settlements`, `settlement_items`, `complaints`.

**Future phase** (explicitly deferred per `docs/00-project/SCOPE.md`): coupons/promotions, loyalty,
subscriptions, notifications/notification_devices (pending the open question in section 9).

## 9. Proposed corrections, with reasons

1. **Add `stock_reservations` to the ERD** with a relationship from `inventory`, and specify its
   expiry column. Reason: it's already named as required in the table list; its absence from the
   diagram and lack of an expiry mechanism is a real gap, not just a presentation issue.
2. **Add `carts`/`cart_items` to the ERD.** Reason: currently invisible in the diagram despite
   being core to the checkout flow.
3. **Add `refunds` and `payment_webhook_events` to the ERD**, linked from `payments`. Reason:
   needed to reason about the payment lifecycle even though full online-payment support is a later
   phase — the schema should exist from the start so it isn't retrofitted.
4. **Add a `ledger_entries` (financial ledger) table.** Reason: requested explicitly in this
   review's checklist and genuinely missing; needed for auditable settlements and refunds.
5. **Add an idempotency mechanism** (`idempotency_records` table, or a unique idempotency-key
   column on `orders`/`payments`). Reason: required by NFR-API-001 and currently has no schema
   support at all.
6. **Resolve `store_locations`**: either drop it as a standalone table (recommended — put
   `location` directly on `stores`) or justify it explicitly if a real one-to-many need exists.
   Reason: avoids an unnecessary join and an undocumented relationship.
7. **Specify column-level detail for at least the MVP-required tables** before Prisma schema work
   begins (keys, types, constraints, indexes, nullability) — either expand
   `DATABASE-DESIGN.md` or split it into one file per module under `docs/04-design/`. Reason:
   the current document cannot be translated into a correct Prisma schema without this.
8. **Add `audit_logs` to the ERD** with its required fields (actor, action, entity, before/after
   snapshot, timestamp). Reason: required by NFR-SEC-003 and currently has no structure defined.
9. **Explicitly list deferred entities (coupons, promotions, notifications) in the document**, even
   though they're out of MVP scope, so a future reader knows they were considered, not forgotten.
   Reason: consistent with the project's own "Planned vs. Deferred" labelling convention.

None of these corrections have been applied to `DATABASE-DESIGN.md` — this review only proposes
them, per the instruction not to silently change the design.

## 10. Decisions requiring product-owner approval

1. **Should `DATABASE-DESIGN.md` be expanded in place, or split into per-module files?** (See
   correction #7.) Affects how BC-004 will reference it.
2. **Is a financial ledger actually wanted for the MVP**, or is settlement-level aggregation
   (current design) acceptable until real money starts moving? (Correction #4.)
3. **Should notifications/notification_devices be MVP-required** (needed for order-status updates
   to feel real) **or genuinely deferred** until a later phase? Currently unclassified in any
   requirements document.
4. **Is `store_locations` meant to be a real one-to-many relationship**, or was it simply shorthand
   for "stores have a location" in the earlier planning conversation? (Correction #6.)
5. **Approval to proceed with BC-004 using the corrected design** (once the above are resolved),
   or to treat the schema expansion itself as a distinct task before BC-004 starts.

## Related documents

- [`DATABASE-DESIGN.md`](DATABASE-DESIGN.md)
- [`BUSINESS-RULES.md`](BUSINESS-RULES.md)
- [`../01-requirements/FUNCTIONAL-REQUIREMENTS.md`](../01-requirements/FUNCTIONAL-REQUIREMENTS.md)
- [`../01-requirements/NON-FUNCTIONAL-REQUIREMENTS.md`](../01-requirements/NON-FUNCTIONAL-REQUIREMENTS.md)
- [`../06-delivery/BC-004-IMPLEMENTATION-PLAN.md`](../06-delivery/BC-004-IMPLEMENTATION-PLAN.md)
