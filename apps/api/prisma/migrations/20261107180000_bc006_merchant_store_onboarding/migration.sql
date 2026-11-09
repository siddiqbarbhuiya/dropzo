-- BC-006: merchant onboarding and store management.
-- Forward-only, additive migration - never edits any previously-applied migration. Adds the
-- application-lifecycle, contact, structured-address, operating, and service-zone-membership
-- fields merchants/stores needed but didn't have, plus one new inbound reference
-- (stores.service_zone_id) that DATABASE-DESIGN.md's delivery-eligibility rule already assumed
-- ("the store's service_zones membership") but the schema never actually implemented.
-- See docs/04-design/MERCHANT-STORE-DESIGN.md for the full lifecycle this supports.

-- AlterTable
ALTER TABLE "merchants" ADD COLUMN     "business_description" TEXT,
ADD COLUMN     "business_email" VARCHAR(255),
ADD COLUMN     "business_type" VARCHAR(50),
ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "contact_person_name" VARCHAR(150),
ADD COLUMN     "district" VARCHAR(100),
ADD COLUMN     "postal_code" VARCHAR(10),
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMPTZ(6),
ADD COLUMN     "reviewed_by_user_id" UUID,
ADD COLUMN     "state" VARCHAR(100) NOT NULL DEFAULT 'Assam',
ADD COLUMN     "submitted_at" TIMESTAMPTZ(6),
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "contact_phone" VARCHAR(20),
ADD COLUMN     "email" VARCHAR(255),
ADD COLUMN     "locality" VARCHAR(150),
ADD COLUMN     "service_zone_id" UUID,
ADD COLUMN     "state" VARCHAR(100) NOT NULL DEFAULT 'Assam',
ADD COLUMN     "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "merchants_owner_user_id_key" ON "merchants"("owner_user_id");

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_service_zone_id_fkey" FOREIGN KEY ("service_zone_id") REFERENCES "service_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written additions beyond the plain schema diff, matching this project's established
-- practice (BC-004/BC-005) of adding real database-level invariants, not just Prisma types.

-- The merchant application lifecycle this task implements: DRAFT (not used by the API yet, but a
-- real legal value - see MERCHANT-STORE-DESIGN.md) -> PENDING -> APPROVED | REJECTED; APPROVED ->
-- SUSPENDED -> APPROVED (reinstated); REJECTED -> PENDING (resubmission). Enforced here, not just
-- in application code, since verification_status predates this constraint and was an unconstrained
-- VARCHAR.
ALTER TABLE "merchants" ADD CONSTRAINT "chk_merchants_verification_status"
    CHECK ("verification_status" IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'));

-- A rejection must always record why; an approval/suspension/reinstatement must always record who
-- and when. Not enforced per-transition (that needs application logic to know which transition is
-- happening), but this is still a real, cheap invariant: a reviewed application is never silently
-- missing its reviewer.
ALTER TABLE "merchants" ADD CONSTRAINT "chk_merchants_reviewed_fields_together"
    CHECK (
        (reviewed_at IS NULL AND reviewed_by_user_id IS NULL)
        OR (reviewed_at IS NOT NULL AND reviewed_by_user_id IS NOT NULL)
    );

-- Supports admin "list applications filtered by status" (paginated, ordered by recency).
CREATE INDEX "idx_merchants_verification_status" ON "merchants"("verification_status", "created_at");

-- Supports resolving a store's service zone and the reverse "stores in this zone" admin view.
CREATE INDEX "idx_stores_service_zone_id" ON "stores"("service_zone_id");
