# Order creation and management design

**Status:** Implemented (BC-008). See [`API-SPECIFICATION.md`](API-SPECIFICATION.md) for exact
endpoints and [`DATABASE-DESIGN.md`](DATABASE-DESIGN.md) for the `orders`/`order_items`/
`order_status_history`/`payments`/`idempotency_records` table specs (all modeled by BC-004). Builds
on [`CART-CHECKOUT-DESIGN.md`](CART-CHECKOUT-DESIGN.md) - read that first for cart/checkout/
reservation lifecycle up to the point an order is created. Covers order creation, idempotency,
price snapshots, COD handling, reservation expiry, and customer-facing order retrieval only - no
merchant acceptance/fulfilment flow, no delivery assignment, no online payment (all later
milestones, per the task's explicit scope boundary).

## Abuse resistance: COD hoarding

COD needs no upfront payment, so nothing stops a customer from repeatedly creating orders against
scarce stock and never collecting any of them - each one holds `reserved_quantity` for up to the
24-hour acceptance window. An automated security review flagged this; two cheap, already-available
mitigations are in place: cart line quantity is capped at 1000 units (see
`CART-CHECKOUT-DESIGN.md`), and the app-wide `ThrottlerGuard` baseline (`AuthModule`, 30 requests/
minute/IP) already applies to `POST /checkout` like every other route. A stricter, checkout-specific
`@Throttle` override was tried and reverted: importing anything from `@nestjs/throttler` crashes
Jest's own `--experimental-vm-modules` worker ("Must use import to load ES Module") the moment any
test transitively loads the controller - the exact, already-documented incompatibility
`auth.integration-spec.ts`'s own `TestAuthAppModule` comment explains for the whole `ThrottlerModule`
(real Node resolves the package fine; only this project's Jest harness cannot). A genuine cap on how
many `CREATED` orders one customer may hold open at once is, separately, a product-policy decision
this task has no basis to invent (the right number depends on real usage patterns not yet observed)

- tracked as `RISK-014`/`TD-017` for a follow-up once real order volume exists, alongside revisiting
  the stricter per-route throttle once the Jest incompatibility is resolved or worked around.

## Order creation sequence (`CheckoutService.doCreateOrder`)

One transaction, in this order:

1. Reload the caller's `ACTIVE` cart (404 if none).
2. Re-price every line (`CartPricingService.priceCart(cartId, tx)`) and re-validate fulfilment
   (`FulfilmentValidationService.validate(..., tx)`) - **inside** this transaction, never reusing a
   result from an earlier `prepare` call. Any item/fulfilment error aborts with `409`.
3. Compare the client's `expectedTotalAmount` to the freshly computed total (±₹0.01 tolerance for
   floating-point rounding). A mismatch aborts with `409` - see "Never trust the client's prices"
   below for exactly what this field is and is not used for.
4. Generate a unique order number (`DZ` + date + 8 random hex chars), retried up to 5 times against
   a `UNIQUE` constraint collision - astronomically unlikely to ever need a second attempt, but
   never silently reused.
5. Create the `orders` row: `status = CREATED`, `payment_method = 'COD'`, the given
   `idempotency_key`, and **snapshots** of the store name/address and (for delivery) recipient
   name/phone/address - see "Price and content snapshots" below.
6. Create one `order_items` row per cart line, copying the product name, variant name, SKU, current
   unit price, and quantity at this exact moment.
7. **Reserve stock** for every line via `ReservationService.reserveForOrder` (see
   `CART-CHECKOUT-DESIGN.md` and `INVENTORY-MANAGEMENT-DESIGN.md` for FEFO/locking detail) -
   directly order-held, `expires_at` set to `ORDER_ACCEPTANCE_WINDOW_MS` (24 hours) from now. If any
   line's stock is insufficient, the whole transaction rolls back - no order, no items, no partial
   reservation ever persists.
8. Create a `payments` row: `provider = 'COD'`, `amount = total`, `status = PENDING`. **Never**
   `CAPTURED` at creation - COD is only ever marked paid by a later, out-of-scope fulfilment/
   collection step.
9. Insert an `order_status_history` row (`NULL -> CREATED`).
10. Transition the cart to `CHECKED_OUT` (never deleted - see `CART-CHECKOUT-DESIGN.md`).
11. Write an audit log entry (`ORDER_CREATED`).

If anything in steps 1-10 throws, the whole transaction rolls back atomically - Postgres is the
final enforcement layer here, not just the application-level checks in steps 2-3.

## Never trust the client's prices

`expectedTotalAmount` on the create-order request is **never used to compute the charge** - the
server always recomputes the authoritative total itself from current `store_products.selling_price`
rows (step 2/3 above). It exists purely to **detect a stale cart**: if the price (or availability)
changed between the customer's last checkout-preview call and this request, their expectation won't
match the fresh total, and the request is rejected with a clear conflict rather than silently
charging whatever the new total happens to be. The client's only recourse is to call
`POST /checkout/prepare` again and re-confirm.

## Price and content snapshots

`order_items` copies `product_name_snapshot`, `variant_snapshot`, `sku_snapshot`, and `unit_price`
at creation time; `orders` copies `store_name_snapshot`, `store_address_snapshot`, and (for
delivery) the recipient/address fields. **None of these are ever recomputed or re-joined from the
live `products`/`store_products`/`stores` rows after creation** - a later catalogue price change,
product rename, or store detail edit never alters an existing order's historical record. This is
verified directly: `cart-checkout-orders.integration-spec.ts`'s "keeps an order's price
snapshot unchanged..." test changes a listing's `selling_price` after order creation and confirms
the order's own `order_items.unit_price` is untouched.

## Idempotency (`IdempotencyService` + `idempotency_records`)

Implements `DATABASE-DESIGN.md`'s "Request handling with idempotency_records" exactly, scoped as
`('checkout.create_order', customer_id, idempotency_key)`:

1. **First request**: the `INSERT` (status `IN_PROGRESS`) succeeds -> proceed.
2. **Retry, same key + same body** (`request_hash` matches): if the prior attempt `COMPLETED`, its
   `response_snapshot` (`{orderId, orderNumber}`) is replayed - the order is re-fetched and
   returned, **never** re-created. If still `IN_PROGRESS`, a `409` "already being processed" is
   returned - never a second execution.
3. **Retry, same key + different body**: rejected with a `409` - a client bug (a genuinely new
   request needs a new key), never silently executed either way.
4. **Previous attempt `FAILED`** (an exception was thrown and no order was ever committed): a fresh
   attempt is allowed, via a compare-and-swap reset (`updateMany WHERE status = 'FAILED'`) so two
   simultaneous retries of a failed key can't both believe they "won" the reset.
5. **Concurrent requests, same key**: `(scope, user_id, idempotency_key)` is `UNIQUE`, so only one
   `INSERT` can ever succeed - the loser always observes the winner's row (step 2 or step 3's path),
   never a race where both proceed to create an order.

