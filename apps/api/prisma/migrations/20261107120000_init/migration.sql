-- Dropzo initial schema migration (BC-004).
-- Source of truth: docs/04-design/DATABASE-DESIGN.md (BC-003.4, closed for review).
--
-- Structure of this file:
--   1. Extensions required before any table is created (pgcrypto for gen_random_uuid(),
--      postgis for every GEOGRAPHY column) - see the design document's "Service zones and
--      delivery eligibility" section and its Prisma Implementation Readiness Checklist.
--   2. Prisma-generated DDL (enums, tables, ordinary indexes, foreign keys) - generated via
--      `prisma migrate diff --from-empty --to-schema-datamodel=prisma/schema.prisma --script`
--      against prisma/schema.prisma, not hand-written.
--   3. Hand-written additions for everything Prisma's schema language cannot express (CHECK
--      constraints, partial indexes, GIST/GIN indexes, the ledger balance trigger, and the
--      least-privilege application role) - see the comment block above that section below.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('CUSTOMER', 'MERCHANT_OWNER', 'MERCHANT_STAFF', 'DELIVERY_PARTNER', 'ADMIN', 'SUPER_ADMIN', 'SUPPORT_AGENT');

-- CreateEnum
CREATE TYPE "store_status" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "inventory_owner_type" AS ENUM ('MERCHANT', 'PLATFORM');

