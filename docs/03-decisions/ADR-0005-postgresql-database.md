# ADR-0005: PostgreSQL as the relational database

- **Status:** Accepted; **implemented in BC-004** (schema and local Docker infrastructure - see
  [`../06-delivery/BC-004-IMPLEMENTATION-PLAN.md`](../06-delivery/BC-004-IMPLEMENTATION-PLAN.md)).
  Live verification against a real Postgres is still pending - see that plan's status note.
- **Date:** 2026-11-07
- **Related requirements/tasks:** BC-004

## Context

Dropzo's data model has strongly relational structure: merchants own stores, stores list
products with independent stock and pricing, orders reference snapshots of prices, and
settlements must reconcile against orders. Geographic queries (nearby stores, service zones) are
also needed.

## Problem

Which database fits a relational, transaction-heavy domain with a geographic component, on a
minimal-investment budget?

## Decision

**PostgreSQL**, with **PostGIS** once geographic queries are needed. A managed PostgreSQL
provider (e.g. Neon or Supabase) is the intended free-tier-first starting point — see
[`../07-operations/DEPLOYMENT-GUIDE.md`](../07-operations/DEPLOYMENT-GUIDE.md).

## Alternatives considered

- **MongoDB / a document database** — rejected: the domain (orders, inventory, settlements) needs
  strong relational integrity and transactions, which a document database makes harder to get
  right.
- **MySQL** — comparable, but PostgreSQL's native geographic extension (PostGIS) and JSON support
  fit this project's needs better.

## Consequences

- Easier: strong relational integrity, mature tooling, PostGIS for location queries when needed.
- Harder: requires a managed hosting decision and backup/restore discipline before production use
  — not yet addressed (see [`../08-quality/TECHNICAL-DEBT.md`](../08-quality/TECHNICAL-DEBT.md)).

## Security and operational implications

Database backups and tested restoration are required before public launch (NFR-OPS-001). Secrets
(connection strings) must never be committed — see
[`../05-engineering/SECURITY-STANDARDS.md`](../05-engineering/SECURITY-STANDARDS.md).

## Revisit conditions

None anticipated before launch. Revisit only if a specific, measured access pattern genuinely
needs a different storage engine.
