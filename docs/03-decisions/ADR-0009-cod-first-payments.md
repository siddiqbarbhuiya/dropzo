# ADR-0009: COD-first payment strategy

- **Status:** Accepted
- **Date:** 2026-11-07
- **Related requirements/tasks:** FR-PAY-001, FR-PAY-002

## Context

Online payment integration adds real complexity: gateway accounts, webhook verification,
idempotency, and refund handling. None of this is needed to validate whether customers and
merchants will actually use Dropzo.

## Problem

Should the MVP require online payment integration before launch, or can it launch without one?

## Decision

**Cash on delivery/pickup (COD) is the only payment method at launch.** Online payment
(UPI/cards/net banking via a gateway) is a later phase, added once the core ordering workflow is
proven.

## Alternatives considered

- **Online payment from day one** — rejected: adds webhook security, idempotency, and refund-
  reconciliation work before there is a single real order to process.

## Consequences

- Easier: launch sooner, with less security surface area to get right before the first order.
- Harder: COD reconciliation is a manual/operational process at launch, and the order/payment
  status model must still be designed to support online payment later without rework (see
  [`../04-design/BUSINESS-RULES.md`](../04-design/BUSINESS-RULES.md)).

## Security and operational implications

Even without a gateway, payment status is modelled separately from order status so the switch to
online payment later is additive, not a redesign.

## Revisit conditions

Revisit once the pilot proves repeat ordering and merchants ask for online payment, or COD
collection/reconciliation proves operationally painful.
