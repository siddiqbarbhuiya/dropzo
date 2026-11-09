# Cart and checkout design

**Status:** Implemented (BC-008). See [`API-SPECIFICATION.md`](API-SPECIFICATION.md) for the exact
endpoints and [`DATABASE-DESIGN.md`](DATABASE-DESIGN.md) for the `carts`/`cart_items`/
`stock_reservations`/`stock_reservation_items` table specs (all modeled by BC-004). Builds on
BC-005 auth, BC-006 store ownership, and BC-007 catalogue/inventory
([`PRODUCT-CATALOGUE-DESIGN.md`](PRODUCT-CATALOGUE-DESIGN.md),
[`INVENTORY-MANAGEMENT-DESIGN.md`](INVENTORY-MANAGEMENT-DESIGN.md)); none are re-reviewed here.
Order creation and its own lifecycle are covered in
[`ORDER-MANAGEMENT-DESIGN.md`](ORDER-MANAGEMENT-DESIGN.md) - this document stops at the point an
order is created.

## Cart lifecycle

A cart (`CartService`) belongs to exactly one customer and one store. `uq_carts_active_per_user` (a
new partial unique index, BC-008) guarantees at most one `ACTIVE` cart per user at the database
level, not just application discipline - the same class of guarantee
`uq_stock_reservations_active_cart`/`_active_order` already gave reservations.

- **Add item** (`addItem`): re-validates the listing fresh (available, variant/product active,
  store `ACTIVE`, merchant `APPROVED`) before touching the cart. If no `ACTIVE` cart exists, one is
  created scoped to the listing's store. If an `ACTIVE` cart already exists for a **different**
  store, the add is rejected with a `409 Conflict` - **never** a silent merge or an automatic
  clear, per the task's explicit requirement. Quantity is capped at 1000 (both `AddCartItemDto` and
  `UpdateCartItemDto`) - a generous ceiling for any genuine grocery order, added after an automated
  security review noted stock sufficiency alone doesn't otherwise bound how large a single line can
  request. Adding a listing already in the cart **increments**
  its quantity (the common e-commerce convention); `PATCH .../items/:itemId` is the separate,
  explicit way to set an absolute quantity.
- **Remove item**: scoped to the caller's own cart (`cart_id` + `id`, never `itemId` alone).
  Removing the cart's last item **deletes the cart row itself**, not just the item - a deliberate
  choice: an empty cart carries no store-lock information worth keeping, and deleting it is what
  lets the customer immediately start a fresh cart for a different store without a separate "clear"
  call first.
- **Clear cart**: deletes the caller's `ACTIVE` cart outright (an explicit abandon). Both this and
  the last-item-removal path use `deleteMany` rather than `delete`, so a concurrent double-call is
  a safe no-op rather than a thrown "record not found."
- **Checked out**: when an order is successfully created from a cart, the cart **transitions** to
  `CHECKED_OUT` (never deleted) inside the same transaction as the order - its `cart_items` and
  history stay intact for the record, and the user is free to start a new `ACTIVE` cart immediately
  since `uq_carts_active_per_user` only constrains `ACTIVE` rows.

## Cart pricing and validation (`CartPricingService`)

The single source of truth for "what is actually in this cart, and is it still buyable" - used by
**both** the cart-summary endpoint and checkout, so the two can never disagree. Every call re-reads
the listing, variant, product, store, merchant, and inventory fresh from the database; nothing is
cached or trusted from a previous response. Per item, it reports zero or more of:
`LISTING_UNAVAILABLE`, `VARIANT_INACTIVE`, `PRODUCT_INACTIVE`, `STORE_INACTIVE`,
`MERCHANT_INACTIVE`, `INSUFFICIENT_STOCK`, `LISTING_NOT_FOUND`. `INSUFFICIENT_STOCK` for a
batch-tracked listing sums only **non-expired** batches' `on_hand_quantity - reserved_quantity` -
the same "never allocate expired stock" rule BC-007 established for decreases applies equally to
this read-only availability check.

**No fabricated charges**: `totalAmount` is exactly `subtotal` (sum of `unit_price * quantity`
per item). The schema has no delivery-fee/tax/platform-charge field on `Store` or anywhere else
configurable today, and the task explicitly forbids inventing one - `orders.delivery_fee` /
`convenience_fee` / `tax_amount` all stay at their schema default of `0` until a real, configured
charge exists.

