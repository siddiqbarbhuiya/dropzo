# UI/UX specification

**Status: Planned** (screen inventory) / **Implemented** (one screen, noted below). This is a
screen inventory, not visual designs — no mockups exist yet.

## Implemented

| Screen              | Route | Notes                                                                                                |
| ------------------- | ----- | ---------------------------------------------------------------------------------------------------- |
| Home / health check | `/`   | Shows the Dropzo name, launch market, a live backend health check, and a Zustand-backed demo button. |

## Planned customer screens

Splash, phone login, location selection, home, category listing, store listing, store catalogue,
product detail, search results, cart, pickup/delivery selection, address selection, checkout,
order confirmation, order tracking, order history, profile, saved addresses, help/complaints.

## Planned merchant screens

Login, store dashboard, store status toggle, incoming orders, order detail, preparation screen,
product catalogue, add/edit product, inventory, low-stock alerts, sales report, store settings.

## Planned admin screens

Dashboard, merchants, stores, customers, delivery partners, product catalogue, inventory, orders,
manual dispatch, payments, refunds, settlements, service zones, complaints, reports, audit logs,
settings.

## Design principles (Accepted, to apply once screens are built)

- Mobile-first responsive layout (NFR-UX-001).
- One codebase, route-separated by role (see
  [`../02-architecture/SYSTEM-ARCHITECTURE.md`](../02-architecture/SYSTEM-ARCHITECTURE.md)).
- Clear, non-technical error messages — never show a raw stack trace to a user (NFR-UX-002).
- Pickup should be presented as a first-class, lower-cost option, not a secondary afterthought to
  delivery (see [ADR-0010](../03-decisions/ADR-0010-pickup-manual-delivery.md)).

## Related documents

- [`../00-project/SCOPE.md`](../00-project/SCOPE.md)
- [`../01-requirements/FUNCTIONAL-REQUIREMENTS.md`](../01-requirements/FUNCTIONAL-REQUIREMENTS.md)
