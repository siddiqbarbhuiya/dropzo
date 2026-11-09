-- BC-007: product catalogue and inventory management.
-- Forward-only, additive migration - no new tables (categories, products, product_variants,
-- store_products, inventory, stock_batches, stock_movements were all already fully modeled by
-- BC-004's schema). The one genuine gap: stock_movements.movement_type was an unconstrained
-- VARCHAR(30), even though DATABASE-DESIGN.md's "Keeping inventory and stock_batches in sync" /
-- "Receiving stock" / "Damage and expiry" sections already document exactly 7 real values. Adding
-- the CHECK constraint now, rather than leaving it purely a documentation convention, follows the
-- same reasoning as BC-006's chk_merchants_verification_status: an invalid value slipping through
-- (e.g. a typo) should fail loudly in the database, not silently succeed as an uninterpretable row.

ALTER TABLE "stock_movements" ADD CONSTRAINT "chk_stock_movements_movement_type"
    CHECK ("movement_type" IN ('RECEIVED', 'RESERVED', 'RELEASED', 'SOLD', 'DAMAGED', 'EXPIRED', 'ADJUSTED'));
