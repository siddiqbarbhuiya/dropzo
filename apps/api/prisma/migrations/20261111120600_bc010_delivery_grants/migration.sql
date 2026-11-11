-- BC-010: the init migration's `GRANT ... ON ALL TABLES IN SCHEMA public` only covered tables that
-- existed at that migration's own run time (the same situation BC-005 found for otp_challenges) -
-- the two new tables this task adds need their own explicit grant for the restricted
-- `dropzo_app` runtime role the application actually connects as (see APP_DATABASE_URL).
GRANT SELECT, INSERT, UPDATE, DELETE ON "delivery_verifications" TO dropzo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "delivery_cod_handovers" TO dropzo_app;
