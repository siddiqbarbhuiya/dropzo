# Functional requirements

**Status: Accepted** (MVP scope) — each requirement below is individually marked **Implemented**
or **Planned**. Acceptance criteria are included inline rather than in a separate document — see
[`../05-engineering/DOCUMENTATION-STANDARDS.md`](../05-engineering/DOCUMENTATION-STANDARDS.md).

ID format: `FR-<AREA>-<NUMBER>`. Areas used: `AUTH`, `LOC` (location), `CAT` (catalogue), `INV`
(inventory), `CART`, `ORD` (orders), `PICK` (pickup), `DEL` (delivery), `PAY` (payments), `MER`
(merchant), `ADM` (admin), `SUP` (support).

For traceability from requirement to task to test, see
[`../06-delivery/TASK-TRACKER.md`](../06-delivery/TASK-TRACKER.md) and the matrix in
[`ACCEPTANCE and traceability`](#traceability) below.

## Health and platform (Implemented)

| ID         | Requirement                                                   | Acceptance criteria                                                              | Status          |
| ---------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------- |
| FR-SYS-001 | The backend exposes a health check endpoint.                  | `GET /api/v1/health` returns HTTP 200 with `{status, timestamp, uptimeSeconds}`. | **Implemented** |
| FR-SYS-002 | The backend exposes machine-readable API docs in development. | `GET /api/docs` returns Swagger UI, HTTP 200, when `NODE_ENV != production`.     | **Implemented** |

## Authentication (Implemented)

| ID          | Requirement                                                      | Acceptance criteria                                                                         | Status          |
| ----------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------- |
| FR-AUTH-001 | Customers register/log in using an Indian mobile number and OTP. | OTP is sent, verified server-side; a session is issued only after verification.             | **Implemented** |
| FR-AUTH-002 | OTP expires after a configurable period and cannot be reused.    | A second verification attempt with the same OTP after expiry/use fails.                     | **Implemented** |
| FR-AUTH-003 | Sessions use short-lived access tokens with refresh.             | A request with an expired access token is rejected; a valid refresh token issues a new one. | **Implemented** |

## Location and serviceability (Planned)

| ID         | Requirement                                                                                | Acceptance criteria                                                                               | Status  |
| ---------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------- |
| FR-LOC-001 | Customers can save one or more addresses.                                                  | An address with line, locality, city, state, and geolocation can be created, listed, and deleted. | Planned |
| FR-LOC-002 | The platform checks whether a location is in an active service zone before showing stores. | A location outside any service zone returns `serviceable: false`.                                 | Planned |

## Catalogue (Implemented)

| ID         | Requirement                                                     | Acceptance criteria                                                                   | Status          |
| ---------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------- |
| FR-CAT-001 | Customers can browse stores and products by category.           | Category and product listing endpoints return paginated results.                      | **Implemented** |
| FR-CAT-002 | Products support variants and units (weight, volume, count).    | A product like "Rice" can have 1 kg / 5 kg / 10 kg variants with independent pricing. | **Implemented** |
| FR-CAT-003 | The same product can have different prices at different stores. | Price is a property of the store listing (`store_products`), not the global product.  | **Implemented** |

## Inventory (Implemented, except reservation)

| ID         | Requirement                                                               | Acceptance criteria                                                                          | Status                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-INV-001 | Each store listing has its own stock record, independent of other stores. | Reducing Store A's stock for a product does not change Store B's stock for the same product. | **Implemented**                                                                                                                                                           |
| FR-INV-002 | Stock is reserved at checkout and released on cancellation or expiry.     | A successful checkout reduces available stock; a cancelled/expired order restores it.        | **Implemented** (BC-008; `ReservationService` - FEFO for batch-tracked listings, released automatically by the reservation-expiry job - see `ORDER-MANAGEMENT-DESIGN.md`) |
| FR-INV-003 | Every stock change creates an auditable movement record.                  | A stock adjustment is traceable to a user, a reason, and a timestamp.                        | **Implemented**                                                                                                                                                           |

## Cart and checkout (Implemented, BC-008, except where noted)

| ID          | Requirement                                                                                      | Acceptance criteria                                                                                                             | Status                                                                                                                                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-CART-001 | A cart belongs to exactly one store.                                                             | Adding a product from a second store either clears the cart or is rejected, with a clear message.                               | **Implemented** (rejected with 409 - never a silent clear/merge, see `CART-CHECKOUT-DESIGN.md`)                                                                                                                                                                        |
| FR-ORD-001  | The server recalculates all prices and stock at checkout; the client's totals are never trusted. | A checkout request with a client-supplied total that doesn't match server calculation is rejected.                              | **Implemented**                                                                                                                                                                                                                                                        |
| FR-ORD-002  | A customer can choose pickup or delivery per order.                                              | The order record has a `fulfilment` field of `PICKUP` or `DELIVERY`.                                                            | **Implemented**                                                                                                                                                                                                                                                        |
| FR-ORD-003  | Customers can request order cancellation.                                                        | A cancellation request before merchant acceptance is processed automatically; after acceptance, it needs merchant/admin action. | Planned (still no customer-initiated cancellation endpoint; BC-009 added merchant-initiated rejection of a `CREATED` order (FR-MER-002) and the automatic reservation-expiry path still exists, but a customer requesting their own cancellation is a later milestone) |

## Pickup

| ID          | Requirement                                                                | Acceptance criteria                                            | Status                                                                                                                                     |
| ----------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-PICK-001 | Pickup is verified with a one-time code that expires and cannot be reused. | A used or expired pickup code is rejected on a second attempt. | **Implemented** (BC-009; `PickupVerificationService` - hash-only storage, 48h expiry, 5-attempt lockout - see `PICKUP-WORKFLOW-DESIGN.md`) |

## Delivery (Planned)

| ID         | Requirement                                               | Acceptance criteria                                                                  | Status  |
| ---------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------- |
| FR-DEL-001 | Delivery assignment is manual (admin-assigned) at launch. | An order needing delivery appears in an admin queue; no automatic assignment occurs. | Planned |
| FR-DEL-002 | Delivery completion requires proof (OTP or equivalent).   | An order cannot be marked `DELIVERED` without the proof step succeeding.             | Planned |

## Payments (Planned)

| ID         | Requirement                                                       | Acceptance criteria                                                                         | Status                                                                                                                                 |
| ---------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| FR-PAY-001 | Cash on delivery/pickup (COD) is supported at launch.             | An order can be placed and completed with `paymentMethod: COD` with no online payment step. | **Implemented** (BC-008; a `payments` row is created `PENDING`, never `CAPTURED` at order creation - see `ORDER-MANAGEMENT-DESIGN.md`) |
| FR-PAY-002 | Online payment is a later phase, not required for MVP completion. | No online payment gateway integration exists yet; this is intentional.                      | Planned                                                                                                                                |

## Merchant (Implemented, BC-006, except where noted)

| ID         | Requirement                                                                           | Acceptance criteria                                                                                                        | Status                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-MER-001 | A merchant can own multiple stores.                                                   | A merchant record can have more than one associated store.                                                                 | **Implemented**                                                                                                                                          |
| FR-MER-002 | A merchant can accept or reject an incoming order with a reason.                      | Rejecting an order releases any reserved stock and records the reason.                                                     | **Implemented** (BC-009; `MerchantOrdersService.accept`/`reject` - see `ORDER-FULFILMENT-DESIGN.md`)                                                     |
| FR-MER-003 | A merchant cannot access another merchant's stores, products, or orders.              | A request for another merchant's resource returns 403/404, not the data.                                                   | **Implemented** (applications/stores/products/orders all scoped to the resolved owner - BC-009 extends this to orders, see `ORDER-FULFILMENT-DESIGN.md`) |
| FR-MER-004 | A user submits a merchant application that goes through an explicit review lifecycle. | PENDING -> APPROVED/REJECTED, REJECTED -> PENDING (resubmission), APPROVED -> SUSPENDED -> APPROVED, all backend-enforced. | **Implemented**                                                                                                                                          |
| FR-MER-005 | A store is not publicly discoverable until an admin approves it.                      | A store starts `PENDING`; only an admin transition moves it to `ACTIVE`.                                                   | **Implemented** (gate only - public discovery APIs are a later task)                                                                                     |

## Admin (Partially implemented, BC-006)

| ID         | Requirement                                                                        | Acceptance criteria                                                | Status                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| FR-ADM-001 | Admin can approve or suspend a merchant/store independently of the whole platform. | Suspending one store does not affect order flow for other stores.  | **Implemented** (no order flow exists yet to prove the independence claim against - revisit once the orders milestone exists) |
| FR-ADM-002 | Admin can configure commission and delivery-fee rules.                             | Commission percentage is configurable per merchant, not hardcoded. | Planned                                                                                                                       |

## Support (Planned)

| ID         | Requirement                                       | Acceptance criteria                                         | Status  |
| ---------- | ------------------------------------------------- | ----------------------------------------------------------- | ------- |
| FR-SUP-001 | Customers can raise a complaint tied to an order. | A complaint record references an order ID and has a status. | Planned |

## Traceability

`Requirement (FR-xxx-NNN) → this document → Task ID (docs/06-delivery/TASK-TRACKER.md) → Implementation (source file) → Test (test file)`

Until business features are implemented, this traceability is a planned structure, not populated
data. As each requirement is implemented, record its task ID and test file in
[`../06-delivery/TASK-TRACKER.md`](../06-delivery/TASK-TRACKER.md).

## Related documents

- [`NON-FUNCTIONAL-REQUIREMENTS.md`](NON-FUNCTIONAL-REQUIREMENTS.md)
- [`../04-design/BUSINESS-RULES.md`](../04-design/BUSINESS-RULES.md)
- [`../06-delivery/TASK-TRACKER.md`](../06-delivery/TASK-TRACKER.md)
