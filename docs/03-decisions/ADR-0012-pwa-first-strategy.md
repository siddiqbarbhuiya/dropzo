# ADR-0012: PWA-first product strategy

- **Status:** Accepted
- **Date:** 2026-11-07
- **Related requirements/tasks:** NFR-UX-001

## Context

Dropzo needs customer, merchant, and admin interfaces, but building and maintaining four native
apps (customer, merchant, delivery, admin) is not feasible for a solo developer at launch.

## Problem

Should Dropzo build native mobile apps at launch, or a web-based app?

## Decision

Build a **Progressive Web App (PWA)** first. Customers install it without an app store; merchants
use it in a browser; updates ship without requiring users to manually update an app. Native
(React Native) apps are deferred and would reuse the same backend APIs if built later.

## Alternatives considered

- **Native apps from day one** — rejected: app-store review cycles, separate codebases per
  platform, and update friction are all unjustified before there is a single real customer.
- **Separate native delivery-partner app** — deferred for the same reason; the delivery partner
  interface can start as a responsive PWA too, or be admin-assisted manually at first.

## Consequences

- Easier: one codebase, instant updates, no app-store approval cycles.
- Harder: some native capabilities (deep OS-level push reliability, certain device APIs) are
  weaker on PWA than native — accepted for now; use server-triggered push notifications with SMS
  fallback for anything critical.

## Security and operational implications

None beyond standard web app security practices (see
[`../05-engineering/SECURITY-STANDARDS.md`](../05-engineering/SECURITY-STANDARDS.md)).

## Revisit conditions

Revisit if PWA push-notification reliability proves inadequate for critical order updates, or if
real user demand for native apps is observed post-launch.
