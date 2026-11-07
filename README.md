# Dropzo

A local grocery and daily-needs marketplace. Initial launch market: Badarpur, Sribhumi, Assam, India.

## What this is

Customers order groceries, perishable food, beverages, household essentials, stationery, and books
from approved nearby merchants. Customers choose store pickup or home delivery.

## Business model

Hybrid marketplace: merchant-owned inventory first, with the architecture ready for platform-owned
inventory later. One store per order in the MVP.

## Approved stack

- Frontend: React + TypeScript + Vite, React Router, TanStack Query, Zustand, styled-components
- Backend: Node.js + TypeScript + NestJS, REST APIs, OpenAPI/Swagger, Prisma ORM
- Database: PostgreSQL (+ PostGIS when geographic queries are introduced)
- Architecture: modular monolith (no microservices in the MVP)

## Repository layout

```
apps/
  web/        customer, merchant and admin frontend (one app, route-separated)
  api/        NestJS backend (modular monolith)
packages/
  shared-types/   types shared between web and api
  validation/     shared validation schemas
  api-client/     typed API client used by web
docs/             SRS, ER diagram, API spec, architecture notes
infrastructure/
  docker/         local development containers (e.g. PostgreSQL)
  deployment/     deployment configuration
scripts/          developer utility scripts
```

## Status

Foundation, tooling, and the database/development infrastructure are in place: repository setup,
dev tooling, Nx orchestration, this documentation system, the full database schema (41 MVP-required
tables) with local PostgreSQL + PostGIS via Docker Compose, Prisma, a deterministic seed, and CI.
**No customer-facing, merchant-facing, or admin business features are implemented yet** — those are
future tasks. See [`docs/06-delivery/PROGRESS.md`](docs/06-delivery/PROGRESS.md) for exactly what's
done and what remains to be verified.

## Documentation

**[`docs/README.md`](docs/README.md) is the canonical documentation index** — product scope,
requirements, architecture, decisions (ADRs), business rules, engineering standards, and task
tracking all live there. If anything elsewhere (a comment, an old conversation, this file) ever
conflicts with `docs/`, the documentation wins.

## Development rules

See [AGENTS.md](./AGENTS.md) — the entry point for any AI coding assistant or human contributor
working in this repository.
