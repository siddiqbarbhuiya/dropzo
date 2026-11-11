# COD delivery collection and handover reconciliation design (BC-010)

**Status:** Implemented. Covers `LedgerService.postDeliveryCodCollection`
(`apps/api/src/common/ledger/ledger.service.ts`) and `DeliveryCodService`
(`apps/api/src/delivery/delivery-cod.service.ts`). Builds on BC-009's COD-at-pickup ledger design
(`ORDER-FULFILMENT-DESIGN.md`) and `DATABASE-DESIGN.md`'s "Financial accounting model," which this
task closes the one documented gap in: the delivery-fee ledger leg BC-009 explicitly deferred ("no
delivery-fee leg - this milestone is pickup-only").

## Resolving the one real ambiguity

`DATABASE-DESIGN.md`'s "What posts, and when" table specified a delivery-fee row whose exact
account treatment was left open: "`DEBIT MERCHANT_PAYABLE` or `COD_CASH_CLEARING` (depending on who
collects it)." This task resolves it as follows, and this document is now the authoritative record
of that resolution (no change to `DATABASE-DESIGN.md`'s table itself beyond cross-linking here):

**For home delivery, the delivery partner always collects the cash at the customer's doorstep -
never the merchant.** The full amount collected (merchandise + delivery fee) therefore enters
`COD_CASH_CLEARING`, the same account BC-009 already uses for merchant-collected pickup COD, since
that account represents "cash out in the field, not yet reconciled to the platform" regardless of
_which_ field actor (merchant or delivery partner) is physically holding it. No new financial
account was invented - the existing fixed chart of accounts (`MERCHANT_PAYABLE`,
`PLATFORM_COMMISSION_REVENUE`, `PLATFORM_DELIVERY_REVENUE`, `COD_CASH_CLEARING`) is reused exactly
as `DATABASE-DESIGN.md` already specifies it, satisfying "do not invent financial accounts."

## The posting (`LedgerService.postDeliveryCodCollection`)

Posted in the same transaction as delivery completion (`DeliveryWorkflowService.completeDelivery`),
immediately after the COD payment capture - never a separate, later step that could be missed or
duplicated. One balanced `ledger_transactions` row
(`transaction_type: 'ORDER_SALE_COD_DELIVERY'`), up to four entries:

| Leg                 | Direction                                                       | Account                     | Amount                                                                                                       |
| ------------------- | --------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Gross collection    | DEBIT                                                           | `COD_CASH_CLEARING`         | `total_amount` (merchandise + delivery fee)                                                                  |
| Merchandise payable | CREDIT                                                          | `MERCHANT_PAYABLE`          | `total_amount - delivery_fee`                                                                                |
| Delivery revenue    | CREDIT                                                          | `PLATFORM_DELIVERY_REVENUE` | `delivery_fee` (omitted entirely when zero)                                                                  |
| Commission          | DEBIT `MERCHANT_PAYABLE` / CREDIT `PLATFORM_COMMISSION_REVENUE` | —                           | `commission_percent` applied to the **merchandise amount only** (never the delivery fee - omitted when zero) |

Debits always equal credits: `gross + commission = (merchandise + delivery_fee) + commission`. The
delivery fee is never commissioned - it is the platform's own revenue line, not part of what the
merchant is owed or what the platform takes a cut of. Both omission cases (`delivery_fee = 0`,
`commission_percent = 0`) follow the exact same conditional-leg pattern `postCodCollection` already
established for a zero commission - no new omission logic was invented.

Account lookup reuses `findOrCreateMerchantAccount`/`findOrCreatePlatformAccount`, the same
find-or-create helpers `postCodCollection` uses - no duplicate account-resolution logic.

### Regression: pickup COD accounting is unchanged

`postCodCollection` (BC-009, pickup-only) is untouched by this task - still exactly two legs, still
no delivery-fee leg (a pickup order's `delivery_fee` is always `0` and `fulfilment_type = PICKUP`
never reaches `postDeliveryCodCollection` at all). Verified directly by
`delivery.integration-spec.ts`'s "Pickup COD accounting remains unchanged (regression)" suite,
which asserts a plain pickup order still produces exactly 4 ledger entries (2 legs) via the
original method.

## Cash handover reconciliation (`DeliveryCodService`)

A delivery partner's **cash-in-custody balance is always derived, never stored as an editable
counter**: `SUM(delivery_assignments.cod_collected_amount) WHERE delivery_partner_id = ? AND
handover_id IS NULL`. There is no separate "balance" column anywhere that could drift from the
underlying collection records - satisfying "partner cash-in-custody balance must be derived from
authoritative financial/collection records, not editable frontend totals."

- **`getOwnCodSummary` / `adminGetSummary`**: the derived outstanding balance, plus the list of
  collected-but-not-yet-handed-over assignments (order id, amount, collection timestamp).
- **`recordHandover`** (admin-only): takes a delivery-partner id and a set of order ids. Validates,
  in order: every order id resolves to an assignment belonging to _that_ partner (not just any
  partner); every one of them has actually had COD collected (`cod_collected_amount IS NOT NULL`);
  none of them is already attached to an earlier handover (`handover_id IS NOT NULL`). Only then
  does it create one `delivery_cod_handovers` row (summing the included assignments' amounts) and
  stamp every included assignment's `handover_id` in the same transaction.
- **Duplicate-handover prevention**: the second half of the validation above rejects re-including
  an already-handed-over order outright (a clear `409`); the `updateMany({ where: { ...,
handover_id: null } })` guard inside the transaction is a second, concurrency-safe layer - if two
  admins somehow raced to record overlapping handovers, the loser's `updated.count !==
assignments.length` check catches it even though the pre-check alone might have raced past.
- **Partial handovers across assignments, not within one**: a handover always covers a chosen
  assignment's **full** collected amount - there is no partial-amount-per-order handover. Handing
  over _some but not all_ outstanding assignments (a partial handover across the partner's total
  outstanding balance) is fully supported, since `recordHandover` takes an explicit, admin-chosen
  subset of order ids rather than "settle everything outstanding." This is a deliberate, documented
  MVP limitation (splitting a single collected amount across two handovers would need a schema
  change this task did not make), not an oversight.

## What was deliberately not built

- No new financial accounts or journal-entry types beyond the one new transaction type
  (`ORDER_SALE_COD_DELIVERY`) and the one new ledger leg (delivery revenue) `DATABASE-DESIGN.md`
  already anticipated.
- No automatic reconciliation, settlement generation, or payout flow for delivery partners - cash
  handover is recorded as a fact (admin received it), not disbursed or settled automatically.
- No refund/cancellation handling triggered by a failed delivery - `reportFailure` never touches
  `payments` or the ledger at all, since a failed delivery (by construction) never reached the
  verification step that would have collected any cash in the first place.