Every pricing method takes an optional database client (defaulting to the ambient connection) so
checkout's order-creation transaction can call `priceCart(cartId, tx)` - the authoritative
re-validation then reads inside the same transaction as the reservation and order insert, never a
stale snapshot from before the transaction started.

## Checkout preparation (`CheckoutService.prepare` / `FulfilmentValidationService`)

A read-only preview: prices the cart (as above) and validates the chosen fulfilment method, with no
side effects (no reservation, no row created). `isReadyForCheckout` is `true` only when both the
cart and the fulfilment choice have zero errors.

- **Pickup**: valid iff `store.supports_pickup`.
- **Delivery**: valid iff `store.supports_delivery`, a delivery address was supplied, the store has
  an active `service_zone` configured, and the address falls within that zone's
  `max_delivery_radius_km` of the store (`ST_DWithin`, per `DATABASE-DESIGN.md`'s documented MVP
  radius-based rule - polygon/`boundary` containment is an explicitly optional upgrade, not
  implemented here). A zone with no configured radius is treated as **not** deliverable - there is
  no basis to call an address reachable with no distance rule to check it against, so this never
  silently allows unlimited-distance delivery.
- **Delivery address**: BC-008 has no saved address book to draw from - customer address CRUD
  (FR-LOC-001) is still Planned, a separate future milestone. Checkout therefore accepts delivery
  details **inline** in the request (`DeliveryAddressDto`: recipient name/phone, address lines,
  city/district, latitude/longitude) rather than a `deliveryAddressId` reference. `orders
.delivery_address_id` stays `NULL` for every BC-008 order; a future address-book milestone can
  add `deliveryAddressId` support against the same request shape without changing it.

## Reservation lifecycle - what BC-008 actually does

`DATABASE-DESIGN.md`'s documented lifecycle describes a reservation starting **cart-held**
(`cart_id` set) and later **converting** to **order-held** (`order_id` set, `cart_id` cleared) at
checkout. **BC-008 reserves stock only at order-creation time, directly order-held** - there is no
cart-side "hold while browsing" reservation in this implementation. This is a deliberate scope
choice, not an oversight:

- It avoids a cart silently holding scarce stock hostage from other customers while someone merely
  browses or an abandoned cart sits untouched.
- It produces exactly the row shape and terminal states the design document already specifies
  (`ACTIVE` -> `CONSUMED` | `RELEASED` | `EXPIRED`) - it just starts from the order-held end state
  instead of passing through the cart-held one first.
- "Confirmed order reservations must not be accidentally released by cart cleanup" is therefore not
  a code path that can occur at all in this implementation: `clearCart`/last-item-removal never
  touch a reservation, because no reservation exists until an order already does.

A future milestone that wants cart-side holding (e.g. "your cart is reserved for 10 minutes") would
add a reservation at `addItem` time using the same `ReservationService`, converting it at checkout
rather than creating a second one - see `INVENTORY-MANAGEMENT-DESIGN.md`'s reservation/FEFO section
for the mechanism this would reuse.

## Transaction and lock ordering

Order creation (`CheckoutService.createOrder` -> `doCreateOrder`) is one database transaction:
reload and re-validate the cart, re-price every line, re-validate fulfilment, compare the client's
`expectedTotalAmount` against the authoritative total (see
[`ORDER-MANAGEMENT-DESIGN.md`](ORDER-MANAGEMENT-DESIGN.md) for why this field exists and what it
does **not** do), create the order and its items, reserve stock for every line, create the `PENDING`
COD payment row, write the `CREATED` status-history row, and transition the cart to `CHECKED_OUT` -
all or nothing. `ReservationService.reserveForOrder` locks every inventory row the order touches
**first**, in ascending `id` order across all of them (not just within one listing) - the same
inventory-before-batches, globally-ordered-by-id rule BC-007 and BC-004's own FEFO procedure
established, extended to cover an order with several different listings at once, so two concurrent
orders touching overlapping inventory sets can never request these locks in opposite orders. See
`ORDER-MANAGEMENT-DESIGN.md` for the full order-creation sequence and idempotency behaviour.