The `IN_PROGRESS` insert happens **before**, and the `COMPLETED`/`FAILED` write happens **after**,
the main order-creation transaction - deliberately **outside** it, so a rolled-back order-creation
transaction doesn't also roll back the `FAILED` marker that needs to survive it. The HTTP contract
is a client-generated `Idempotency-Key` header (industry-standard convention), required on
`POST /checkout`.

`orders.idempotency_key` (`UNIQUE (customer_id, idempotency_key)`) is written alongside
`idempotency_records` as the last-resort database guarantee `DATABASE-DESIGN.md` describes - two
independent layers, not one relied on alone.

## Order number generation

`DZ{YYYYMMDD}{8 hex chars}` (e.g. `DZ20261109A1B2C3D4`), generated with cryptographically random
suffix bytes and retried (up to 5 attempts) against the `orders.order_number` `UNIQUE` constraint on
a collision - concurrency-safe without a database sequence, and collision-safe in practice given the
random suffix's size relative to realistic daily order volume.

## Reservation expiry operation

No merchant accept/reject flow exists yet in this milestone (a later one), so an order's reservation
is never explicitly "confirmed" by a human action here - it simply holds stock for
`ORDER_ACCEPTANCE_WINDOW_MS` (24 hours). `ReservationService.releaseExpiredOrderReservations()`:

1. Finds `stock_reservations` with `status = 'ACTIVE'`, `order_id IS NOT NULL`, and
   `expires_at < NOW()` (batched, up to 200 per run).
2. For each, in its **own** transaction (so one failure never blocks the rest): releases the
   reservation (restores `reserved_quantity` on every batch/inventory row it touched - see
   `INVENTORY-MANAGEMENT-DESIGN.md`) and, only if the order is still `CREATED` (a compare-and-swap,
   `updateMany WHERE status = 'CREATED'`), transitions it to `CANCELLED` with an
   `order_status_history` row explaining why. An order a later milestone's accept/complete flow has
   already moved on from is never touched by this job.

**Operated via `npm run release-expired-reservations` (apps/api)**, built from
`src/jobs/release-expired-reservations.ts` into `dist/jobs/release-expired-reservations.js` and run
exactly like the application itself (same reason `main.ts` is compiled, not run through
`ts-node/esm` - the loader doesn't resolve Nest's own CommonJS dependencies correctly). It boots the
real Nest DI graph (so it calls the exact same `ReservationService` the running API uses) without
starting an HTTP listener, and exits after one pass. **No new scheduler or infrastructure
dependency** is introduced - this is meant to be invoked periodically by whatever the deployment
environment already has for cron-like tasks (a system crontab entry, the hosting platform's own
scheduled-task feature, or a scheduled CI workflow), e.g. every 15 minutes. See the script's own
header comment for the exact invocation.

## Order retrieval (`OrdersService`)

Customer-facing only - no merchant fulfilment screens, no delivery assignment (explicitly out of
BC-008's scope). Every lookup is scoped to `customer_id = <authenticated user>`; a `getOwnOrder`
lookup by a non-owned id or order number returns `404`, never confirming the resource exists at all.
Accepts either the order's UUID `id` or its human-readable `order_number` - a value that doesn't
look UUID-shaped is only ever tried against `order_number` (never passed to a `WHERE id = ...`
filter on a UUID column, which Prisma would otherwise reject as a validation error rather than a
clean "not found"). Results include items, status history (oldest first), and payments; list
results support the existing `PaginationDto` convention plus an optional `status` filter.

## Scope boundary (explicit exclusions, per the task)

No cart-side reservation, no merchant accept/reject, no delivery-partner assignment or route
optimization, no merchant fulfilment dashboard, no online payment gateway/webhooks, no order
cancellation endpoint (FR-ORD-003 stays Planned), no coupons/loyalty/subscriptions, no multi-store
checkout, no Redis/Kafka/microservices. These are later milestones building on this one, not gaps in
this one.