-- CreateEnum
CREATE TYPE "fulfilment_type" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('CREATED', 'PAYMENT_PENDING', 'CONFIRMED', 'ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'PAYMENT_FAILED', 'REFUND_PENDING', 'REFUNDED', 'DELIVERY_FAILED');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "full_name" VARCHAR(150),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role" "user_role" NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "user_agent" TEXT,
    "ip_address" INET,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "label" VARCHAR(50),
    "recipient_name" VARCHAR(150),
    "recipient_phone" VARCHAR(20),
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "landmark" TEXT,
    "locality" VARCHAR(150),
    "city" VARCHAR(100),
    "district" VARCHAR(100),
    "state" VARCHAR(100) NOT NULL DEFAULT 'Assam',
    "postal_code" VARCHAR(10),
    "location" geography(Point, 4326),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_user_id" UUID NOT NULL,
    "legal_name" VARCHAR(200) NOT NULL,
    "display_name" VARCHAR(200) NOT NULL,
    "contact_phone" VARCHAR(20) NOT NULL,
    "business_address" TEXT NOT NULL,
    "verification_status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "commission_percent" DECIMAL(5,2) NOT NULL DEFAULT 8.00,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_staff" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(30) NOT NULL DEFAULT 'STAFF',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchant_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "postal_code" VARCHAR(10),
    "location" geography(Point, 4326) NOT NULL,
    "status" "store_status" NOT NULL DEFAULT 'PENDING',
    "supports_pickup" BOOLEAN NOT NULL DEFAULT true,
    "supports_delivery" BOOLEAN NOT NULL DEFAULT false,
    "preparation_minutes" INTEGER NOT NULL DEFAULT 20,
    "opening_hours" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL DEFAULT 'Assam',
    "boundary" geography(Polygon, 4326),
    "max_delivery_radius_km" DECIMAL(5,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" UUID,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID,
    "name" VARCHAR(250) NOT NULL,
    "brand" VARCHAR(150),
    "description" TEXT,
    "is_food" BOOLEAN NOT NULL DEFAULT false,
    "storage_type" VARCHAR(40),
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "sku" VARCHAR(100),
    "variant_name" VARCHAR(150) NOT NULL,
    "unit" VARCHAR(30) NOT NULL,
    "pack_size" DECIMAL(12,3),
    "barcode" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "owner_type" "inventory_owner_type" NOT NULL DEFAULT 'MERCHANT',
    "uses_batch_tracking" BOOLEAN NOT NULL DEFAULT false,
    "selling_price" DECIMAL(12,2) NOT NULL,
    "mrp" DECIMAL(12,2),
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_product_id" UUID NOT NULL,
    "on_hand_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "reserved_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "blocked_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "low_stock_threshold" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inventory_id" UUID NOT NULL,
    "batch_code" VARCHAR(100),
    "received_quantity" DECIMAL(12,3) NOT NULL,
    "on_hand_quantity" DECIMAL(12,3) NOT NULL,
    "reserved_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "manufacture_date" DATE,
    "expiry_date" DATE,
    "cost_price" DECIMAL(12,2),
    "storage_notes" TEXT,

    CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inventory_id" UUID NOT NULL,
    "batch_id" UUID,
    "movement_type" VARCHAR(30) NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "reference_type" VARCHAR(50),
    "reference_id" UUID,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cart_id" UUID NOT NULL,
    "store_product_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_reservations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cart_id" UUID,
    "order_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "released_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_reservation_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reservation_id" UUID NOT NULL,
    "inventory_id" UUID NOT NULL,
    "batch_id" UUID,
    "quantity" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "stock_reservation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_number" VARCHAR(40) NOT NULL,
    "customer_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "store_name_snapshot" VARCHAR(200) NOT NULL,
    "store_address_snapshot" TEXT NOT NULL,
    "fulfilment_type" "fulfilment_type" NOT NULL,
    "status" "order_status" NOT NULL DEFAULT 'CREATED',
    "delivery_address_id" UUID,
    "delivery_recipient_name_snapshot" VARCHAR(150),
    "delivery_recipient_phone_snapshot" VARCHAR(20),
    "delivery_address_snapshot" JSONB,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "delivery_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "convenience_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "payment_method" VARCHAR(30) NOT NULL,
    "idempotency_key" VARCHAR(150) NOT NULL,
    "customer_notes" TEXT,
    "pickup_code_hash" TEXT,
    "estimated_ready_at" TIMESTAMPTZ(6),
    "placed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "store_product_id" UUID NOT NULL,
    "product_name_snapshot" VARCHAR(250) NOT NULL,
    "variant_snapshot" VARCHAR(150) NOT NULL,
    "sku_snapshot" VARCHAR(100),
    "unit_price" DECIMAL(12,2) NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "old_status" "order_status",
    "new_status" "order_status" NOT NULL,
    "changed_by" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL DEFAULT 'COD',
    "provider_payment_id" VARCHAR(150),
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" VARCHAR(150),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "old_status" "payment_status",
    "new_status" "payment_status" NOT NULL,
    "actor_user_id" UUID,
    "source" VARCHAR(20) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" VARCHAR(50) NOT NULL,
    "provider_event_id" VARCHAR(150) NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "refund_type" VARCHAR(10) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "initiated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "verified_at" TIMESTAMPTZ(6),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "pickup_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_partners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "vehicle_type" VARCHAR(50),
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "is_available" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "delivery_partner_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "picked_up_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "delivery_status" VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED',

    CONSTRAINT "delivery_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "delivery_assignment_id" UUID NOT NULL,
    "event_type" VARCHAR(40) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_type" VARCHAR(40) NOT NULL,
    "owner_type" VARCHAR(20) NOT NULL,
    "merchant_id" UUID,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transaction_type" VARCHAR(40) NOT NULL,
    "reference_type" VARCHAR(50),
    "reference_id" UUID,
    "reversed_transaction_id" UUID,
    "description" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transaction_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "direction" VARCHAR(10) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "settlement_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "gross_amount" DECIMAL(12,2) NOT NULL,
    "commission_amount" DECIMAL(12,2) NOT NULL,
    "deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "reference_number" VARCHAR(150),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "settlement_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "gross_amount" DECIMAL(12,2) NOT NULL,
    "commission_rate_applied" DECIMAL(5,2) NOT NULL,
    "commission_amount" DECIMAL(12,2) NOT NULL,
    "net_amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "settlement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "related_order_id" UUID,
    "source_outbox_event_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "device_token" TEXT NOT NULL,
    "platform" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID,
    "user_id" UUID NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "before_state" JSONB,
    "after_state" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scope" VARCHAR(50) NOT NULL,
    "user_id" UUID,
    "idempotency_key" VARCHAR(150) NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_snapshot" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "aggregate_type" VARCHAR(50) NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "next_attempt_at" TIMESTAMPTZ(6),
    "claimed_by" VARCHAR(100),
    "locked_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_addresses_user_id_idx" ON "user_addresses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_staff_merchant_id_user_id_key" ON "merchant_staff"("merchant_id", "user_id");

-- CreateIndex
CREATE INDEX "stores_merchant_id_idx" ON "stores"("merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "store_products_store_id_is_available_idx" ON "store_products"("store_id", "is_available");

-- CreateIndex
CREATE UNIQUE INDEX "store_products_store_id_variant_id_key" ON "store_products"("store_id", "variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_store_product_id_key" ON "inventory"("store_product_id");

-- CreateIndex
CREATE INDEX "stock_batches_inventory_id_expiry_date_idx" ON "stock_batches"("inventory_id", "expiry_date");

-- CreateIndex
CREATE INDEX "stock_movements_inventory_id_created_at_idx" ON "stock_movements"("inventory_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_movements_batch_id_created_at_idx" ON "stock_movements"("batch_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_store_product_id_key" ON "cart_items"("cart_id", "store_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_reservation_items_reservation_id_inventory_id_batch_i_key" ON "stock_reservation_items"("reservation_id", "inventory_id", "batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_customer_id_created_at_idx" ON "orders"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_store_id_status_created_at_idx" ON "orders"("store_id", "status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "orders_customer_id_idempotency_key_key" ON "orders"("customer_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payment_status_history_payment_id_created_at_idx" ON "payment_status_history"("payment_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhook_events_provider_provider_event_id_key" ON "payment_webhook_events"("provider", "provider_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "pickup_verifications_order_id_key" ON "pickup_verifications"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_partners_user_id_key" ON "delivery_partners"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_assignments_order_id_key" ON "delivery_assignments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_accounts_account_type_merchant_id_key" ON "financial_accounts"("account_type", "merchant_id");

-- CreateIndex
CREATE INDEX "ledger_transactions_reference_type_reference_id_idx" ON "ledger_transactions"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "ledger_entries_account_id_created_at_idx" ON "ledger_entries"("account_id", "created_at");

-- CreateIndex
CREATE INDEX "ledger_entries_transaction_id_idx" ON "ledger_entries"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "settlement_items_order_id_key" ON "settlement_items"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_source_outbox_event_id_key" ON "notifications"("source_outbox_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_devices_device_token_key" ON "notification_devices"("device_token");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_scope_user_id_idempotency_key_key" ON "idempotency_records"("scope", "user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "outbox_events_status_next_attempt_at_idx" ON "outbox_events"("status", "next_attempt_at");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_staff" ADD CONSTRAINT "merchant_staff_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_staff" ADD CONSTRAINT "merchant_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_products" ADD CONSTRAINT "store_products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_products" ADD CONSTRAINT "store_products_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_store_product_id_fkey" FOREIGN KEY ("store_product_id") REFERENCES "store_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "stock_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_store_product_id_fkey" FOREIGN KEY ("store_product_id") REFERENCES "store_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservation_items" ADD CONSTRAINT "stock_reservation_items_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "stock_reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservation_items" ADD CONSTRAINT "stock_reservation_items_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservation_items" ADD CONSTRAINT "stock_reservation_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "stock_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_address_id_fkey" FOREIGN KEY ("delivery_address_id") REFERENCES "user_addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_store_product_id_fkey" FOREIGN KEY ("store_product_id") REFERENCES "store_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_status_history" ADD CONSTRAINT "payment_status_history_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_status_history" ADD CONSTRAINT "payment_status_history_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_verifications" ADD CONSTRAINT "pickup_verifications_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_partners" ADD CONSTRAINT "delivery_partners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_delivery_partner_id_fkey" FOREIGN KEY ("delivery_partner_id") REFERENCES "delivery_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_delivery_assignment_id_fkey" FOREIGN KEY ("delivery_assignment_id") REFERENCES "delivery_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_reversed_transaction_id_fkey" FOREIGN KEY ("reversed_transaction_id") REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_items" ADD CONSTRAINT "settlement_items_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_items" ADD CONSTRAINT "settlement_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_order_id_fkey" FOREIGN KEY ("related_order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_source_outbox_event_id_fkey" FOREIGN KEY ("source_outbox_event_id") REFERENCES "outbox_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_devices" ADD CONSTRAINT "notification_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===========================================================================
-- Hand-written additions required by docs/04-design/DATABASE-DESIGN.md's
-- "Prisma Implementation Readiness Checklist" - everything below is a
-- PostgreSQL feature Prisma's schema language cannot express. Appended after
-- the Prisma-generated DDL above (tables/enums/indexes/foreign keys), which
-- must exist first since these statements reference those tables/columns.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- CHECK constraints (every CHECK named in the table specifications)
-- ---------------------------------------------------------------------------

ALTER TABLE "store_products"
    ADD CONSTRAINT "chk_store_products_selling_price" CHECK ("selling_price" >= 0),
    ADD CONSTRAINT "chk_store_products_mrp" CHECK ("mrp" IS NULL OR "mrp" >= "selling_price");

ALTER TABLE "inventory"
    ADD CONSTRAINT "chk_inventory_on_hand_quantity" CHECK ("on_hand_quantity" >= 0),
    ADD CONSTRAINT "chk_inventory_reserved_quantity" CHECK ("reserved_quantity" >= 0),
    ADD CONSTRAINT "chk_inventory_blocked_quantity" CHECK ("blocked_quantity" >= 0),
    ADD CONSTRAINT "chk_inventory_reserved_blocked_le_on_hand" CHECK ("reserved_quantity" + "blocked_quantity" <= "on_hand_quantity");

ALTER TABLE "stock_batches"
    ADD CONSTRAINT "chk_stock_batches_received_quantity" CHECK ("received_quantity" >= 0),
    ADD CONSTRAINT "chk_stock_batches_on_hand_quantity" CHECK ("on_hand_quantity" >= 0),
    ADD CONSTRAINT "chk_stock_batches_reserved_quantity" CHECK ("reserved_quantity" >= 0),
    ADD CONSTRAINT "chk_stock_batches_reserved_le_on_hand" CHECK ("reserved_quantity" <= "on_hand_quantity");

ALTER TABLE "cart_items"
    ADD CONSTRAINT "chk_cart_items_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "stock_reservations"
    ADD CONSTRAINT "chk_stock_reservations_owner" CHECK (num_nonnulls("cart_id", "order_id") = 1),
    ADD CONSTRAINT "chk_stock_reservations_consumed" CHECK (("status" = 'CONSUMED') = ("consumed_at" IS NOT NULL)),
    ADD CONSTRAINT "chk_stock_reservations_released" CHECK (("status" = 'RELEASED') = ("released_at" IS NOT NULL));

ALTER TABLE "stock_reservation_items"
    ADD CONSTRAINT "chk_stock_reservation_items_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "orders"
    ADD CONSTRAINT "chk_orders_subtotal" CHECK ("subtotal" >= 0),
    ADD CONSTRAINT "chk_orders_total_amount" CHECK ("total_amount" >= 0);

ALTER TABLE "order_items"
    ADD CONSTRAINT "chk_order_items_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "refunds"
    ADD CONSTRAINT "chk_refunds_amount_positive" CHECK ("amount" > 0);

ALTER TABLE "financial_accounts"
    ADD CONSTRAINT "chk_financial_accounts_owner_type" CHECK (("owner_type" = 'MERCHANT') = ("merchant_id" IS NOT NULL));

ALTER TABLE "ledger_entries"
    ADD CONSTRAINT "chk_ledger_entries_direction" CHECK ("direction" IN ('DEBIT', 'CREDIT')),
    ADD CONSTRAINT "chk_ledger_entries_amount_positive" CHECK ("amount" > 0);

-- ---------------------------------------------------------------------------
-- Partial unique indexes (Prisma's schema language cannot express a WHERE
-- clause on a unique index)
-- ---------------------------------------------------------------------------

-- At most one ACTIVE reservation per cart, and per order.
CREATE UNIQUE INDEX "uq_stock_reservations_active_cart"
    ON "stock_reservations" ("cart_id")
    WHERE "status" = 'ACTIVE' AND "cart_id" IS NOT NULL;

CREATE UNIQUE INDEX "uq_stock_reservations_active_order"
    ON "stock_reservations" ("order_id")
    WHERE "status" = 'ACTIVE' AND "order_id" IS NOT NULL;

-- At most one platform-owned account per account_type. The ordinary composite
-- UNIQUE(account_type, merchant_id) generated above does not catch this, because
-- PostgreSQL treats every NULL merchant_id as distinct from every other NULL -
-- the exact defect found and fixed in BC-003.4.
CREATE UNIQUE INDEX "uq_financial_accounts_platform"
    ON "financial_accounts" ("account_type")
    WHERE "merchant_id" IS NULL;

-- ---------------------------------------------------------------------------
-- Partial (non-unique) index - the exact filter the outstanding-balance and
-- settlement-generation queries use (see "Merchant outstanding balance" and
-- "Settlement reconciliation" in DATABASE-DESIGN.md).
-- ---------------------------------------------------------------------------

CREATE INDEX "idx_ledger_entries_unsettled"
    ON "ledger_entries" ("account_id")
    WHERE "settlement_id" IS NULL;

-- ---------------------------------------------------------------------------
-- GIST indexes for geography columns, and the GIN full-text index on
-- products.name - expression/operator-class indexes Prisma's schema language
-- cannot express.
-- ---------------------------------------------------------------------------

CREATE INDEX "idx_stores_location" ON "stores" USING GIST ("location");
CREATE INDEX "idx_user_addresses_location" ON "user_addresses" USING GIST ("location");
CREATE INDEX "idx_products_name_fts" ON "products" USING GIN (to_tsvector('english', "name"));

-- ---------------------------------------------------------------------------
-- Ledger balance enforcement: "sum of debits = sum of credits for this
-- transaction_id" is a cross-row aggregate, which PostgreSQL cannot express as
-- a row-level CHECK constraint. A deferred constraint trigger evaluates it
-- once per modified row, at transaction-commit time (constraint triggers in
-- PostgreSQL must be FOR EACH ROW; re-checking the same aggregate for every
-- row touched in one transaction is redundant but harmless at this scale).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_ledger_transaction_balance() RETURNS TRIGGER AS $$
DECLARE
    v_transaction_id UUID;
BEGIN
    -- OLD is NULL on INSERT and NEW is NULL on DELETE, so this naturally checks
    -- just the one relevant transaction_id for INSERT/DELETE. On UPDATE,
    -- transaction_id itself cannot actually change (see trg_ledger_entries_protect
    -- below), but checking both OLD and NEW here is a second, independent line
    -- of defence that costs nothing: this trigger is correct even if that
    -- guard is ever removed or bypassed by a future change.
    FOR v_transaction_id IN
        SELECT DISTINCT t FROM (VALUES (OLD.transaction_id), (NEW.transaction_id)) AS ids(t)
        WHERE t IS NOT NULL
    LOOP
        PERFORM 1
        FROM (
            SELECT
                COALESCE(SUM("amount") FILTER (WHERE "direction" = 'DEBIT'), 0) AS debit_total,
                COALESCE(SUM("amount") FILTER (WHERE "direction" = 'CREDIT'), 0) AS credit_total
            FROM "ledger_entries"
            WHERE "transaction_id" = v_transaction_id
        ) totals
        WHERE totals.debit_total <> totals.credit_total;

        IF FOUND THEN
            RAISE EXCEPTION 'Ledger transaction % does not balance', v_transaction_id;
        END IF;
    END LOOP;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "trg_ledger_entries_balance"
    AFTER INSERT OR UPDATE OR DELETE ON "ledger_entries"
    INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION check_ledger_transaction_balance();

-- ---------------------------------------------------------------------------
-- Append-only enforcement, precisely: DATABASE-DESIGN.md's "Settlement
-- reconciliation" step 4 is the one sanctioned exception to "never UPDATE a
-- posted ledger row" - tagging an entry with the settlement that closes it.
-- Everything else about a posted row must be immutable. These BEFORE triggers
-- make that a hard database invariant, not just application discipline or the
-- REVOKE below (which only restricts the application's own role - a BEFORE
-- trigger also protects against a bug in whatever privileged process performs
-- settlement tagging).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION prevent_ledger_transactions_update() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'ledger_transactions rows are immutable once created - insert a correcting transaction instead (see DATABASE-DESIGN.md "Corrections")';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_ledger_transactions_immutable"
    BEFORE UPDATE ON "ledger_transactions"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_transactions_update();

CREATE OR REPLACE FUNCTION prevent_ledger_entries_protected_update() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.transaction_id IS DISTINCT FROM NEW.transaction_id
        OR OLD.account_id IS DISTINCT FROM NEW.account_id
        OR OLD.direction IS DISTINCT FROM NEW.direction
        OR OLD.amount IS DISTINCT FROM NEW.amount
        OR OLD.created_at IS DISTINCT FROM NEW.created_at
    THEN
        RAISE EXCEPTION 'ledger_entries rows may only have settlement_id updated (settlement tagging) - everything else is immutable once posted';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_ledger_entries_protect"
    BEFORE UPDATE ON "ledger_entries"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_entries_protected_update();

-- ---------------------------------------------------------------------------
-- Least-privilege application role. Migrations and seeding run as the
-- Postgres superuser (which becomes the owner of every table created above -
-- PostgreSQL never restricts a table owner via REVOKE, so this separate,
-- non-owning role is what actually makes the following REVOKE meaningful).
-- The NestJS application connects at runtime via APP_DATABASE_URL, using this
-- role - see apps/api/src/prisma/prisma.service.ts.
--
-- No password is set here deliberately: this migration is applied byte-for-
-- byte in every environment (local, CI, and eventually production), unlike
-- docker-compose.yml's dev-only defaults, so it must never contain a
-- credential. The role is created unable to log in until a separate,
-- environment-specific step sets its password from APP_DATABASE_URL - run
-- `npm run prisma:set-app-password -w apps/api` (see package.json and
-- scripts/set-app-role-password.mjs), once per environment, after this
-- migration applies. ci.yml runs it automatically.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dropzo_app') THEN
        CREATE ROLE dropzo_app LOGIN;
    END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO dropzo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dropzo_app;

-- Append-only protection for the financial ledger (see "Corrections" in
-- DATABASE-DESIGN.md): the application must never UPDATE or DELETE a posted
-- ledger_transactions/ledger_entries row - a correction is always a new row.
REVOKE UPDATE, DELETE ON "ledger_transactions", "ledger_entries" FROM dropzo_app;
