# ADR-0002: npm workspaces with Nx orchestration

- **Status:** Accepted
- **Date:** 2026-11-07
- **Related requirements/tasks:** BC-001, BC-002, BC-002.1

## Context

The repository holds two apps (`apps/web`, `apps/api`) and three shared packages
(`shared-types`, `validation`, `api-client`) that depend on each other. Running and testing them
needs a consistent way to install dependencies, run tasks across all of them, and avoid
re-running unchanged work.

## Problem

Which monorepo tooling gives task orchestration and local caching without replacing npm or forcing
an unfamiliar package manager?

## Decision

Use **npm workspaces** as the package manager and dependency-linking mechanism (unchanged since
BC-001), with **Nx** layered on top purely for task orchestration and caching (`nx run-many`,
`nx affected`, local result caching). Nx Cloud / remote caching is explicitly not used.

## Alternatives considered

- **Turborepo** — comparable, but Nx's plugin ecosystem (`@nx/jest`, `@nx/vite`, `@nx/eslint`)
  matched our existing tools more directly.
- **pnpm/yarn workspaces** — would mean relearning a different package manager with no concrete
  benefit over npm at this project's size.
- **No orchestration tool** — rejected once the project had 5 packages with real build/test/lint
  dependencies between them; re-running everything on every change wastes time.

## Consequences

- Easier: `nx affected` only rebuilds/tests what actually changed; cached tasks are near-instant
  on re-run.
- Harder: an extra layer to understand; Nx's own plugin versions can drift from the rest of the
  stack (see [ADR notes in BC-002.1](../06-delivery/PROGRESS.md)) and need periodic reconciliation.

## Security and operational implications

None directly — Nx is a dev-time tool, not part of the production runtime.

## Revisit conditions

Revisit if Nx's plugin ecosystem repeatedly conflicts with pinned tool versions, or if the project
ever needs a package manager other than npm.
