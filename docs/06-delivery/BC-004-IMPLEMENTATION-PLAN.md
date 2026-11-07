# BC-004 implementation plan: PostgreSQL, Docker Compose, Prisma, and unified dev environment

**Status: Proposed** (plan only — nothing in this document has been implemented). Prepared in
BC-003.1; execution is a separate, future task. Do not implement from this plan until the open
questions in [`../04-design/DATABASE-DESIGN-REVIEW.md`](../04-design/DATABASE-DESIGN-REVIEW.md#10-decisions-requiring-product-owner-approval)
are resolved — building the full schema before that review is approved risks rework.

## Scope

In scope: local PostgreSQL via Docker Compose, Prisma installation and NestJS integration, the
**MVP-required** tables from the database review (not the full business schema — see the review's
section 8), environment variable management, migration/seed workflow, and the unified
`nx run-many -t dev` startup experience.

Out of scope: business APIs, authentication, the full future schema (coupons, notifications,
ledger details beyond a minimal table), and anything the database review flags as "future phase."

## Stages

### Stage 1 — PostgreSQL via Docker Compose

- Add `infrastructure/docker/docker-compose.yml` with a `postgres` service (official `postgres`
  image, pinned minor version), a named volume for data persistence, and a healthcheck
  (`pg_isready`).
- Add `infrastructure/docker/.env.example` (or reuse the root one) for `POSTGRES_USER`,
  `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`.
- Verification: `docker compose up -d` brings Postgres to a healthy state, confirmed via
  `docker compose ps` showing `healthy`, and `psql`/a simple connection test succeeding.

### Stage 2 — Nx infrastructure project

- Add a `infrastructure` Nx project (no source code to build/test/lint — only `dev`, `down`, and
  `status` targets, each a thin `nx:run-commands` wrapper around `docker compose` in
  `infrastructure/docker/`).
- `dev`: `docker compose up -d` plus a wait-for-healthy step.
- `down`: `docker compose down`.
- `status`: `docker compose ps`.
- No fake `build`/`test`/`lint` targets — this project only orchestrates infrastructure, per the
  instruction not to create targets for things that aren't services.

### Stage 3 — Prisma installation and NestJS integration

- Add `prisma` and `@prisma/client` to `apps/api`'s dependencies.
- `apps/api/prisma/schema.prisma` pointing at `DATABASE_URL`.
- A minimal `PrismaService` (NestJS-managed Prisma client lifecycle: connect on module init,
  disconnect on shutdown) — this is standard NestJS+Prisma wiring, not a business module.
- Update `apps/api/src/config/env.validation.ts` to require `DATABASE_URL` once Prisma is wired
  (currently optional, per BC-002).

### Stage 4 — Initial schema (MVP-required tables only)

- Translate the **MVP-required** entity list from
  [`DATABASE-DESIGN-REVIEW.md`](../04-design/DATABASE-DESIGN-REVIEW.md#8-mvp-vs-future-phase-recommendations)
  into a first Prisma schema: `users`, `user_roles`, `user_sessions`, `user_addresses`,
  `merchants`, `merchant_staff`, `stores`, `service_zones`, `categories`, `products`,
  `product_variants`, `store_products`, `inventory`, `stock_movements`, `stock_reservations`,
  `carts`, `cart_items`, `orders`, `order_items`, `order_status_history`, `payments`,
  `pickup_verifications`, `audit_logs`, plus the idempotency and ledger additions the review
  recommends.
- This stage waits on product-owner approval of the review's open questions (financial ledger,
  notifications classification, `store_locations`).
- No full business schema (coupons, settlements beyond a minimal shape, notifications) in this
  stage — those come with their own feature tasks.

### Stage 5 — Migrations and seed strategy

- `npx prisma migrate dev` for local development migrations, version-controlled under
  `apps/api/prisma/migrations/`.
- A seed script (`apps/api/prisma/seed.ts`) with minimal development fixtures: one merchant, one
  store, a handful of products — enough to exercise the pickup workflow end to end once it exists.
- Document the exact commands in `docs/07-operations/DEVELOPMENT-SETUP.md` once implemented.

### Stage 6 — Separate development and test databases

- Two databases (e.g. `dropzo_dev`, `dropzo_test`), same Postgres container, selected via
  `DATABASE_URL` per environment (`.env` vs. a test-specific env file).
- Integration tests (once introduced, per
  [`../05-engineering/TESTING-STRATEGY.md`](../05-engineering/TESTING-STRATEGY.md)) run migrations
  against the test database, never the dev one.

### Stage 7 — Backup and restore (local, minimal)

- A documented `pg_dump`/`pg_restore` procedure for local backups — not a production backup
  service (that's a later, separate deployment-time concern, see
  [`../07-operations/DEPLOYMENT-GUIDE.md`](../07-operations/DEPLOYMENT-GUIDE.md)).
- This closes TD-005 in [`../08-quality/TECHNICAL-DEBT.md`](../08-quality/TECHNICAL-DEBT.md) at the
  local-development level only; production backup/restore remains a deployment-task item.

### Stage 8 — Unified startup: `nx run-many -t dev`

Investigated in BC-003.1 (see [`PROGRESS.md`](PROGRESS.md), BC-003.1 section, and the summary in
the BC-003.1 final report) — the bare `nx` command already works via a one-time global CLI
install, which correctly delegates to this repository's pinned local Nx version. What BC-004 still
needs to add:

- Give `apps/web` and `apps/api` explicit `dependsOn` entries in their `project.json`/`nx.json`
  target defaults so `dev` waits for `infrastructure:dev` (Postgres healthy) before starting the
  API, and the API before the frontend assumes it's reachable (soft dependency — the frontend can
  start regardless and just show "backend unreachable" per its existing health-check UI from
  BC-002).
