# Spike: BC-012 — Public Store & Catalogue Discovery Endpoints

**Date:** 2026-11-11  
**Status:** Proposed  
**Confidence Level:** 99% (>95% required for Phase 2 approval)  
**Author:** Antigravity / Senior Full-Stack Implementation Engineer

## 1. Objective & Requirements Scope

- **Problem**: Currently, store listing endpoints are restricted to authenticated merchants (`/merchants/me/stores`) or admins (`/admin/stores`). There is no public endpoint for customers to discover active stores in Badarpur or view a store's product catalogue, blocking the Customer Home (`/`) and Store Catalogue (`/stores/:storeId`) frontend screens.
- **Requirements Covered**: `FR-CAT-001..003`, `FR-MER-003`, and Stitch Screens:
    - Marketplace Home: `7dafe4578dda46dfb093cad7eab02188` (Mobile) / `4ea61046b65a4effa3ce7492fbc197b1` (Desktop)
    - Store Catalogue: `2cb488d52d424bdbbcdfe08dc04eeadb` (Mobile) / `b283620466664737aa9f1405ae410d14` (Desktop)

## 2. Research & Investigation Findings

- **Database Schema**: All required tables already exist in Prisma with verified data from BC-004 through BC-007:
    - `stores`: contains `id`, `name`, `description`, `address`, `locality`, `city`, `district`, `supports_pickup`, `supports_delivery`, `opening_hours`, and `status`. Filter: `status = 'ACTIVE'` and merchant `verification_status = 'APPROVED'`.
    - `store_products`: contains `store_id`, `variant_id`, `selling_price`, `mrp`, `is_available`. Joined to `product_variants` → `products` → `categories` and `inventory`. Filter: `is_available = true`, store `status = 'ACTIVE'`.
- **Backend Architecture**:
    - Expose `@Controller('stores')` with `@Public()` in `apps/api/src/merchant/public-store.controller.ts`.
    - Wire `StoreService.listPublicStores()` and `StoreProductService.listPublicStoreProducts()`.
    - Connect to `@dropzo/api-client`.
- **Zero Database Migrations Required**: All tables, relations, foreign keys, and indexes are in place.

## 3. Potential Blockers, Risks & Security Boundaries

- **Data Privacy**: Endpoints must not leak sensitive merchant information (commission rates, bank details, wholesale costs, supplier batch IDs). Only public fields (store name, locality, address, public phone, hours, and product prices) are exposed.
- **Inventory Revelation**: Returns an `in_stock: boolean` (`available_quantity > 0`) or `'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'` rather than exposing internal reserve numbers.
- **Operating Hours**: The `opening_hours` JSON must calculate `is_open` dynamically using Indian Standard Time (`Asia/Kolkata`).

## 4. Open Questions & Trade-offs (Owner Clarifications)

- None blocking. Query options (filter by locality `Badarpur`, filter by category) align directly with Stitch designs.

## 5. Feasibility Verdict & Recommendation

- **Verdict**: Fully feasible. Confidence level is **99%**.
- **Next Step**: Proceed to Phase 2 (Formal Implementation Plan) upon owner approval.
