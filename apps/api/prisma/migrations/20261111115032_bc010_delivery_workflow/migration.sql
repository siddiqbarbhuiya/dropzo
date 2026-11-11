-- BC-010: home delivery management.
-- Forward-only, additive migration. delivery_partners, delivery_assignments, delivery_events,
-- service_zones, and the order_status enum values this task needs (ASSIGNED, PICKED_UP,
-- OUT_FOR_DELIVERY, DELIVERED, DELIVERY_FAILED) were all already modeled by BC-004 - this task is
-- their first real consumer, not their creator. No new order_status/payment_status enum value is
-- introduced here, per the task's own instruction.
--
-- Note: `prisma migrate dev --create-only` also proposed dropping idx_merchants_verification_status,
-- idx_stores_location, idx_stores_service_zone_id, and idx_user_addresses_location - those were
-- added by hand-written SQL in the init/BC-006 migrations and were never declared via @@index in
-- schema.prisma, so Prisma's diff sees them as drift. They are real, intentional indexes - those
-- DropIndex statements were removed from this file; they are not part of BC-010's change.

-- AlterTable: new delivery_assignments columns for the full accept/reject/collect/out-for-
-- delivery/deliver/fail/cancel lifecycle, COD amount tracking, and handover linkage.
ALTER TABLE "delivery_assignments" ADD COLUMN     "accepted_at" TIMESTAMPTZ(6),
ADD COLUMN     "cancelled_at" TIMESTAMPTZ(6),
ADD COLUMN     "cod_amount_due" DECIMAL(12,2),
ADD COLUMN     "cod_collected_amount" DECIMAL(12,2),
ADD COLUMN     "cod_collected_at" TIMESTAMPTZ(6),
ADD COLUMN     "failed_at" TIMESTAMPTZ(6),
ADD COLUMN     "failed_reason" TEXT,
ADD COLUMN     "handover_id" UUID,
ADD COLUMN     "out_for_delivery_at" TIMESTAMPTZ(6),
ADD COLUMN     "picked_up_confirmed_by_merchant_at" TIMESTAMPTZ(6),
ADD COLUMN     "rejected_at" TIMESTAMPTZ(6),
ADD COLUMN     "rejected_reason" TEXT;

-- delivery_status was already a documented-but-unconstrained VARCHAR(30) default 'ASSIGNED' -
-- same situation BC-009 found for payment_status_history.source. Constrain it now to the full set
-- this task's state machine actually uses.
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "chk_delivery_assignments_delivery_status"
    CHECK ("delivery_status" IN ('ASSIGNED', 'ACCEPTED', 'REJECTED', 'PICKED_UP',
        'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED'));

-- CreateTable
CREATE TABLE "delivery_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "delivery_assignment_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "verified_at" TIMESTAMPTZ(6),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "delivery_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_cod_handovers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "delivery_partner_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "recorded_by" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_cod_handovers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_verifications_delivery_assignment_id_key" ON "delivery_verifications"("delivery_assignment_id");

-- CreateIndex
CREATE INDEX "delivery_cod_handovers_delivery_partner_id_created_at_idx" ON "delivery_cod_handovers"("delivery_partner_id", "created_at");

-- CreateIndex
CREATE INDEX "delivery_assignments_delivery_partner_id_delivery_status_idx" ON "delivery_assignments"("delivery_partner_id", "delivery_status");

-- A delivery partner can have at most one assignment in an active (non-terminal) state at a time
-- (the brief's "current assignment" is singular, and "must not exceed any configured
-- active-assignment limit" is resolved here as limit = 1 for this MVP - see
-- DELIVERY-MANAGEMENT-DESIGN.md). DB-enforced, not just application logic, the same way
-- BC-003.3's reservation design enforces "at most one active reservation per cart/order" with a
-- partial unique index rather than relying on a convention.
CREATE UNIQUE INDEX "uq_delivery_assignments_partner_active" ON "delivery_assignments"("delivery_partner_id")
    WHERE "delivery_status" IN ('ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY');

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_handover_id_fkey" FOREIGN KEY ("handover_id") REFERENCES "delivery_cod_handovers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_verifications" ADD CONSTRAINT "delivery_verifications_delivery_assignment_id_fkey" FOREIGN KEY ("delivery_assignment_id") REFERENCES "delivery_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_cod_handovers" ADD CONSTRAINT "delivery_cod_handovers_delivery_partner_id_fkey" FOREIGN KEY ("delivery_partner_id") REFERENCES "delivery_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_cod_handovers" ADD CONSTRAINT "delivery_cod_handovers_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
