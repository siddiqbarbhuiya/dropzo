# ADR-0001: Modular monolith architecture

- **Status:** Accepted
- **Date:** 2026-11-07
- **Related requirements/tasks:** BC-002, BC-002.1

## Context

Dropzo is built and operated by a solo developer with AI coding-assistant help. The platform's
long-term data model (merchants, stores, inventory, orders, pickup, delivery, payments) is
complex enough that a naive single-file backend would become unmaintainable, but a full
microservices split adds distributed-systems problems (network calls, partial failures, eventual
consistency) that a solo developer cannot operate reliably at this stage.

## Problem

How should the backend be structured so it can grow safely without requiring infrastructure a
single developer cannot maintain?

## Decision

Build the backend as **one deployable NestJS application**, internally organised into independent
modules (`HealthModule` today; `AuthModule`, `MerchantsModule`, `OrdersModule`, etc. planned). A
module must not directly modify another module's database tables — only call its service
interface. This keeps clean boundaries without the operational cost of microservices.

## Alternatives considered

- **Full microservices from day one** — rejected: requires message brokers, service discovery,
  distributed transactions, and multiple deployments, none of which a solo developer can operate
  reliably with the current traffic (zero).
- **Unstructured single-file backend** — rejected: becomes unmaintainable as soon as inventory,
  orders, and payments all need to interact correctly.

## Consequences

- Easier: one deployment, one database connection pool, simpler local development, simpler
  debugging.
- Harder: if traffic grows enough to need independent scaling of one module (e.g. search), that
  module must be extracted later — deliberately deferred, not solved now.

## Security and operational implications

Fewer network hops between modules reduces the attack surface compared to inter-service calls.
Module boundaries must still be enforced in code review, since there's no network boundary forcing
them.

## Revisit conditions

Revisit only when a specific module has a measured, independent scaling or ownership need —
not simply because traffic grows. See
[`../02-architecture/SYSTEM-ARCHITECTURE.md`](../02-architecture/SYSTEM-ARCHITECTURE.md).
