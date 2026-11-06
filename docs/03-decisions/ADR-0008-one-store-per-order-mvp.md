# ADR-0008: One store per order for MVP

- **Status:** Accepted
- **Date:** 2026-11-07
- **Related requirements/tasks:** FR-CART-001

## Context

A customer may want products from several stores (e.g. rice from one shop, milk from another).
Supporting that in one checkout requires splitting one payment across multiple fulfilment orders,
with independent acceptance, cancellation, and delivery per store.

## Problem

Should the MVP support a single checkout spanning multiple stores, or restrict each order to one
store?

## Decision

**One store per cart/order in the MVP.** A multi-store "master order" that splits into
per-store child orders is a deliberately deferred design, not built now.

## Alternatives considered

- **Multi-store checkout from day one** — rejected: introduces complex delivery-fee splitting,
  partial cancellations, partial refunds, and per-store settlement accounting before the single-
  store workflow is even proven to work reliably.

## Consequences

- Easier: checkout, payment, and settlement logic all stay simple and per-order.
- Harder: a customer wanting items from two stores must place two separate orders (and pay two
  delivery fees, if delivered) — a real UX limitation, accepted for the MVP.

## Security and operational implications

None beyond the general order/payment integrity rules in
[`../04-design/BUSINESS-RULES.md`](../04-design/BUSINESS-RULES.md).

## Revisit conditions

Revisit once the single-store pickup and delivery workflow is reliable in production and customer
demand for multi-store orders is actually observed.
