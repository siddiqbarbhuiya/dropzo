# Store listings and inventory management design

**Status:** Implemented (BC-007). See [`API-SPECIFICATION.md`](API-SPECIFICATION.md) for exact
endpoints and [`DATABASE-DESIGN.md`](DATABASE-DESIGN.md) for the `store_products`/`inventory`/
`stock_batches`/`stock_movements` table specs (all modeled by BC-004; this task is almost entirely
an application-layer build on top of that schema, not a schema build). Builds on BC-005 auth and
BC-006 ownership ([`MERCHANT-STORE-DESIGN.md`](MERCHANT-STORE-DESIGN.md)); neither is re-reviewed
here. Cart/checkout/reservations (`carts`, `stock_reservations`) remain out of BC-007's scope.

## Store listings (`StoreProductService`)

A `StoreProduct` connects one store to one global `ProductVariant`, with its own
`selling_price`, optional `mrp`, `is_available` flag, and `uses_batch_tracking` choice.
`@@unique([store_id, variant_id])` makes "one listing per store per variant" a database guarantee,
not just a service-layer check; `createListing` maps that unique-violation to a `409 Conflict`.
The same variant may be listed by many different stores (no cross-store uniqueness), each with its
own independent price/availability - rows are entirely independent once created.

Every listing gets its paired `Inventory` row created in the same transaction (`on_hand_quantity`
starts at `0`) - a `StoreProduct` can never exist without its `Inventory` counterpart, so every
later inventory operation can assume one exists. `usesBatchTracking` and `variantId` cannot be
changed after creation (`UpdateListingDto` deliberately omits both) - switching tracking mode after
stock already exists would leave `on_hand_quantity` and any `stock_batches` rows inconsistent with
each other.

**Availability vs stock are deliberately separate fields.** `is_available` is the merchant's own
on/off switch; `on_hand_quantity` is the physical count. An inactive listing is never purchasable
even if `on_hand_quantity > 0` (that check belongs to the future cart/checkout feature, which must
read both fields) - BC-007 only guarantees the two fields exist independently and are never
conflated by this layer.

**Ownership, every time.** Every mutating and read method starts from `StoreService.getOwnStore`
(resolves the store from the authenticated user, BC-006) and, for mutations,
`MerchantApplicationService.getMerchantForOwner` plus a suspension check - the same
`assertNotSuspended`-style pattern BC-006 introduced. A `listingId` is never trusted alone; lookups
are always scoped `WHERE id = ? AND store_id = ?`, so one store can never read or mutate another
store's listing even with a guessed id.

## Stock mutation surface (`InventoryService`)

Merchants can **never** change `on_hand_quantity` through the generic listing update endpoint -
`UpdateListingDto` has no quantity field at all. Every quantity change goes through one of three
dedicated, transactional operations, each of which locks the inventory row (and any batch rows it
touches) with `SELECT ... FOR UPDATE`, updates it, and writes a `stock_movements` row recording the
actor and (for adjustments/removals) a mandatory reason, all inside one `$transaction`:

- **Receive** (`POST .../inventory/receive`) - initial or additional stock. For a batch-tracked
  listing, either tops up an existing batch (`batchId` given) or creates a new one; for a
  non-batch-tracked listing, increments the aggregate counter directly. Always a `RECEIVED`
  movement.
- **Adjust** (`POST .../inventory/adjustments`) - a signed stocktake/correction. **Reason is
  mandatory** (`@Length(3, 2000)` on the DTO). Increasing batch-tracked stock requires an explicit
  `batchId` (there is no sensible default for "which batch gained inventory"); decreasing may name
  a batch or let FEFO choose. Always an `ADJUSTED` movement.
- **Remove** (`POST .../inventory/removals`) - `DAMAGED` or `EXPIRED` write-off. **Reason is
  mandatory.** `EXPIRED` is further restricted to batches that have actually passed their own
  `expiry_date` - removing a non-expired batch under `type: 'EXPIRED'` is rejected with `409`, a
  dedicated check distinct from FEFO's normal expired-batch _exclusion_ (see below).

### `stock_movements.quantity` sign convention

The schema does not dictate a sign convention for this column, so one is fixed here: `RECEIVED`,
`DAMAGED`, and `EXPIRED` always store a positive magnitude (direction is implied by
`movement_type`); `ADJUSTED` stores the **signed** delta, since one movement type covers both
stocktake increases and decreases.

### Non-negative, concurrency-safe, never a reservation bypass

For a **non-batch-tracked (aggregate)** listing, every decrease (`adjustStock` with a negative
delta, or `removeStock`) is checked against `on_hand_quantity - reserved_quantity` _before_ the
update, raising a clean `409 Conflict` rather than surfacing the database's own
`chk_inventory_*` non-negative `CHECK` constraints as an unhandled `500`. For a **batch-tracked**
listing, the same respect for `reserved_quantity` is built into FEFO batch selection itself (see
below) - a batch whose `reserved_quantity` already accounts for the full `on_hand_quantity`
contributes nothing to the available total. Either way, locking the inventory row (and, for
batch-tracked listings, every candidate batch row) with `FOR UPDATE` before computing availability
is what makes this check race-free under concurrent requests, not merely correct in isolation.

### FEFO batch selection (`consumeFefo`)

When a batch-tracked decrease does not name a specific `batchId`, candidate batches are locked and
consumed in the exact order BC-004's own test helper (`test/helpers/reservation.ts`'s
`reserveFefo()`) already established and proved deadlock-free: **inventory row locked first, then
candidate batch rows locked in `expiry_date ASC NULLS LAST, id ASC` order** - the `id` tiebreaker
gives a deterministic global total order across batches sharing an expiry date (including no
expiry date at all), which is what prevents two concurrent operations from ever locking the same
pair of rows in opposite orders. Allocation is greedy: take what's available from the
earliest-eligible batch, move to the next, until the requested quantity is covered or eligible
stock runs out (-> `409 Conflict`, the whole transaction rolls back, so a partially-covered
decrease is never partially applied).

Which batches are "eligible" depends on _why_ stock is leaving:

- **`AVAILABLE`** (adjustments, `DAMAGED` removal): excludes already-expired batches
  (`expiry_date IS NULL OR expiry_date >= CURRENT_DATE`) and never allocates more than a batch's
  own `on_hand_quantity - reserved_quantity` - this is the "no expired-batch allocation, no
  reservation bypass" rule from the task's security section, applied to every decrease operation
  that isn't explicitly about expiry.
- **`EXPIRED_ONLY`** (`EXPIRED` removal): the inverse filter -
  `expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE` - since this operation's entire purpose
  is writing off stock that has already gone bad; a batch that hasn't expired cannot be removed
  this way, named explicitly or chosen by FEFO.

A future reservation/checkout feature (`StockReservation`/`StockReservationItem`, out of BC-007's
scope) must take the same inventory-first lock order against this code to stay deadlock-free -
this is the one coupling point a later milestone needs to preserve.

## Audit and movement history

Every stock mutation and listing create/update calls `AuditService.record()` with the real
`store_products.id` (or, where more specific, the mutation's own semantics) as `entityId` - never a
non-UUID value, the same convention BC-005's own bug fix established.
`GET .../inventory/movements` and `GET .../inventory` (snapshot, including current batches) give a
merchant the audit trail required by the task: every `stock_movements` row is retained forever
(no update/delete path exists for it), newest-first, paginated with the same `PaginationDto`
convention used throughout.
