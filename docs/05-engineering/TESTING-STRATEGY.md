# Testing strategy

**Status: Accepted** (strategy) — current coverage is tracked separately in
[`../08-quality/TEST-COVERAGE.md`](../08-quality/TEST-COVERAGE.md); do not assume full coverage
from this document.

## Levels of testing

| Level                     | Tool                                       | Status                                                                           |
| ------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------- |
| Unit (backend)            | Jest, via `ts-jest` (ESM)                  | Implemented — 1 test (`HealthController`)                                        |
| Unit/component (frontend) | Vitest + Testing Library                   | Implemented — 1 test (`App` smoke test)                                          |
| Unit (shared packages)    | Vitest                                     | Implemented — `@dropzo/validation` (3 tests)                                     |
| Integration (API)         | Jest + Supertest                           | Planned, not yet used                                                            |
| End-to-end                | Playwright                                 | Planned, not yet introduced                                                      |
| Regression                | Re-run the full suite before merging       | Accepted practice, not yet automated in CI                                       |
| Security testing          | Manual + dependency scanning (`npm audit`) | Partial — see [`../08-quality/RISK-REGISTER.md`](../08-quality/RISK-REGISTER.md) |

## Verified working commands

These are run directly, and also through Nx (`nx run-many -t test`, etc. — see
[`../07-operations/DEVELOPMENT-SETUP.md`](../07-operations/DEVELOPMENT-SETUP.md)):

```powershell
npm run test              # all workspaces
npm run test -w apps/api  # one workspace
npx nx run-many -t test   # via Nx, with caching
npx nx affected -t test --base=HEAD~1   # only changed projects
```

## What must be tested, once business modules exist

- Every business service: unit tests for its logic (price calculation, commission calculation,
  stock reservation, FEFO batch selection, etc.).
- Every important API: integration tests (request → response, including auth/permission checks).
- Critical workflows end-to-end: a customer placing a pickup order from login to collection.
- Concurrency scenarios explicitly, not just happy paths:
    - Two customers buying the last unit of stock simultaneously.
    - A duplicate checkout request (double-click, network retry).
    - A duplicate payment webhook.
    - A pickup code reused after first use.

## Rules

- Never remove or weaken a test merely to make a build pass.
- Never claim a test passed unless it was actually executed — the exact command and real output
  belong in a task's completion report.
- Test data must not depend on production data; use fixtures/seeds for development.

## Related documents

- [`CODING-STANDARDS.md`](CODING-STANDARDS.md)
- [`../08-quality/TEST-COVERAGE.md`](../08-quality/TEST-COVERAGE.md)
- [`../07-operations/DEVELOPMENT-SETUP.md`](../07-operations/DEVELOPMENT-SETUP.md)
