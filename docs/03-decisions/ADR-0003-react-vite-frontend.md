# ADR-0003: React + Vite frontend

- **Status:** Accepted
- **Date:** 2026-11-07
- **Related requirements/tasks:** BC-002

## Context

The frontend must serve three audiences (customer, merchant, admin) from one codebase, support
fast local development, and be installable as a PWA without requiring an app store (see
[ADR-0012](ADR-0012-pwa-first-strategy.md)).

## Problem

Which frontend framework and build tool fit a solo developer who wants fast iteration and a large
ecosystem?

## Decision

**React + TypeScript**, built with **Vite**. Routing via **React Router**. Server state via
**TanStack Query**. Client state via **Zustand**. Styling via **styled-components**. Testing via
**Vitest**.

## Alternatives considered

- **Next.js** — rejected for the MVP: server-side rendering and its routing conventions add
  complexity not needed for an app that doesn't need SEO for its authenticated customer/merchant
  screens.
- **Vue or Svelte** — rejected: React has the larger ecosystem and more available AI-assistant
  training data, useful for a solo developer relying on AI coding help.
- **Create React App** — rejected: unmaintained; Vite is faster and is the modern default.

## Consequences

- Easier: fast dev server, large ecosystem, broad AI-assistant familiarity with React patterns.
- Harder: no built-in SSR if that's ever needed for marketing pages — would require a separate
  tool or a later migration.

## Security and operational implications

None beyond standard frontend dependency hygiene (see
[`../05-engineering/SECURITY-STANDARDS.md`](../05-engineering/SECURITY-STANDARDS.md)).

## Revisit conditions

Revisit if SEO for public-facing pages becomes a real requirement (e.g. a merchant storefront
indexed by search engines).
