---
name: dropzo-frontend-e2e
description: React frontend development (apps/web), accessibility, and Playwright end-to-end testing for Dropzo. Use for any UI component, page, or user-facing flow, and for writing or running end-to-end tests once Playwright is introduced.
when_to_use: "add a page/component", "frontend", "accessibility", "a11y", "end-to-end test", "Playwright", any change under apps/web/src
paths: "apps/web/**"
---

# Dropzo: frontend development, accessibility, and E2E testing

## Purpose

Keep `apps/web` consistent with its established stack (React + TypeScript + Vite, React Router,
TanStack Query, Zustand, styled-components — see
[ADR-0003](../../../docs/03-decisions/ADR-0003-react-vite-frontend.md)), accessible by default, and
covered by the right level of test (component vs. end-to-end).

## When to use this skill

- Any new page, route, or component in `apps/web`.
- Any change to data-fetching (TanStack Query) or client state (Zustand).
- Writing or updating an end-to-end test (Playwright — see
  [`TESTING-STRATEGY.md`](../../../docs/05-engineering/TESTING-STRATEGY.md); not yet introduced in
  this repository, planned for once there's a real user flow to cover end-to-end).
- Accessibility review of a UI change.

## When NOT to use this skill

- Backend changes — use `dropzo-backend-nestjs`.
- Component unit tests alone — use `dropzo-tdd`; this skill is for the frontend-specific and E2E
  layers on top of that.

## Workflow

1. Follow the existing structure: `apps/web/src/routes/` for pages, `apps/web/src/lib/` for the API
   client wrapper, `apps/web/src/store/` for Zustand stores — see `HomePage.tsx`, `apiClient.ts`,
   `useUiStore.ts` as the house style.
2. **Server state via TanStack Query, client state via Zustand** — per
   [`CODING-STANDARDS.md`](../../../docs/05-engineering/CODING-STANDARDS.md); don't fetch data into
   a Zustand store, and don't reach for Zustand for something TanStack Query already owns (cache
   status, loading/error state).
3. **Styling**: styled-components, kept separate from logic — see `HomePage.tsx`'s pattern of
   defining styled components above the component function.
4. **Accessibility** (NFR-UX-001, mobile-first):
    - Every interactive element has an accessible name (text content, `aria-label`, or associated
      `<label>`).
    - Color is never the only signal (see the status styling in `HomePage.tsx` — pair color with
      text, as already done there).
    - Keyboard navigation works for anything clickable.
    - Error messages are clear and non-technical, per NFR-UX-002 — never show a raw error object or
      stack trace to a user.
5. **API calls** go through `@dropzo/api-client`, not ad hoc `fetch` calls in components — extend
   that package's typed client when a new endpoint is needed.
6. **Playwright E2E** (once introduced): cover the user-visible flow, not implementation details —
   e.g. "a customer can see the backend status on the home page," not "the `useQuery` hook was
   called." Keep selectors resilient (role/text-based, not brittle CSS paths).

## Required checks

```bash
npm run lint -w apps/web
npm run typecheck -w apps/web
npm run test -w apps/web
npm run build -w apps/web
```

For a UI change, actually run the dev server and look at it (`npm run dev:web`, or via `nx
run-many -t dev` once BC-004 wires up the full stack) — a passing test suite doesn't confirm a
feature looks or behaves correctly.

## Expected output

A component/page respecting the existing patterns, with a component test (`dropzo-tdd`) and,
where the change represents a real user-visible flow, an end-to-end test once Playwright exists.

## Failure handling

- If a design requires a pattern not yet established in this codebase (e.g. a new state-management
  approach), flag it as an architecture question rather than introducing it silently — per
  `AGENTS.md`.
- If accessibility and a design mockup conflict, accessibility wins — flag the conflict rather than
  silently choosing one.

## This skill does not

- Replace manual visual verification for UI work — per the root engineering guidance, a passing
  test suite is not the same as confirming a feature works and looks right in a browser.
- Cover backend logic — a frontend change that needs a new API shape belongs in
  `dropzo-backend-nestjs` as well.
