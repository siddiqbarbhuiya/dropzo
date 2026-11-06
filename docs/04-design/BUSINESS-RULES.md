# Business rules

**Status:** Each rule below is labelled individually. Most are **Planned design requirements** —
rules the system must follow once built — not yet enforced by any code, since no business module
exists yet.

## Catalogue and inventory

| Rule                                                                                                                                                                    | Status                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| One store per order; a cart cannot mix products from two stores.                                                                                                        | Planned (FR-CART-001)                               |
| The product catalogue (global product info) and store listings (price/stock per store) are separate concepts — never store price or stock on the global product record. | Planned (FR-CAT-003)                                |
| Product variants and selling units (kg, ml, piece, pack) must be explicit, not assumed.                                                                                 | Planned (FR-CAT-002)                                |
| Every stock change must create an auditable movement record (who, what, when, why).                                                                                     | Planned (FR-INV-003)                                |
| Stock reservations must prevent overselling under concurrent checkout (use row locking, e.g. `SELECT ... FOR UPDATE`).                                                  | Planned (NFR-DATA-001)                              |
| Perishable goods may require batch tracking, expiry dates, and FEFO (first-expiry-first-out) picking.                                                                   | Planned, deferred until perishables are prioritised |

## Orders and checkout

| Rule                                                                                                                                          | Status                 |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| The server recalculates all prices and stock at checkout; a client-supplied total is never trusted.                                           | Planned (FR-ORD-001)   |
| Orders must retain price snapshots (name, variant, unit price at time of order) — a later price change must never alter a past order's total. | Planned                |
| Checkout must be transactional: order creation and stock reservation succeed or fail together.                                                | Planned (NFR-DATA-001) |
| A repeated identical checkout/payment request must never create a duplicate order or charge (idempotency).                                    | Planned (NFR-API-001)  |

## Merchant isolation

| Rule                                                                                                                   | Status                                                     |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| A merchant user must never access another merchant's stores, products, orders, or settlements.                         | Planned (FR-MER-003)                                       |
| Every protected endpoint must check both role and resource ownership — hiding a button in the UI is not authorization. | Accepted (engineering principle, applies once auth exists) |

## Pickup and delivery

| Rule                                                                                                    | Status                |
| ------------------------------------------------------------------------------------------------------- | --------------------- |
| Pickup verification codes must be hashed, time-limited, and rejected on repeated or incorrect attempts. | Planned (FR-PICK-001) |
| Delivery completion requires proof (OTP or equivalent) before an order is marked delivered.             | Planned (FR-DEL-002)  |
| Delivery assignment is manual at launch — no automated dispatch algorithm.                              | Accepted (ADR-0010)   |

## Payments and settlements

| Rule                                                                                                         | Status              |
| ------------------------------------------------------------------------------------------------------------ | ------------------- |
| COD is the only payment method at launch; payment status is modelled separately from order status.           | Accepted (ADR-0009) |
| When online payments are introduced, payment webhooks must be signature-verified and processed idempotently. | Planned             |
| Refunds, commissions, and settlements must be auditable (traceable to a reason and an actor).                | Planned             |

## Related documents

- [`../01-requirements/FUNCTIONAL-REQUIREMENTS.md`](../01-requirements/FUNCTIONAL-REQUIREMENTS.md)
- [`../03-decisions/`](../03-decisions/)
- [`../05-engineering/SECURITY-STANDARDS.md`](../05-engineering/SECURITY-STANDARDS.md)
