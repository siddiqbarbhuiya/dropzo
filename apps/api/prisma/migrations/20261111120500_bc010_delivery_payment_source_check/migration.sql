-- BC-010: delivery-completion COD capture needs a new, genuinely new actor type for
-- payment_status_history.source - the same situation BC-009 found for 'MERCHANT'. A delivery
-- partner physically collecting COD cash at the customer's doorstep is not any of the existing
-- values (SYSTEM, WEBHOOK, ADMIN, CUSTOMER, MERCHANT).
ALTER TABLE "payment_status_history" DROP CONSTRAINT "chk_payment_status_history_source";
ALTER TABLE "payment_status_history" ADD CONSTRAINT "chk_payment_status_history_source"
    CHECK ("source" IN ('SYSTEM', 'WEBHOOK', 'ADMIN', 'CUSTOMER', 'MERCHANT', 'DELIVERY_PARTNER'));