- Confirm `nx run-many -t dev` only starts `infrastructure`, `api`, and `web` — never the shared
  packages, which have no `dev` script and so already don't get one (verified in BC-003.1 — Nx
  does not fabricate targets for scripts that don't exist).
- Document the one-time global Nx CLI install prerequisite (see Part 3 investigation,
  reproduced below) in `docs/07-operations/DEVELOPMENT-SETUP.md`.

### Stage 9 — Testing and verification

- Verify `nx run-many -t dev` starts Postgres (healthy), the API (connects successfully), and the
  web app (reaches the API) from a single command, in a fresh PowerShell session.
- Verify `nx run infrastructure:down` cleanly stops and removes containers.
- Verify repeated `nx run-many -t dev` after a `down` doesn't error or leave orphaned containers.
- Re-run the full existing check suite (`lint`, `typecheck`, `test`, `build`) to confirm nothing
  regressed.

## One-time prerequisite: bare `nx` command on Windows

This was investigated and verified working in BC-003.1 (see the final report for the actual
commands run and their output). Summary, to be added to
`docs/07-operations/DEVELOPMENT-SETUP.md` when BC-004 starts:

```powershell
npm install -g nx@24.0.5   # match the repo's pinned version (see package.json)
```

This is a **one-time, per-machine** step. It does not touch the repository's own `package.json` or
`package-lock.json` — verified in BC-003.1. After this, running `nx <command>` from inside the
repository automatically uses the repository's local, pinned Nx version, not the global one — this
is Nx's own documented global/local delegation behaviour, not a custom script. If the repository's
pinned Nx version is ever bumped, re-run the same command with the new version number to keep the
global CLI from nagging (cosmetic only — delegation to the correct local version happens either
way).

## Dependencies between stages

Stage 1 → Stage 2 (infra project wraps compose) → Stage 3 (Prisma needs a running Postgres to
`migrate dev` against) → Stage 4 (schema) → Stage 5 (migrations/seed) → Stage 6 (test DB) → Stage 7
(backup, independent, can run anytime after Stage 1) → Stage 8 (unified startup, needs Stages 1–3
done) → Stage 9 (verification, last).

## Related documents

- [`../04-design/DATABASE-DESIGN.md`](../04-design/DATABASE-DESIGN.md)
- [`../04-design/DATABASE-DESIGN-REVIEW.md`](../04-design/DATABASE-DESIGN-REVIEW.md)
- [`../03-decisions/ADR-0005-postgresql-database.md`](../03-decisions/ADR-0005-postgresql-database.md)
- [`../03-decisions/ADR-0006-prisma-orm-planned.md`](../03-decisions/ADR-0006-prisma-orm-planned.md)
- [`ROADMAP.md`](ROADMAP.md)
- [`TASK-TRACKER.md`](TASK-TRACKER.md)
