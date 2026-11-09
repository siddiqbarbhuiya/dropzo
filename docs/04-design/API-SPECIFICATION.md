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

| Method   | Path                                                | Auth                   | Purpose                                                                   |
| -------- | --------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------- |
| `GET`    | `/api/v1/health`                                    | Public                 | Returns `{status, timestamp, uptimeSeconds}`. Used for liveness checks.   |
| `POST`   | `/api/v1/auth/send-otp`                             | Public                 | Request an OTP for a phone number (login or registration).                |
| `POST`   | `/api/v1/auth/verify-otp`                           | Public                 | Verify an OTP; returns an access/refresh token pair.                      |
| `POST`   | `/api/v1/auth/refresh`                              | Public (token in body) | Rotate a refresh token for a new access/refresh token pair.               |
| `POST`   | `/api/v1/auth/logout`                               | Authenticated          | Revoke the session behind the given refresh token.                        |
| `POST`   | `/api/v1/auth/logout-all`                           | Authenticated          | Revoke every active session for the current user.                         |
| `GET`    | `/api/v1/auth/me`                                   | Authenticated          | Return the authenticated user and their roles.                            |
| `GET`    | `/api/v1/auth/sessions`                             | Authenticated          | List the current user's active sessions.                                  |
| `DELETE` | `/api/v1/auth/sessions/:id`                         | Authenticated          | Revoke one of the current user's own sessions by id.                      |
| `PATCH`  | `/api/v1/admin/users/:id/roles`                     | ADMIN/SUPER_ADMIN      | Grant or revoke a role for a user. Audit-logged.                          |
| `POST`   | `/api/v1/merchants/me`                              | Authenticated          | Submit (or resubmit, after rejection) a merchant application.             |
| `GET`    | `/api/v1/merchants/me`                              | Authenticated          | Get the caller's own merchant profile/application.                        |
| `PATCH`  | `/api/v1/merchants/me`                              | Authenticated          | Update the caller's own editable application details.                     |
| `GET`    | `/api/v1/merchants/me/dashboard`                    | Authenticated          | Summary of the caller's own merchant account and stores.                  |
| `POST`   | `/api/v1/merchants/me/stores`                       | MERCHANT_OWNER         | Create a store. Requires an APPROVED merchant application.                |
| `GET`    | `/api/v1/merchants/me/stores`                       | MERCHANT_OWNER         | List the caller's own stores (paginated).                                 |
| `GET`    | `/api/v1/merchants/me/stores/:storeId`              | MERCHANT_OWNER         | Get one of the caller's own stores.                                       |
| `PATCH`  | `/api/v1/merchants/me/stores/:storeId`              | MERCHANT_OWNER         | Update store details.                                                     |
| `PATCH`  | `/api/v1/merchants/me/stores/:storeId/hours`        | MERCHANT_OWNER         | Update a store's operating hours.                                         |
| `PATCH`  | `/api/v1/merchants/me/stores/:storeId/availability` | MERCHANT_OWNER         | Update pickup/delivery availability.                                      |
| `PATCH`  | `/api/v1/merchants/me/stores/:storeId/status`       | MERCHANT_OWNER         | Self-service status transitions (see MERCHANT-STORE-DESIGN.md).           |
| `GET`    | `/api/v1/admin/merchants`                           | ADMIN/SUPER_ADMIN      | List merchant applications, optionally filtered by status (paginated).    |
| `GET`    | `/api/v1/admin/merchants/:id`                       | ADMIN/SUPER_ADMIN      | Get one merchant application by id.                                       |
| `PATCH`  | `/api/v1/admin/merchants/:id/approve`               | ADMIN/SUPER_ADMIN      | Approve a PENDING application. Grants MERCHANT_OWNER.                     |
| `PATCH`  | `/api/v1/admin/merchants/:id/reject`                | ADMIN/SUPER_ADMIN      | Reject a PENDING application with a reason.                               |
| `PATCH`  | `/api/v1/admin/merchants/:id/suspend`               | ADMIN/SUPER_ADMIN      | Suspend an APPROVED merchant with a reason.                               |
| `PATCH`  | `/api/v1/admin/merchants/:id/reinstate`             | ADMIN/SUPER_ADMIN      | Reinstate a SUSPENDED merchant.                                           |
| `GET`    | `/api/v1/admin/merchants/:id/stores`                | ADMIN/SUPER_ADMIN      | List a merchant's stores (paginated).                                     |
| `PATCH`  | `/api/v1/admin/stores/:id/status`                   | ADMIN/SUPER_ADMIN      | Admin-side store status transitions (approve, suspend, reinstate, close). |

See [`AUTHENTICATION-DESIGN.md`](AUTHENTICATION-DESIGN.md) for the full OTP/token/session lifecycle,
[ADR-0013](../03-decisions/ADR-0013-phone-otp-auth-opaque-refresh-tokens.md) for the design
decisions behind it, and [`MERCHANT-STORE-DESIGN.md`](MERCHANT-STORE-DESIGN.md) for the merchant
application and store lifecycle behind the BC-006 endpoints above. Every merchant-facing route
resolves ownership from the authenticated user, never a client-supplied merchant/store id.

## Planned endpoint groups

These do not exist yet. Listed here so future work has a consistent naming convention to follow,
not as a commitment to exact paths.

| Group             | Example planned endpoints                                                         |
| ----------------- | --------------------------------------------------------------------------------- |
| Customer/location | `GET /customers/profile`, `GET /customers/addresses`, `GET /serviceability/check` |
| Catalogue         | `GET /categories`, `GET /products`, `GET /stores/:id/products`                    |
| Cart/checkout     | `GET /cart`, `POST /cart/items`, `POST /checkout`                                 |
| Orders            | `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel`                       |
| Delivery          | `GET /delivery/assignments`, `POST /delivery/assignments/:id/delivered`           |
| Payments          | `POST /payments/create-intent`, `POST /payments/webhook/:provider`                |
| Admin             | `GET /admin/dashboard`                                                            |

When any of these is implemented, update this table's status and let the Swagger output be the
detailed reference rather than duplicating request/response schemas here.

## Related documents

- [`../01-requirements/FUNCTIONAL-REQUIREMENTS.md`](../01-requirements/FUNCTIONAL-REQUIREMENTS.md)
- [`../05-engineering/SECURITY-STANDARDS.md`](../05-engineering/SECURITY-STANDARDS.md) — webhook
  verification, authentication requirements
