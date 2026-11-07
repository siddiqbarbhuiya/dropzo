# Dropzo documentation

This `docs/` directory is the single source of truth for Dropzo. If something here conflicts
with a past chat conversation, a comment, or someone's memory of a decision, **this repository
wins**. Update the docs, don't work around them.

Every AI coding assistant or human contributor should start at [AGENTS.md](../AGENTS.md), then
come here.

## How this is organised

| Folder                                 | Contents                                                      |
| -------------------------------------- | ------------------------------------------------------------- |
| [`00-project/`](00-project/)           | What Dropzo is, for whom, and the MVP boundary                |
| [`01-requirements/`](01-requirements/) | Functional and non-functional requirements, with IDs          |
| [`02-architecture/`](02-architecture/) | System architecture and diagrams                              |
| [`03-decisions/`](03-decisions/)       | Architecture Decision Records (ADRs)                          |
| [`04-design/`](04-design/)             | Business rules, API spec, database design, UI/UX notes        |
| [`05-engineering/`](05-engineering/)   | Coding, testing, security, review and documentation standards |
| [`06-delivery/`](06-delivery/)         | Roadmap, task tracker, progress log                           |
| [`07-operations/`](07-operations/)     | Dev setup, deployment, troubleshooting                        |
| [`08-quality/`](08-quality/)           | Risk register, technical debt, test coverage                  |
| [`_templates/`](_templates/)           | Copy-paste templates for ADRs, tasks, specs, reviews          |

## Status labels used throughout these docs

Every requirement, business rule and architecture statement in this documentation is labelled
with one of:

- **Implemented** — exists in the code today, verified.
- **Accepted** — decided, not yet built.
- **Proposed** — a design under consideration, not yet approved.
- **Planned** — intended for a specific future task, not started.
- **Deferred** — explicitly out of scope for now.

Never assume a document describes implemented behaviour unless it says **Implemented**.

## What's actually implemented today (as of BC-003)

- The repository foundation, tooling (TypeScript/ESLint/Prettier/Jest/Vitest) and Nx integration
  (see [`06-delivery/PROGRESS.md`](06-delivery/PROGRESS.md)).
- One backend endpoint: `GET /api/v1/health`, with Swagger docs at `/api/docs`.
- One frontend page: a home page that shows the Dropzo name and a live backend health check.
- No authentication, no database, no business features yet. Those are future tasks.

## AI engineering toolkit

Dropzo ships a set of repository-managed Claude Code skills under `.claude/skills/` — see
[`05-engineering/AI-ENGINEERING-TOOLKIT.md`](05-engineering/AI-ENGINEERING-TOOLKIT.md) for what
they cover, how to invoke them, how to add a new one, and the licensing/governance rules for
anything third-party.

## Consolidation notes

A few documents proposed in early planning were deliberately merged to avoid duplication for a
solo-developer project (see [`05-engineering/DOCUMENTATION-STANDARDS.md`](05-engineering/DOCUMENTATION-STANDARDS.md)
for the full reasoning):

- No separate `PRODUCT-SRS.md` or `ACCEPTANCE-CRITERIA.md` — their content lives in
  `00-project/SCOPE.md` and `01-requirements/FUNCTIONAL-REQUIREMENTS.md`.
- No separate `BACKEND-ARCHITECTURE.md` / `FRONTEND-ARCHITECTURE.md` — both live as sections in
  `02-architecture/SYSTEM-ARCHITECTURE.md`.
- No separate `04-design/DATABASE-DESIGN.md` vs `02-architecture/DATABASE-ARCHITECTURE.md` split —
  one proposed-database doc lives at `04-design/DATABASE-DESIGN.md`.
- No `06-delivery/RELEASE-PLAN.md` and no `07-operations/BACKUP-RESTORE.md` yet — there is nothing
  to release and no database to back up. Adding either now would be an empty placeholder.
