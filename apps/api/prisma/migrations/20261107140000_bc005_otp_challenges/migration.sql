-- BC-005: authentication schema extension on top of the closed BC-004 design.
-- A new, forward-only migration - the BC-004 initial migration is never edited.
-- See docs/04-design/AUTHENTICATION-DESIGN.md for the full OTP lifecycle this table backs.

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" VARCHAR(20) NOT NULL,
    "purpose" VARCHAR(20) NOT NULL DEFAULT 'AUTH',
    "code_hash" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "verified_at" TIMESTAMPTZ(6),
    "ip_address" INET,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otp_challenges_phone_created_at_idx" ON "otp_challenges"("phone", "created_at");

-- Hand-written addition (Prisma's schema language cannot express CHECK constraints - same
-- convention as the BC-004 migration): attempt_count/max_attempts can never go negative.
ALTER TABLE "otp_challenges"
    ADD CONSTRAINT "chk_otp_challenges_attempt_count" CHECK ("attempt_count" >= 0),
    ADD CONSTRAINT "chk_otp_challenges_max_attempts" CHECK ("max_attempts" > 0);

-- Grant the restricted runtime role (created by the BC-004 migration) access to this new table -
-- GRANT ... ALL TABLES only covered tables that existed at that migration's own run time.
GRANT SELECT, INSERT, UPDATE, DELETE ON "otp_challenges" TO dropzo_app;
