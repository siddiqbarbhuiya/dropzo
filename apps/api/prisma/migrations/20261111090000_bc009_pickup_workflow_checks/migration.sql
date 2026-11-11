-- BC-009: merchant order processing and customer pickup.
-- Forward-only, additive migration - no new tables (orders, order_status_history, payments,
-- payment_status_history, pickup_verifications, financial_accounts, ledger_transactions,
-- ledger_entries, outbox_events were all already fully modeled by BC-004's schema; order_status
-- and payment_status are already real Postgres ENUMs covering every value this task needs -
-- CREATED, ACCEPTED, PREPARING, READY, COMPLETED, REJECTED already exist, so no new enum value is
-- introduced here, per the task's own instruction). One genuine gap found, following the same
-- reasoning as BC-006/007/008's own CHECK-constraint additions: payment_status_history.source is a
-- documented-but-unconstrained VARCHAR(20), and its documented value list (SYSTEM, WEBHOOK, ADMIN,
-- CUSTOMER) has no value for "a merchant physically collected COD cash and confirmed it" - BC-009
-- introduces that as a genuinely new, real actor type for this column.

ALTER TABLE "payment_status_history" ADD CONSTRAINT "chk_payment_status_history_source"
    CHECK ("source" IN ('SYSTEM', 'WEBHOOK', 'ADMIN', 'CUSTOMER', 'MERCHANT'));
