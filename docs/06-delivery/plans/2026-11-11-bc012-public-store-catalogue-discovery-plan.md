# Implementation Plan: BC-012 — Public Store & Catalogue Discovery Endpoints

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` and `test-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement public, customer-facing endpoints in `apps/api` and methods in `packages/api-client` to browse active stores in Badarpur and explore their product catalogues with live pricing and in-stock flags.

**Architecture:** A new `@Public()` NestJS controller `PublicStoreController` exposing `/api/v1/stores`. It delegates to `StoreService` for store discovery and `StoreProductService` for store catalogue queries, returning clean, non-sensitive DTOs with dynamic IST store open/closed calculations.

**Tech Stack:** NestJS 12, Prisma Client, TypeScript (NodeNext ESM), Jest (ESM modules), Prettier.

**Spec Reference:** [`docs/04-design/UI-SCREEN-COVERAGE.md`](../../../docs/04-design/UI-SCREEN-COVERAGE.md) (Rows 58 & 59), [`docs/06-delivery/spikes/2026-11-11-bc012-public-store-catalogue-discovery-spike.md`](../spikes/2026-11-11-bc012-public-store-catalogue-discovery-spike.md).

---

## Global Constraints

- Must use `@Public()` decorator — no bearer tokens required for browsing stores or products.
- Zero database migrations — leverage existing tables `stores`, `store_products`, `inventory`, `products`, `product_variants`, `categories`.
- Never leak sensitive merchant fields (bank details, wholesale supplier batches, commission rates, private owner phones).
- Never trust client-supplied prices or stock numbers.
- Strict TypeScript mode, avoid `any`.

---

## Tasks

### Task 1: Store Open/Closed Calculation Helper & DTOs

Define public DTOs and the IST schedule calculation utility.

**Files:**

- Create: `apps/api/src/merchant/dto/public-store.dto.ts`
- Create: `apps/api/src/merchant/utils/store-hours.util.ts`
- Test: `apps/api/src/merchant/utils/store-hours.util.spec.ts`

**Steps:**

- [ ] Write failing unit tests in `store-hours.util.spec.ts` testing:
    - Returns `is_open: true` during active store operating hours in IST.
    - Returns `is_open: false` outside operating hours.
    - Returns `is_open: true` if `opening_hours` is empty/null but status is `ACTIVE`.
    - Returns `is_open: false` if store status is `PAUSED` or `CLOSED` regardless of hours.
- [ ] Implement `isStoreOpen(status, openingHours, now?)` in `store-hours.util.ts`.
- [ ] Define `PublicStoreDto` and `ListPublicStoresQueryDto` (optional `locality`, `supportsPickup`, `supportsDelivery`, pagination) in `public-store.dto.ts`.
- [ ] Define `PublicCatalogueProductDto` and `ListPublicProductsQueryDto` (optional `categoryId`, `search`, pagination).
- [ ] Run test: `npm run test -w @dropzo/api -- src/merchant/utils/store-hours.util.spec.ts`.

---

### Task 2: Service Methods in `StoreService` and `StoreProductService`

Add public query methods to existing services without altering merchant ownership checks.

**Files:**

- Modify: `apps/api/src/merchant/store.service.ts`
- Modify: `apps/api/src/inventory/store-product.service.ts`
- Test: `apps/api/src/merchant/store.service.spec.ts`
- Test: `apps/api/src/inventory/store-product.service.spec.ts`

**Steps:**

- [ ] Write failing unit test in `store.service.spec.ts` for `listPublicStores` (filtering `status: ACTIVE` and approved merchant) and `getPublicStore` (throws `NotFoundException` if inactive/not found).
- [ ] Implement `listPublicStores(query: ListPublicStoresQueryDto)` and `getPublicStore(storeId: string)` in `StoreService`.
- [ ] Write failing unit test in `store-product.service.spec.ts` for `listPublicStoreProducts` (joining `variant`, `product`, `category`, `inventory` with `is_available: true`).
- [ ] Implement `listPublicStoreProducts(storeId: string, query: ListPublicProductsQueryDto)` in `StoreProductService`.
- [ ] Run tests: `npm run test -w @dropzo/api -- src/merchant/store.service.spec.ts src/inventory/store-product.service.spec.ts`.

---

### Task 3: Public Controller & Module Registration

Create and register `PublicStoreController`.

**Files:**

- Create: `apps/api/src/merchant/public-store.controller.ts`
- Modify: `apps/api/src/merchant/merchant.module.ts`
- Test: `apps/api/src/merchant/public-store.controller.spec.ts`

**Steps:**

- [ ] Write failing unit test in `public-store.controller.spec.ts` testing:
    - `GET /api/v1/stores` returns paginated public stores with `is_open`.
    - `GET /api/v1/stores/:storeId` returns single store.
    - `GET /api/v1/stores/:storeId/products` returns store catalogue with `in_stock` and `low_stock`.
- [ ] Implement `PublicStoreController` tagged `@ApiTags('stores')`, `@Controller('stores')`, `@Public()`.
- [ ] Update `MerchantModule` to import `InventoryModule` (or export required services) and register `PublicStoreController`.
- [ ] Run test: `npm run test -w @dropzo/api -- src/merchant/public-store.controller.spec.ts`.

---

### Task 4: API Client Support

Expose typed methods in `@dropzo/api-client`.

**Files:**

- Modify: `packages/api-client/src/index.ts`
- Test: Verify with `npm run typecheck` and `npm run test -w @dropzo/api-client`.

**Steps:**

- [ ] Add `PublicStore`, `PublicProductListing`, and pagination query types in `packages/api-client/src/index.ts`.
- [ ] Add methods:
    - `listPublicStores: (params?: ListPublicStoresParams) => Promise<PaginatedResult<PublicStore>>`
    - `getPublicStore: (storeId: string) => Promise<PublicStore>`
    - `getStoreCatalogue: (storeId: string, params?: ListCatalogueParams) => Promise<PaginatedResult<PublicProductListing>>`
- [ ] Run typecheck across all workspaces: `npm run typecheck`.

---

### Task 5: Full Verification & Documentation Synchronization

Execute end-to-end checks and update progress tracking.

**Steps:**

- [ ] Run all tests: `npm run test` (confirming all unit and integration tests pass).
- [ ] Run typecheck: `npm run typecheck`.
- [ ] Run linter: `npm run lint`.
- [ ] Run format check: `npm run format:check`.
- [ ] Update `docs/06-delivery/TASK-TRACKER.md` (add BC-012 entry).
- [ ] Update `docs/06-delivery/PROGRESS.md` with implementation and verification results.
- [ ] Present git diff and report to user for commit authorization.
