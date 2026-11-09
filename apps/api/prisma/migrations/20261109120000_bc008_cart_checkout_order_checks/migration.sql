-- BC-008: customer cart, checkout, stock reservation, and COD order creation.
-- Forward-only, additive migration - no new tables (carts, cart_items, stock_reservations,
-- stock_reservation_items, orders, order_items, order_status_history, payments,
-- idempotency_records were all already fully modeled by BC-004's schema). Three genuine gaps
-- found, following the same reasoning as BC-006's chk_merchants_verification_status and BC-007's
-- chk_stock_movements_movement_type: a documented-but-unconstrained VARCHAR status column should
-- fail loudly in the database on an invalid value, not silently accept one.

-- carts.status: documented values are ACTIVE, CHECKED_OUT, ABANDONED (see DATABASE-DESIGN.md's
-- "carts" table spec) but the column was an unconstrained VARCHAR(20).
ALTER TABLE "carts" ADD CONSTRAINT "chk_carts_status"
    CHECK ("status" IN ('ACTIVE', 'CHECKED_OUT', 'ABANDONED'));

-- stock_reservations.status: documented values are ACTIVE, CONSUMED, RELEASED, EXPIRED (see
-- DATABASE-DESIGN.md's "stock_reservations" table spec); the column already had two CHECKs tying
-- status to consumed_at/released_at, but nothing restricted the status value itself.
ALTER TABLE "stock_reservations" ADD CONSTRAINT "chk_stock_reservations_status"
    CHECK ("status" IN ('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED'));

-- idempotency_records.status: documented values are IN_PROGRESS, COMPLETED, FAILED (see
-- DATABASE-DESIGN.md's "Idempotency rules" / "Request handling with idempotency_records").
ALTER TABLE "idempotency_records" ADD CONSTRAINT "chk_idempotency_records_status"
    CHECK ("status" IN ('IN_PROGRESS', 'COMPLETED', 'FAILED'));

-- At most one ACTIVE cart per user, mirroring the init migration's own
-- "uq_stock_reservations_active_cart" / "uq_stock_reservations_active_order" partial-unique
-- pattern. A cart cannot contain products from multiple stores (BC-008 business rule) and a user
-- must never end up with two concurrent active carts to begin with - this is the database-level
-- guarantee behind that rule, not just application discipline.
CREATE UNIQUE INDEX "uq_carts_active_per_user"
    ON "carts" ("user_id")
    WHERE "status" = 'ACTIVE';
