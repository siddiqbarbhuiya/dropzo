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

| Method   | Path                            | Auth                   | Purpose                                                                 |
| -------- | ------------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| `GET`    | `/api/v1/health`                | Public                 | Returns `{status, timestamp, uptimeSeconds}`. Used for liveness checks. |
| `POST`   | `/api/v1/auth/send-otp`         | Public                 | Request an OTP for a phone number (login or registration).              |
| `POST`   | `/api/v1/auth/verify-otp`       | Public                 | Verify an OTP; returns an access/refresh token pair.                    |
| `POST`   | `/api/v1/auth/refresh`          | Public (token in body) | Rotate a refresh token for a new access/refresh token pair.             |
| `POST`   | `/api/v1/auth/logout`           | Authenticated          | Revoke the session behind the given refresh token.                      |
| `POST`   | `/api/v1/auth/logout-all`       | Authenticated          | Revoke every active session for the current user.                       |
| `GET`    | `/api/v1/auth/me`               | Authenticated          | Return the authenticated user and their roles.                          |
| `GET`    | `/api/v1/auth/sessions`         | Authenticated          | List the current user's active sessions.                                |
| `DELETE` | `/api/v1/auth/sessions/:id`     | Authenticated          | Revoke one of the current user's own sessions by id.                    |
| `PATCH`  | `/api/v1/admin/users/:id/roles` | ADMIN/SUPER_ADMIN      | Grant or revoke a role for a user. Audit-logged.                        |

See [`AUTHENTICATION-DESIGN.md`](AUTHENTICATION-DESIGN.md) for the full OTP/token/session lifecycle,
and [ADR-0013](../03-decisions/ADR-0013-phone-otp-auth-opaque-refresh-tokens.md) for the design
decisions behind it. `MerchantAccessGuard` (server-side merchant/store ownership checks) is also
implemented as a foundation but has no routes of its own yet — see AUTHENTICATION-DESIGN.md's
"Merchant/store authorization" section.

## Planned endpoint groups

These do not exist yet. Listed here so future work has a consistent naming convention to follow,
not as a commitment to exact paths.

| Group             | Example planned endpoints                                                         |
| ----------------- | --------------------------------------------------------------------------------- |
| Customer/location | `GET /customers/profile`, `GET /customers/addresses`, `GET /serviceability/check` |
| Catalogue         | `GET /categories`, `GET /products`, `GET /stores/:id/products`                    |
| Cart/checkout     | `GET /cart`, `POST /cart/items`, `POST /checkout`                                 |
| Orders            | `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel`                       |
| Merchant          | `POST /merchant/stores`, `GET /merchant/orders`, `PATCH /merchant/store-status`   |
| Delivery          | `GET /delivery/assignments`, `POST /delivery/assignments/:id/delivered`           |
| Payments          | `POST /payments/create-intent`, `POST /payments/webhook/:provider`                |
| Admin             | `GET /admin/dashboard`, `PATCH /admin/merchants/:id/approve`                      |

When any of these is implemented, update this table's status and let the Swagger output be the
detailed reference rather than duplicating request/response schemas here.

## Related documents

- [`../01-requirements/FUNCTIONAL-REQUIREMENTS.md`](../01-requirements/FUNCTIONAL-REQUIREMENTS.md)
- [`../05-engineering/SECURITY-STANDARDS.md`](../05-engineering/SECURITY-STANDARDS.md) — webhook
  verification, authentication requirements
