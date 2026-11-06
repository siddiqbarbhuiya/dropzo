# Coding standards

**Status: Accepted.** These rules are also summarised in [`AGENTS.md`](../../AGENTS.md) — if the
two ever disagree, this document is the detailed version and should be treated as authoritative;
update `AGENTS.md` to match.

## TypeScript

- Strict mode is on everywhere (`tsconfig.base.json`). Do not weaken it per-project without a
  documented reason.
- Avoid `any`. If a type genuinely can't be known, use `unknown` and narrow it.
- No unused locals or parameters (enforced by the base tsconfig where practical).

## Module boundaries (backend)

- A module must not directly modify another module's database tables — only call its service.
- Keep controllers thin: validate input, call a service, return a typed response.
- Keep business logic in services, not controllers.
- Keep database access in repositories or clearly separated data-access services, once a database
  exists.
- Use NestJS dependency injection consistently; avoid manual instantiation of services.

## Frontend conventions

- Use TanStack Query for server state (anything that comes from the API).
- Use Zustand only for genuinely client-only state (UI toggles, local preferences) — not as a
  substitute for TanStack Query.
- Keep styled-components definitions separate from business logic.
- Keep components small and focused; avoid components that mix data-fetching, business logic, and
  rendering for more than one concern.

## General

- No hardcoded secrets, ever — use environment variables (see
  [`SECURITY-STANDARDS.md`](SECURITY-STANDARDS.md)).
- No unnecessary dependencies — a new dependency should solve a real, current problem, not a
  hypothetical future one.
- Consistent formatting via Prettier (`npm run format:check`) and linting via ESLint
  (`npm run lint`) — both must pass before a task is considered done.
- Do not change the approved architecture or stack (see
  [`../02-architecture/SYSTEM-ARCHITECTURE.md`](../02-architecture/SYSTEM-ARCHITECTURE.md)) without
  a new or updated ADR.

## Related documents

- [`TESTING-STRATEGY.md`](TESTING-STRATEGY.md)
- [`SECURITY-STANDARDS.md`](SECURITY-STANDARDS.md)
- [`CODE-REVIEW-STANDARDS.md`](CODE-REVIEW-STANDARDS.md)
