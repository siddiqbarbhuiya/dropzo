---
name: dropzo-tdd
description: Test-driven development workflow for Dropzo (NestJS backend, React frontend, shared packages). Use when implementing a new feature, fixing a bug, or touching business logic, business rules, inventory, orders, or the financial ledger. Use before writing implementation code, not after.
when_to_use: "write a test first", "implement this feature", "add a unit test", "TDD", "fix this bug" (before touching source), any change to apps/api or apps/web business logic
---

# Dropzo: test-driven development

## Purpose

Make red-green-refactor the default way code gets written in this repository, consistent with
[`docs/05-engineering/TESTING-STRATEGY.md`](../../../docs/05-engineering/TESTING-STRATEGY.md) and
the mandatory workflow in [`AGENTS.md`](../../../AGENTS.md).

## When to use this skill

- Any new backend module, service, or NestJS controller.
- Any new React component or hook with non-trivial logic.
- Any bug fix — write a failing test that reproduces the bug first.
- Any change to business rules in
  [`docs/04-design/BUSINESS-RULES.md`](../../../docs/04-design/BUSINESS-RULES.md) or
  [`docs/04-design/DATABASE-DESIGN.md`](../../../docs/04-design/DATABASE-DESIGN.md) (inventory,
  orders, payments, the financial ledger).

## When NOT to use this skill

- Pure documentation changes.
- Config/tooling changes with no behavior (e.g. editing `.prettierrc.json`).
- Exploratory spikes explicitly marked as throwaway by the requester — still write tests before
  the code is merged, just not necessarily before the first exploratory line.

## Workflow

1. **Read first.** Identify the relevant requirement ID in
   [`docs/01-requirements/FUNCTIONAL-REQUIREMENTS.md`](../../../docs/01-requirements/FUNCTIONAL-REQUIREMENTS.md)
   or [`NON-FUNCTIONAL-REQUIREMENTS.md`](../../../docs/01-requirements/NON-FUNCTIONAL-REQUIREMENTS.md),
   and the acceptance criteria already stated there. If none exists yet and this is new scope, stop
   and ask — do not invent a requirement.
2. **Write a failing test** for the smallest next slice of behavior.
    - Backend: Jest, under `apps/api/src/**/*.spec.ts` (see `apps/api/src/health/health.controller.spec.ts`
      for the house style — ESM, `@nestjs/testing` or a plain instantiation for simple classes).
    - Frontend: Vitest + Testing Library, under `apps/web/src/**/*.test.tsx` (see
      `apps/web/src/App.test.tsx`).
    - Shared packages: Vitest, under `packages/*/src/**/*.test.ts`.
3. **Run it and confirm it fails** for the expected reason (not a typo or import error).
4. **Write the minimum code** to make it pass. Do not add unrelated functionality.
5. **Run the test again** and confirm it passes.
6. **Refactor** if needed, keeping the test green throughout.
7. **Add the concurrency/edge-case tests** this change needs, per
   [`TESTING-STRATEGY.md`](../../../docs/05-engineering/TESTING-STRATEGY.md)'s "what must be
   tested" list — duplicate requests, last-unit races, expired reservations, etc. — once the
   relevant modules exist. Today (pre-BC-004) this mostly means: don't trust client input, snapshot
   values at write time, never silently skip a concurrency case because "it probably won't happen."

## Required checks before calling a task done

```bash
npm run test -w <workspace>      # the specific workspace you changed
npm run lint
npm run typecheck
npm run build
```

Or via Nx: `npx nx affected -t test,lint,typecheck,build`.

## Expected output

- A new or updated test file alongside the implementation.
- All of the above commands passing, with real output pasted into the task report — never claim a
  test passed without having run it (see `AGENTS.md`, "After implementation").

## Failure handling

- If a test can't be made to pass without touching unrelated code, stop and explain why before
  widening the change.
- If the requirement is ambiguous enough that you can't write a meaningful test, stop and ask one
  focused question rather than guessing the acceptance criteria.

## This skill does not

- Guarantee the resulting code is bug-free or secure — pair with `dropzo-code-review` and, for
  anything touching auth, payments, or tenant isolation, `dropzo-security-review`.
- Replace the mandatory before/during/after workflow in `AGENTS.md` — it specifies this testing
  step in more detail there.
