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

| Method | Path             | Purpose                                                                 |
| ------ | ---------------- | ----------------------------------------------------------------------- |
| `GET`  | `/api/v1/health` | Returns `{status, timestamp, uptimeSeconds}`. Used for liveness checks. |

## Planned endpoint groups

These do not exist yet. Listed here so future work has a consistent naming convention to follow,
not as a commitment to exact paths.

| Group             | Example planned endpoints                                                            |
| ----------------- | ------------------------------------------------------------------------------------ |
| Authentication    | `POST /auth/send-otp`, `POST /auth/verify-otp`, `POST /auth/refresh`, `GET /auth/me` |
| Customer/location | `GET /customers/profile`, `GET /customers/addresses`, `GET /serviceability/check`    |
| Catalogue         | `GET /categories`, `GET /products`, `GET /stores/:id/products`                       |
| Cart/checkout     | `GET /cart`, `POST /cart/items`, `POST /checkout`                                    |
| Orders            | `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel`                          |
| Merchant          | `POST /merchant/stores`, `GET /merchant/orders`, `PATCH /merchant/store-status`      |
| Delivery          | `GET /delivery/assignments`, `POST /delivery/assignments/:id/delivered`              |
| Payments          | `POST /payments/create-intent`, `POST /payments/webhook/:provider`                   |
| Admin             | `GET /admin/dashboard`, `PATCH /admin/merchants/:id/approve`                         |

When any of these is implemented, update this table's status and let the Swagger output be the
detailed reference rather than duplicating request/response schemas here.

## Related documents

- [`../01-requirements/FUNCTIONAL-REQUIREMENTS.md`](../01-requirements/FUNCTIONAL-REQUIREMENTS.md)
- [`../05-engineering/SECURITY-STANDARDS.md`](../05-engineering/SECURITY-STANDARDS.md) — webhook
  verification, authentication requirements
