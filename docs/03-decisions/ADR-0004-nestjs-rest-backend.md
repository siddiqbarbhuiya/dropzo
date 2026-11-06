# ADR-0004: NestJS REST backend

- **Status:** Accepted
- **Date:** 2026-11-07
- **Related requirements/tasks:** BC-002

## Context

The backend needs a structure that gives a solo developer (and AI coding assistants acting on
their behalf) consistent module boundaries, dependency injection, and validation, across a
growing number of business modules.

## Problem

Which backend framework gives enough structure to prevent an unmaintainable single-file API,
without the overhead of a custom framework?

## Decision

**Node.js + TypeScript + NestJS**, exposing **REST APIs** documented with **Swagger/OpenAPI**.
NestJS's modules, controllers, services, and dependency injection map directly onto the modular
monolith principle in [ADR-0001](ADR-0001-modular-monolith.md).

## Alternatives considered

- **Express with no framework structure** — rejected: gives no enforced module boundaries, which
  matters more here because an AI coding assistant is doing much of the implementation and needs
  structural guardrails.
- **Fastify** — comparable performance, but a smaller plugin/testing ecosystem for this kind of
  structured application.

## Consequences

- Easier: consistent generated API docs, built-in validation pipes, clear module structure.
- Harder: NestJS moved to ESM-only packaging in v12, which required converting `apps/api` to ESM
  during BC-002 (`"type": "module"`, `NodeNext` module resolution, `.js` extensions on relative
  imports). This is a real, documented migration cost, recorded in
  [`../06-delivery/PROGRESS.md`](../06-delivery/PROGRESS.md).

## Security and operational implications

NestJS's `ValidationPipe` and guards give a consistent place to enforce input validation and
authorization — see [`../05-engineering/SECURITY-STANDARDS.md`](../05-engineering/SECURITY-STANDARDS.md).

## Revisit conditions

Revisit only if NestJS's module system becomes a blocker for a specific, measured scaling need.
