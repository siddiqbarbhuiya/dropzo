# ADR-0006: Prisma as the intended ORM

- **Status:** Accepted; **implemented in BC-004** (Prisma is now `apps/api`'s ORM - schema, initial
  migration, and a NestJS-managed `PrismaService` all exist). Live verification against a real
  Postgres is still pending - see
  [`../06-delivery/BC-004-IMPLEMENTATION-PLAN.md`](../06-delivery/BC-004-IMPLEMENTATION-PLAN.md)'s
  status note.
- **Date:** 2026-11-07
- **Related requirements/tasks:** BC-004

## Context

Once PostgreSQL is introduced ([ADR-0005](ADR-0005-postgresql-database.md)), the backend needs a
type-safe way to query it from TypeScript, with first-class migration support.

## Problem

Which data-access approach keeps the backend's TypeScript types in sync with the database schema?

## Decision

**Prisma** is the intended ORM, with version-controlled migrations. This is a decision, not an
implementation — no Prisma schema, client, or migration exists yet. Do not assume otherwise.

## Alternatives considered

- **TypeORM** — comparable, but Prisma's generated types and migration workflow are a better fit
  for a solo developer who wants fewer manual steps to keep types correct.
- **Raw SQL / a query builder (Kysely, knex)** — gives more control, but more manual type
  maintenance; rejected for this stage.

## Consequences

- Easier (once implemented): generated TypeScript types from the schema, a clear migration
  history.
- Harder: Prisma migrations must be reviewed carefully for destructive operations — see
  [`AGENTS.md`](../../AGENTS.md)'s database rules.

## Security and operational implications

Prisma migrations must never be run destructively against production without explicit approval.
Database connection strings are secrets — see
[`../05-engineering/SECURITY-STANDARDS.md`](../05-engineering/SECURITY-STANDARDS.md).

## Revisit conditions

Revisit only if Prisma's migration model proves unworkable for a specific schema need (e.g.
complex partial indexes) once real schema work begins.
