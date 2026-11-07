# BC-004 implementation plan: PostgreSQL, Docker Compose, Prisma, and unified dev environment

**Status: Implemented and verified.** All 9 stages below are complete, and CI run #4 on commit
`b80ce34` (https://github.com/siddiqbarbhuiya/dropzo/actions/runs/42363253263) passed in full
against real PostgreSQL + PostGIS: 5/5 test suites, 21/21 tests, migrations applied cleanly to both
the development and test databases, and the deterministic seed ran twice successfully. The first
three CI runs failed first on an npm bin-name collision between `dotenv-cli` and a transitive
`dotenv` dependency (not a schema problem), then on a test-fixture bug (an inventory row not kept
in sync with its batches, not a schema or application-logic defect) — see
[`PROGRESS.md`](PROGRESS.md)'s BC-004 entries for the full diagnosis of each. The build machine's
own Docker (needs hardware virtualization enabled in firmware) and its separate native PostgreSQL
17 service (missing the PostGIS extension) remain unavailable for _local_ verification, but this is
no longer a gap: CI is the environment that proves this work, and it has now done so.

Prepared in BC-003.1; revised in BC-003.2 after the database design
review's open questions were resolved by product-owner decisions; revised in BC-003.3 after a
second, independent schema review; finalized in BC-003.4 after a third, comprehensive review
closed the remaining defects (platform-account uniqueness, settlement reconciliation, outbox
delivery guarantees, lock ordering, ERD completeness — see
[`../04-design/DATABASE-DESIGN.md`](../04-design/DATABASE-DESIGN.md)'s change-log sections).
**Database design review is now closed** — further changes should only happen if BC-004
implementation itself discovers an actual, demonstrable defect, not from another preliminary
review pass.

**Prisma schema implementation (Stage 4) must not begin until `DATABASE-DESIGN.md`'s own "Prisma
Implementation Readiness Checklist" is satisfied** — work through it item by item before the first
migration.

## Scope

In scope: local PostgreSQL via Docker Compose, Prisma installation and NestJS integration, the
**MVP-required** tables from `DATABASE-DESIGN.md` (not the full business schema — see its table
inventory), environment variable management, migration/seed workflow, and the unified
`nx run-many -t dev` startup experience.

Out of scope: business APIs, authentication, coupons/redemptions (explicitly deferred), and any
notification automation beyond basic record/device storage.

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

- Translate every **MVP-required** table from
  [`DATABASE-DESIGN.md`](../04-design/DATABASE-DESIGN.md#table-inventory-and-classification) into
  a first Prisma schema — all 41 MVP-required tables as specified there, column-for-column:
  identity (`users`, `user_roles`, `user_sessions`, `user_addresses`), merchant (`merchants`,
  `merchant_staff`, `stores`), location (`service_zones`), catalogue (`categories`, `products`,
  `product_variants`, `store_products`), inventory (`inventory`, `stock_batches`,
  `stock_movements`), commerce (`carts`, `cart_items`, `stock_reservations`,
  `stock_reservation_items`, `orders`, `order_items`, `order_status_history`), payment
  (`payments`, `payment_status_history`, `payment_webhook_events`, `refunds`), fulfilment
  (`pickup_verifications`, `delivery_partners`, `delivery_assignments`, `delivery_events`),
  finance (`financial_accounts`, `ledger_transactions`, `ledger_entries`, `settlements`,
  `settlement_items`), communication (`notifications`, `notification_devices`), support
  (`complaints`), and reliability (`audit_logs`, `idempotency_records`, `outbox_events`).
- `coupons`/`coupon_redemptions` are explicitly **not** part of this stage — future extension, per
  `DATABASE-DESIGN.md`.
- Work through `DATABASE-DESIGN.md`'s "Prisma Implementation Readiness Checklist" item by item
  before generating the first migration. As of BC-003.4, the complete list of invariants requiring
  a hand-written SQL step (`prisma migrate dev --create-only`, then edit the generated SQL,
  since Prisma's schema language cannot express them) is: the ledger balance deferred constraint
  trigger; the `stock_reservations` ownership `CHECK`; the two `stock_reservations` partial unique
  indexes; **the `financial_accounts` platform-account partial unique index**
  (`UNIQUE (account_type) WHERE merchant_id IS NULL` — added in BC-003.4 after this exact class of
  PostgreSQL NULL-uniqueness bug was found); **the `ledger_entries` partial index**
  (`(account_id) WHERE settlement_id IS NULL`); the `inventory`/`stock_batches` quantity `CHECK`s;
  the `stock_reservations` status/timestamp `CHECK`s; and the `UPDATE`/`DELETE` privilege
  revocation on `ledger_transactions`/`ledger_entries`. Plan time for this explicitly — it is not
  optional polish, and missing any one of these silently reintroduces a bug that was specifically
  found and fixed in design review.

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

**Startup verification:**

- Verify `nx run-many -t dev` starts Postgres (healthy), the API (connects successfully), and the
  web app (reaches the API) from a single command, in a fresh PowerShell session.
- Verify `nx run infrastructure:down` cleanly stops and removes containers.
- Verify repeated `nx run-many -t dev` after a `down` doesn't error or leave orphaned containers.
- Re-run the full existing check suite (`lint`, `typecheck`, `test`, `build`) to confirm nothing
  regressed.

**Database integrity and concurrency tests** (new in BC-003.4 — these exercise the specific
invariants the design review established, and must pass before Stage 4 is considered done):

- Two simulated concurrent checkouts for the last unit of a batch-tracked product: exactly one
  succeeds, the other sees insufficient stock — never both, never neither.
- A `financial_accounts` seed attempt that tries to insert a second row with the same
  `account_type` and `merchant_id = NULL` fails against the partial unique index.
- A `ledger_transactions` insert with unbalanced `ledger_entries` (debits ≠ credits) is rejected by
  the deferred constraint trigger at commit time.
- A `stock_reservations` insert with both `cart_id` and `order_id` set (or both `NULL`) is rejected
  by the `CHECK` constraint.
- A second `ACTIVE` reservation for the same `cart_id` is rejected by the partial unique index.
- A repeated checkout request with the same idempotency key and the same payload returns the
  original response without creating a second order; the same key with a different payload is
  rejected.
- A repeated payment webhook with the same `(provider, provider_event_id)` is processed exactly
  once.
- The worked settlement example from `DATABASE-DESIGN.md` is reproduced against a real database:
  after settlement generation, the merchant's outstanding balance (filtered on
  `settlement_id IS NULL`) is exactly zero for the settled period.
- A simulated failed settlement payout correctly re-exposes its amount in the outstanding-balance
  query (via the `OR settlement.status = 'FAILED'` clause) without altering any existing row.

**Acceptance criteria for Stage 4 (schema) specifically:**

- All 41 MVP-required tables exist with the exact columns, types, and constraints specified in
  `DATABASE-DESIGN.md` — verified by diffing the generated migration SQL against the document, not
  just by Prisma generating without error.
- Every custom-SQL invariant listed in the Prisma Implementation Readiness Checklist is present in
  the migration and covered by at least one of the tests above.
- `npx prisma validate` and `npx prisma migrate status` both succeed against a fresh database.

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
