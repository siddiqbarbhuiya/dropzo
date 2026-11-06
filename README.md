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

Project foundation only. No application features are implemented yet.

## Development rules

See [AGENTS.md](./AGENTS.md) for the rules a coding agent (or any contributor) must follow in this
repository.
