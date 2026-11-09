# Product catalogue design

**Status:** Implemented (BC-007). See [`API-SPECIFICATION.md`](API-SPECIFICATION.md) for the exact
endpoints and [`DATABASE-DESIGN.md`](DATABASE-DESIGN.md) for the `categories`/`products`/
`product_variants`/`store_products` table specs. Builds on BC-005 auth
([`AUTHENTICATION-DESIGN.md`](AUTHENTICATION-DESIGN.md)) and BC-006 merchant/store ownership
([`MERCHANT-STORE-DESIGN.md`](MERCHANT-STORE-DESIGN.md)); neither is re-reviewed here.

## Overview

The catalogue is split into two layers, matching the schema BC-004 already modeled:

1. **Global catalogue** (`categories`, `products`, `product_variants`) - admin-managed, one shared
   taxonomy and product master across the whole marketplace. Reads are public (no auth) since
   catalogue browsing is not a merchant- or customer-specific operation.
2. **Store-specific listings** (`store_products` + `inventory`) - merchant-owned, connecting a
   global `ProductVariant` to one store with its own price/availability. Covered in
   [`INVENTORY-MANAGEMENT-DESIGN.md`](INVENTORY-MANAGEMENT-DESIGN.md) alongside stock operations,
   since a listing and its paired inventory row are always created together.

Cart, checkout, orders, payments, delivery, loyalty, recommendations, and any AI/analytics features
are explicitly out of scope (see `docs/06-delivery/TASK-TRACKER.md`).

## Variant modeling (the one rule that matters most)

A single real-world product sold in multiple pack sizes (e.g. Basmati rice in 1kg/5kg/10kg) is
**one `Product` row with multiple `ProductVariant` rows** - never separate, unrelated `Product`
rows. `ProductVariant` carries the unit (`unit`, `pack_size`), identification (`sku`, `barcode`),
and its own `is_active` flag, independent of the parent product's. This mirrors how the grocery
categories named in the requirements (rice/pulses, dairy, beverages, bakery, packaged foods,
household, personal care, stationery) are actually sold - the variation is in packaging/quantity,
not in the underlying product identity.

`Product.attributes` is a single open `Json` column (already in the BC-004 schema) rather than a
dedicated attribute-type/attribute-value framework - deliberately, per the task's explicit
instruction to avoid unnecessary complexity. It holds free-form, product-specific facts (e.g.
`{"cuisine": "Assamese"}`) that don't need to be queried/filtered on in this milestone; if a future
milestone needs structured, filterable attributes, that is a new, additive schema change, not a
retrofit of this column.

## Category hierarchy

`categories` is self-referencing (`parent_id -> categories.id`, `onDelete: Restrict`), so a
subcategory cannot outlive its parent. `CategoryService`:

- Slugifies `name` (or an explicit `slug`) into a URL-safe, unique `slug` - lowercase,
  non-alphanumeric runs collapsed to `-`, trimmed, capped at 140 chars (the column's limit).
- Rejects a `parentId` that doesn't exist, and rejects a category being set as its own parent (the
  cheap, non-recursive check this milestone needs; detecting a longer cycle through several levels
  is not attempted since nothing in the admin UI lets an operator create one in a single call).
- Maps the `slug` unique-constraint violation to a `409 Conflict` rather than a raw DB error.

## Admin vs public surface

| Route                                                                                | Access                | Purpose                                     |
| ------------------------------------------------------------------------------------ | --------------------- | ------------------------------------------- |
| `GET /categories`, `GET /categories/:id`                                             | Public                | Catalogue browsing.                         |
| `POST /admin/categories`, `PATCH /admin/categories/:id`                              | `ADMIN`/`SUPER_ADMIN` | Taxonomy management.                        |
| `GET /products`, `GET /products/:id`                                                 | Public                | Catalogue browsing, with variants included. |
| `POST /admin/products`, `PATCH /admin/products/:id`                                  | `ADMIN`/`SUPER_ADMIN` | Product master management.                  |
| `POST /admin/products/:id/variants`, `PATCH /admin/products/:id/variants/:variantId` | `ADMIN`/`SUPER_ADMIN` | Variant management.                         |

No merchant-facing route can create/edit a global `Product`, `ProductVariant`, or `Category` - a
merchant's only catalogue-adjacent capability is creating a **listing** against an existing,
active variant (see `INVENTORY-MANAGEMENT-DESIGN.md`). `ProductService.getVariantOrThrow(productId,
variantId)` always scopes the lookup to the given product, so a variant id can never be resolved
against the wrong parent product even from trusted (admin) callers.

## Search, filtering, pagination

Both `CategoryService.list` and `ProductService.list` reuse the existing `PaginationDto` /
`PaginatedResult<T>` shape from BC-006 (`page`/`limit`, `{ data, meta }`), rather than inventing a
second pagination convention. `ProductService.list` filters by `categoryId` and case-insensitive
`brand`, and searches `name`/`brand` via a case-insensitive `OR` - deliberately simple
substring/ILIKE search, not a dedicated search engine, since the requirement is catalogue
browsing/filtering, not full-text relevance ranking.
