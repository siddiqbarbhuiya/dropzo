# API specification

**Status:** Section-by-section — see individual labels. The live, generated reference is always
`GET /api/docs` (Swagger UI) when the API is running in a non-production environment; this
document explains the conventions and lists planned endpoint groups.

## Conventions (Implemented)

- Base path: `/api/v1`
- JSON request/response bodies
- Errors use a consistent shape (from `AllExceptionsFilter`):
    ```json
    { "success": false, "error": { "statusCode": 500, "message": "..." } }
    ```
- Swagger/OpenAPI docs are generated from the NestJS controllers and DTOs directly — do not
  maintain a hand-written copy of the API surface separately from the code.

## Implemented endpoints

| Method   | Path                                                            | Auth                   | Purpose                                                                                                    |
| -------- | --------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/v1/health`                                                | Public                 | Returns `{status, timestamp, uptimeSeconds}`. Used for liveness checks.                                    |
| `POST`   | `/api/v1/auth/send-otp`                                         | Public                 | Request an OTP for a phone number (login or registration).                                                 |
| `POST`   | `/api/v1/auth/verify-otp`                                       | Public                 | Verify an OTP; returns an access/refresh token pair.                                                       |
| `POST`   | `/api/v1/auth/refresh`                                          | Public (token in body) | Rotate a refresh token for a new access/refresh token pair.                                                |
| `POST`   | `/api/v1/auth/logout`                                           | Authenticated          | Revoke the session behind the given refresh token.                                                         |
| `POST`   | `/api/v1/auth/logout-all`                                       | Authenticated          | Revoke every active session for the current user.                                                          |
| `GET`    | `/api/v1/auth/me`                                               | Authenticated          | Return the authenticated user and their roles.                                                             |
| `GET`    | `/api/v1/auth/sessions`                                         | Authenticated          | List the current user's active sessions.                                                                   |
| `DELETE` | `/api/v1/auth/sessions/:id`                                     | Authenticated          | Revoke one of the current user's own sessions by id.                                                       |
| `PATCH`  | `/api/v1/admin/users/:id/roles`                                 | ADMIN/SUPER_ADMIN      | Grant or revoke a role for a user. Audit-logged.                                                           |
| `POST`   | `/api/v1/merchants/me`                                          | Authenticated          | Submit (or resubmit, after rejection) a merchant application.                                              |
| `GET`    | `/api/v1/merchants/me`                                          | Authenticated          | Get the caller's own merchant profile/application.                                                         |
| `PATCH`  | `/api/v1/merchants/me`                                          | Authenticated          | Update the caller's own editable application details.                                                      |
| `GET`    | `/api/v1/merchants/me/dashboard`                                | Authenticated          | Summary of the caller's own merchant account and stores.                                                   |
| `POST`   | `/api/v1/merchants/me/stores`                                   | MERCHANT_OWNER         | Create a store. Requires an APPROVED merchant application.                                                 |
| `GET`    | `/api/v1/merchants/me/stores`                                   | MERCHANT_OWNER         | List the caller's own stores (paginated).                                                                  |
| `GET`    | `/api/v1/merchants/me/stores/:storeId`                          | MERCHANT_OWNER         | Get one of the caller's own stores.                                                                        |
| `PATCH`  | `/api/v1/merchants/me/stores/:storeId`                          | MERCHANT_OWNER         | Update store details.                                                                                      |
| `PATCH`  | `/api/v1/merchants/me/stores/:storeId/hours`                    | MERCHANT_OWNER         | Update a store's operating hours.                                                                          |
| `PATCH`  | `/api/v1/merchants/me/stores/:storeId/availability`             | MERCHANT_OWNER         | Update pickup/delivery availability.                                                                       |
| `PATCH`  | `/api/v1/merchants/me/stores/:storeId/status`                   | MERCHANT_OWNER         | Self-service status transitions (see MERCHANT-STORE-DESIGN.md).                                            |
| `GET`    | `/api/v1/admin/merchants`                                       | ADMIN/SUPER_ADMIN      | List merchant applications, optionally filtered by status (paginated).                                     |
| `GET`    | `/api/v1/admin/merchants/:id`                                   | ADMIN/SUPER_ADMIN      | Get one merchant application by id.                                                                        |
| `PATCH`  | `/api/v1/admin/merchants/:id/approve`                           | ADMIN/SUPER_ADMIN      | Approve a PENDING application. Grants MERCHANT_OWNER.                                                      |
| `PATCH`  | `/api/v1/admin/merchants/:id/reject`                            | ADMIN/SUPER_ADMIN      | Reject a PENDING application with a reason.                                                                |
| `PATCH`  | `/api/v1/admin/merchants/:id/suspend`                           | ADMIN/SUPER_ADMIN      | Suspend an APPROVED merchant with a reason.                                                                |
| `PATCH`  | `/api/v1/admin/merchants/:id/reinstate`                         | ADMIN/SUPER_ADMIN      | Reinstate a SUSPENDED merchant.                                                                            |
| `GET`    | `/api/v1/admin/merchants/:id/stores`                            | ADMIN/SUPER_ADMIN      | List a merchant's stores (paginated).                                                                      |
| `PATCH`  | `/api/v1/admin/stores/:id/status`                               | ADMIN/SUPER_ADMIN      | Admin-side store status transitions (approve, suspend, reinstate, close).                                  |
| `GET`    | `/api/v1/categories`                                            | Public                 | List categories (paginated, filterable by parent/search).                                                  |
| `GET`    | `/api/v1/categories/:id`                                        | Public                 | Get one category.                                                                                          |
| `POST`   | `/api/v1/admin/categories`                                      | ADMIN/SUPER_ADMIN      | Create a category.                                                                                         |
| `PATCH`  | `/api/v1/admin/categories/:id`                                  | ADMIN/SUPER_ADMIN      | Update a category.                                                                                         |
| `GET`    | `/api/v1/products`                                              | Public                 | List products with variants (paginated, filterable by category/brand/search).                              |
| `GET`    | `/api/v1/products/:id`                                          | Public                 | Get one product with its variants.                                                                         |
| `POST`   | `/api/v1/admin/products`                                        | ADMIN/SUPER_ADMIN      | Create a product, optionally with initial variants.                                                        |
| `PATCH`  | `/api/v1/admin/products/:id`                                    | ADMIN/SUPER_ADMIN      | Update product details.                                                                                    |
| `POST`   | `/api/v1/admin/products/:id/variants`                           | ADMIN/SUPER_ADMIN      | Add a variant to an existing product.                                                                      |
| `PATCH`  | `/api/v1/admin/products/:id/variants/:variantId`                | ADMIN/SUPER_ADMIN      | Update a product variant.                                                                                  |
| `POST`   | `/api/v1/merchants/me/stores/:storeId/listings`                 | MERCHANT_OWNER         | List a product variant for sale at this store.                                                             |
| `GET`    | `/api/v1/merchants/me/stores/:storeId/listings`                 | MERCHANT_OWNER         | List this store's own listings (paginated).                                                                |
| `GET`    | `/api/v1/merchants/me/stores/:storeId/listings/:listingId`      | MERCHANT_OWNER         | Get one listing, with inventory.                                                                           |
| `PATCH`  | `/api/v1/merchants/me/stores/:storeId/listings/:listingId`      | MERCHANT_OWNER         | Update price, MRP, availability, or low-stock threshold.                                                   |
| `GET`    | `.../listings/:listingId/inventory`                             | MERCHANT_OWNER         | Get current on-hand/reserved quantity and batches.                                                         |
| `POST`   | `.../listings/:listingId/inventory/receive`                     | MERCHANT_OWNER         | Receive new stock (initial or additional).                                                                 |
| `POST`   | `.../listings/:listingId/inventory/adjustments`                 | MERCHANT_OWNER         | Apply a signed stocktake/correction. Reason mandatory.                                                     |
| `POST`   | `.../listings/:listingId/inventory/removals`                    | MERCHANT_OWNER         | Write off damaged or expired stock. Reason mandatory.                                                      |
| `GET`    | `.../listings/:listingId/inventory/movements`                   | MERCHANT_OWNER         | List this listing's stock movement history (paginated).                                                    |
| `GET`    | `/api/v1/customers/me/cart`                                     | CUSTOMER               | Get the caller's active cart, priced and validated.                                                        |
| `POST`   | `/api/v1/customers/me/cart/items`                               | CUSTOMER               | Add an item (creates the cart if none is active).                                                          |
| `PATCH`  | `/api/v1/customers/me/cart/items/:itemId`                       | CUSTOMER               | Set an item to an absolute quantity.                                                                       |
| `DELETE` | `/api/v1/customers/me/cart/items/:itemId`                       | CUSTOMER               | Remove an item from the cart.                                                                              |
| `DELETE` | `/api/v1/customers/me/cart`                                     | CUSTOMER               | Clear (abandon) the active cart.                                                                           |
| `POST`   | `/api/v1/checkout/prepare`                                      | CUSTOMER               | Validate and price the active cart for a chosen fulfilment method.                                         |
| `POST`   | `/api/v1/checkout`                                              | CUSTOMER               | Create an order from the active cart. Requires `Idempotency-Key` header.                                   |
| `GET`    | `/api/v1/customers/me/orders`                                   | CUSTOMER               | List the caller's own orders (paginated, filterable by status).                                            |
| `GET`    | `/api/v1/customers/me/orders/:idOrNumber`                       | CUSTOMER               | Get one of the caller's own orders by id or order number.                                                  |
| `GET`    | `/api/v1/merchants/me/stores/:storeId/orders`                   | MERCHANT_OWNER         | List this store's orders (paginated, filterable by status).                                                |
| `GET`    | `/api/v1/merchants/me/stores/:storeId/orders/:orderId`          | MERCHANT_OWNER         | Get one of this store's orders.                                                                            |
| `PATCH`  | `.../orders/:orderId/accept`                                    | MERCHANT_OWNER         | Accept a `CREATED` order -> `ACCEPTED`.                                                                    |
| `PATCH`  | `.../orders/:orderId/reject`                                    | MERCHANT_OWNER         | Reject a `CREATED` order -> `REJECTED`. Reason mandatory.                                                  |
| `PATCH`  | `.../orders/:orderId/preparing`                                 | MERCHANT_OWNER         | `ACCEPTED` -> `PREPARING`.                                                                                 |
| `PATCH`  | `.../orders/:orderId/ready`                                     | MERCHANT_OWNER         | `PREPARING` -> `READY`. Generates the one-time pickup code.                                                |
| `POST`   | `.../orders/:orderId/verify-pickup`                             | MERCHANT_OWNER         | Verify the customer's pickup code; on success, completes the order and captures COD. Throttled (10/min).   |
| `GET`    | `/api/v1/customers/me/orders/:orderId/pickup-code`              | CUSTOMER               | Get the caller's own pickup code, only once the order is `READY`.                                          |
| `POST`   | `/api/v1/admin/delivery-partners`                               | ADMIN/SUPER_ADMIN      | Grant DELIVERY_PARTNER to an existing user and onboard them.                                               |
| `GET`    | `/api/v1/admin/delivery-partners`                               | ADMIN/SUPER_ADMIN      | List delivery partners, optionally filtered by active status (paginated).                                  |
| `GET`    | `/api/v1/admin/delivery-partners/:id`                           | ADMIN/SUPER_ADMIN      | Get one delivery partner's details and current assignment.                                                 |
| `PATCH`  | `/api/v1/admin/delivery-partners/:id/activate`                  | ADMIN/SUPER_ADMIN      | Activate a delivery partner.                                                                               |
| `PATCH`  | `/api/v1/admin/delivery-partners/:id/deactivate`                | ADMIN/SUPER_ADMIN      | Deactivate a delivery partner. They stop receiving new assignments.                                        |
| `GET`    | `/api/v1/admin/delivery-partners/:id/cod-summary`               | ADMIN/SUPER_ADMIN      | A partner's outstanding COD cash-in-custody balance.                                                       |
| `GET`    | `/api/v1/admin/delivery-partners/:id/cod-handovers`             | ADMIN/SUPER_ADMIN      | A partner's recorded cash handovers (paginated).                                                           |
| `GET`    | `/api/v1/admin/delivery-assignments/eligible-orders`            | ADMIN/SUPER_ADMIN      | List HOME_DELIVERY orders awaiting assignment or reassignment (paginated).                                 |
| `GET`    | `/api/v1/admin/delivery-assignments/:orderId`                   | ADMIN/SUPER_ADMIN      | Get the delivery assignment for one order, with its history.                                               |
| `POST`   | `/api/v1/admin/delivery-assignments/:orderId/assign`            | ADMIN/SUPER_ADMIN      | Assign (or reassign) a delivery partner to an eligible order.                                              |
| `PATCH`  | `/api/v1/admin/delivery-assignments/:orderId/cancel`            | ADMIN/SUPER_ADMIN      | Cancel an assignment that has not yet been collected. Reason mandatory.                                    |
| `POST`   | `/api/v1/admin/delivery-assignments/cod-handovers`              | ADMIN/SUPER_ADMIN      | Record a cash handover from a delivery partner.                                                            |
| `GET`    | `/api/v1/admin/delivery-assignments/cod-handovers`              | ADMIN/SUPER_ADMIN      | List all recorded cash handovers (paginated).                                                              |
| `GET`    | `/api/v1/delivery-partners/me/profile`                          | DELIVERY_PARTNER       | Get the caller's own delivery-partner profile.                                                             |
| `PATCH`  | `/api/v1/delivery-partners/me/availability`                     | DELIVERY_PARTNER       | Set own availability (online/offline).                                                                     |
| `GET`    | `/api/v1/delivery-partners/me/assignments/current`              | DELIVERY_PARTNER       | The caller's current (active) assignment, if any.                                                          |
| `GET`    | `/api/v1/delivery-partners/me/cod-summary`                      | DELIVERY_PARTNER       | The caller's outstanding COD cash-in-custody balance.                                                      |
| `GET`    | `.../assignments/:orderId`                                      | DELIVERY_PARTNER       | Get one of the caller's own assignments, with its event history.                                           |
| `PATCH`  | `.../assignments/:orderId/accept`                               | DELIVERY_PARTNER       | Accept a newly assigned delivery.                                                                          |
| `PATCH`  | `.../assignments/:orderId/reject`                               | DELIVERY_PARTNER       | Reject a newly assigned delivery. Reason mandatory.                                                        |
| `PATCH`  | `.../assignments/:orderId/collect`                              | DELIVERY_PARTNER       | Confirm the order was collected from the merchant.                                                         |
| `PATCH`  | `.../assignments/:orderId/out-for-delivery`                     | DELIVERY_PARTNER       | Mark out for delivery. Generates the delivery verification code.                                           |
| `POST`   | `.../assignments/:orderId/verify-delivery`                      | DELIVERY_PARTNER       | Verify the customer's delivery code; on success, completes the order and captures COD. Throttled (10/min). |
| `PATCH`  | `.../assignments/:orderId/fail`                                 | DELIVERY_PARTNER       | Report a failed delivery attempt. Reason mandatory.                                                        |
| `GET`    | `/api/v1/merchants/me/stores/:storeId/orders/:orderId/delivery` | MERCHANT_OWNER         | View the delivery assignment for one of this store's orders.                                               |
| `PATCH`  | `.../delivery/confirm-handover`                                 | MERCHANT_OWNER         | Confirm the delivery partner collected this order. Informational only - never drives order status.         |
| `GET`    | `/api/v1/customers/me/orders/:orderId/delivery-status`          | CUSTOMER               | The caller's own delivery progress for a HOME_DELIVERY order.                                              |
| `GET`    | `/api/v1/customers/me/orders/:orderId/delivery-code`            | CUSTOMER               | Get the caller's own delivery code, only once the order is `OUT_FOR_DELIVERY`.                             |

See [`AUTHENTICATION-DESIGN.md`](AUTHENTICATION-DESIGN.md) for the full OTP/token/session lifecycle,
[ADR-0013](../03-decisions/ADR-0013-phone-otp-auth-opaque-refresh-tokens.md) for the design
decisions behind it, [`MERCHANT-STORE-DESIGN.md`](MERCHANT-STORE-DESIGN.md) for the merchant
application and store lifecycle behind the BC-006 endpoints above,
[`PRODUCT-CATALOGUE-DESIGN.md`](PRODUCT-CATALOGUE-DESIGN.md) /
[`INVENTORY-MANAGEMENT-DESIGN.md`](INVENTORY-MANAGEMENT-DESIGN.md) for the BC-007 endpoints, and
[`CART-CHECKOUT-DESIGN.md`](CART-CHECKOUT-DESIGN.md) /
[`ORDER-MANAGEMENT-DESIGN.md`](ORDER-MANAGEMENT-DESIGN.md) for the BC-008 endpoints, and
[`ORDER-FULFILMENT-DESIGN.md`](ORDER-FULFILMENT-DESIGN.md) /
[`PICKUP-WORKFLOW-DESIGN.md`](PICKUP-WORKFLOW-DESIGN.md) for the BC-009 endpoints, and
[`DELIVERY-MANAGEMENT-DESIGN.md`](DELIVERY-MANAGEMENT-DESIGN.md) /
[`DELIVERY-PARTNER-DESIGN.md`](DELIVERY-PARTNER-DESIGN.md) /
[`COD-DELIVERY-RECONCILIATION-DESIGN.md`](COD-DELIVERY-RECONCILIATION-DESIGN.md) for the BC-010
endpoints above. Every merchant-facing route resolves ownership from the authenticated user, never
a client-supplied merchant/store/listing id; every customer-facing cart/checkout/order route
resolves the customer the same way, never a client-supplied customer id; every delivery-partner
route resolves the partner's own `delivery_partners` row from the authenticated user, never a
client-supplied partner id.

## Planned endpoint groups

These do not exist yet. Listed here so future work has a consistent naming convention to follow,
not as a commitment to exact paths.

| Group                     | Example planned endpoints                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| Customer/location         | `GET /customers/profile`, `GET /customers/addresses`, `GET /serviceability/check`                    |
| Orders (cancellation)     | `POST /customers/me/orders/:id/cancel` (FR-ORD-003, still Planned)                                   |
| Payments                  | `POST /payments/create-intent`, `POST /payments/webhook/:provider`                                   |
| Admin (commission config) | `GET /admin/dashboard`, admin-configurable commission/delivery-fee rules (FR-ADM-002, still Planned) |

When any of these is implemented, update this table's status and let the Swagger output be the
detailed reference rather than duplicating request/response schemas here.

## Related documents

- [`../01-requirements/FUNCTIONAL-REQUIREMENTS.md`](../01-requirements/FUNCTIONAL-REQUIREMENTS.md)
- [`../05-engineering/SECURITY-STANDARDS.md`](../05-engineering/SECURITY-STANDARDS.md) — webhook
  verification, authentication requirements
