# Task tracker

**Status: Accepted** (process) — the table below reflects real, completed work plus the recommended
next tasks from [`ROADMAP.md`](ROADMAP.md). It is not exhaustive down to every future sub-task.

## Statuses used

`Backlog` · `Ready` · `In Progress` · `Blocked` · `In Review` · `Done` · `Deferred`

## Task fields (use this shape for new tasks; see [`../_templates/TASK-TEMPLATE.md`](../_templates/TASK-TEMPLATE.md))

Task ID · Title · Epic · Priority · Status · Dependencies · Requirements covered · Acceptance
criteria · Implementation notes · Test expectations · Documentation impact.

## Tasks

| Task ID  | Title                                                       | Epic             | Status    | Requirements covered           | Notes                                                                                                                                                                                                                     |
| -------- | ----------------------------------------------------------- | ---------------- | --------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BC-001   | Repository foundation                                       | Foundation       | **Done**  | —                              | Monorepo, `README.md`, `AGENTS.md`                                                                                                                                                                                        |
| BC-002   | Development tooling                                         | Foundation       | **Done**  | FR-SYS-001, FR-SYS-002         | Health endpoint, Swagger, React shell                                                                                                                                                                                     |
| BC-002.1 | Nx verification and dependency security review              | Foundation       | **Done**  | —                              | Nx integration, full `npm audit` review                                                                                                                                                                                   |
| BC-003   | Documentation governance & AI-agent knowledge system        | Foundation       | **Done**  | —                              | This documentation system                                                                                                                                                                                                 |
| BC-003.1 | Final documentation review, DB design review, BC-004 prep   | Foundation       | **Done**  | —                              | See `PROGRESS.md`; database review had open approval questions, now resolved in BC-003.2                                                                                                                                  |
| BC-003.2 | Database design corrections and implementation readiness    | Foundation       | **Done**  | —                              | Full implementation-ready `DATABASE-DESIGN.md` rewrite; see `PROGRESS.md`                                                                                                                                                 |
| BC-003.3 | Database design corrections and final review                | Foundation       | **Done**  | —                              | Independent schema review corrected the ledger, FEFO/batches, reservations, payment history, snapshots, idempotency, settlements, outbox; see `PROGRESS.md`                                                               |
| BC-003.4 | Final database finalization — one-time comprehensive review | Foundation       | **Done**  | —                              | Fixed platform-account NULL-uniqueness bug, settlement reconciliation worked example, outbox delivery guarantee, lock ordering, ERD completeness. **Database design review is now closed.** See `PROGRESS.md`             |
| BC-004   | PostgreSQL, Docker Compose, Prisma, unified dev environment | Data             | **Ready** | —                              | Plan: `BC-004-IMPLEMENTATION-PLAN.md`. Design finalized and closed (BC-003.4) — no further review gate, only `DATABASE-DESIGN.md`'s own "Prisma Implementation Readiness Checklist" to work through during implementation |
| (next)   | Business validation in Badarpur                             | Business         | Backlog   | —                              | Not a coding task; see `../00-project/PRODUCT-VISION.md`                                                                                                                                                                  |
| (next)   | Authentication module                                       | Backend          | Backlog   | FR-AUTH-001..003               | Depends on database task                                                                                                                                                                                                  |
| (next)   | Merchant/store module                                       | Backend          | Backlog   | FR-MER-001..003                | Depends on auth + database                                                                                                                                                                                                |
| (next)   | Catalogue and inventory modules                             | Backend          | Backlog   | FR-CAT-_, FR-INV-_             | Depends on merchant/store module                                                                                                                                                                                          |
| (next)   | Cart, checkout, orders                                      | Backend          | Backlog   | FR-CART-_, FR-ORD-_            | Depends on catalogue/inventory                                                                                                                                                                                            |
| (next)   | Pickup workflow (first E2E milestone)                       | Backend+Frontend | Backlog   | FR-PICK-001                    | Depends on orders module                                                                                                                                                                                                  |
| (next)   | Delivery, COD, admin controls                               | Backend+Frontend | Backlog   | FR-DEL-_, FR-PAY-001, FR-ADM-_ | Depends on pickup workflow                                                                                                                                                                                                |
| (next)   | Security remediation (react-router-dom, Vite/Vitest)        | Maintenance      | Backlog   | NFR-SEC-*                      | Independent; see risk register                                                                                                                                                                                            |

Tasks without a specific `BC-NNN` ID yet should be assigned one when actually started, per the
numbering convention already in use (`BC-<number>` for backend/core tasks).

## Related documents

- [`ROADMAP.md`](ROADMAP.md)
- [`PROGRESS.md`](PROGRESS.md)
- [`../01-requirements/FUNCTIONAL-REQUIREMENTS.md`](../01-requirements/FUNCTIONAL-REQUIREMENTS.md)
