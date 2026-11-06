# ADR-0007: Merchant-owned inventory at launch

- **Status:** Accepted
- **Date:** 2026-11-07
- **Related requirements/tasks:** FR-INV-001, FR-MER-001

## Context

Dropzo needs a product catalogue on day one without the capital or operational overhead of buying
and warehousing stock itself.

## Problem

Should Dropzo purchase and hold its own inventory at launch, or rely on local merchants' existing
stock?

## Decision

Launch as a **marketplace with merchant-owned inventory**. Merchants manage their own stock and
prices through their own store listings. Dropzo's own (platform-owned) inventory is a data-model
capability, not a launch feature — the schema supports an `inventory_owner_type` of `MERCHANT` or
`PLATFORM`, but only `MERCHANT` is used at launch.

## Alternatives considered

- **Platform-owned inventory from day one (dark-store model)** — rejected: requires working
  capital, warehouse space, and absorbs expiry/wastage risk — infeasible for a minimal-investment
  solo launch.
- **Hybrid from day one** — rejected for the _launch_, accepted as the _eventual_ direction: adding
  platform stock before there is real demand data risks purchasing the wrong products.

## Consequences

- Easier: no inventory capital risk, faster to onboard new product categories (just onboard a
  merchant who already stocks them).
- Harder: availability and fulfilment quality depend on merchant diligence — requires a merchant
  agreement covering stock accuracy and order preparation time (business process, not code).

## Security and operational implications

A merchant must only see and modify their own stores' inventory — see FR-MER-003 and
[`../05-engineering/SECURITY-STANDARDS.md`](../05-engineering/SECURITY-STANDARDS.md).

## Revisit conditions

Revisit after 2–4 weeks of real order data identifies specific, high-demand, reliably-supplied
products worth stocking directly.
