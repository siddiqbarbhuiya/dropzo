# ADR-0010: Pickup and manual delivery workflow

- **Status:** Accepted
- **Date:** 2026-11-07
- **Related requirements/tasks:** FR-PICK-001, FR-DEL-001, FR-DEL-002

## Context

Dropzo needs a fulfilment model that works with limited capital and no dedicated delivery fleet at
launch, while still supporting delivery for customers who want it.

## Problem

How should orders be fulfilled at launch, given no automated dispatch system and no owned fleet?

## Decision

Support **both pickup and delivery from the first release**, with:

- **Pickup** verified by a one-time code (hashed, time-limited, rate-limited against repeated
  attempts).
- **Delivery** assigned **manually by an admin**, not by an automated dispatch algorithm.

## Alternatives considered

- **Delivery-only at launch** — rejected: pickup is lower-cost to operate and attractive to
  nearby customers; omitting it removes a core differentiator from quick-commerce competitors.
- **Automated dispatch from day one** — rejected: requires rider-availability tracking and
  routing logic that isn't justified before there is real delivery volume.

## Consequences

- Easier: pickup reduces delivery cost and complexity for a meaningful share of orders; manual
  dispatch is simple to operate and observe at low volume.
- Harder: manual dispatch doesn't scale past a small number of concurrent daily deliveries —
  automated assignment is explicitly deferred, not solved now.

## Security and operational implications

Pickup codes must be hashed at rest, expire, and reject repeated/incorrect attempts (see
[`../05-engineering/SECURITY-STANDARDS.md`](../05-engineering/SECURITY-STANDARDS.md)). Delivery
completion requires proof before an order is marked complete.

## Revisit conditions

Revisit automated dispatch once daily delivery volume makes manual assignment operationally
unworkable.
