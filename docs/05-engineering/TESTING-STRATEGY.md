# Testing strategy

**Status: Accepted** (strategy) — current coverage is tracked separately in
[`../08-quality/TEST-COVERAGE.md`](../08-quality/TEST-COVERAGE.md); do not assume full coverage
from this document.

## Levels of testing

| Level                     | Tool                                                  | Status                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (backend)            | Jest, via `ts-jest` (ESM)                             | Implemented — 13 suites / 92 tests (`HealthController`, BC-005 auth: OTP, tokens, phone normalization, guards; BC-006 merchant application/store services; BC-007 category/product/store-listing/inventory services)                                                                                                                                             |
| Unit/component (frontend) | Vitest + Testing Library                              | Implemented — 1 test (`App` smoke test)                                                                                                                                                                                                                                                                                                                          |
| Unit (shared packages)    | Vitest                                                | Implemented — `@dropzo/validation` (3 tests)                                                                                                                                                                                                                                                                                                                     |
| Integration (API, DB)     | Jest + real PostgreSQL (`apps/api/test/integration/`) | Implemented — inventory concurrency/FEFO, ledger (BC-004); auth/session/RBAC/merchant-isolation (BC-005); merchant application/store lifecycle (BC-006); catalogue/store-listing/inventory incl. FEFO and reservation-compatibility (BC-007, 20 tests). BC-004/BC-005 CI-verified; BC-006/BC-007 pending their first CI run — see note below on local execution. |
| Integration (API, HTTP)   | Jest + Supertest, real Nest DI graph                  | Implemented for auth and merchant/store (`auth.integration-spec.ts`, `merchant.integration-spec.ts`'s "HTTP wiring" blocks) — registration, store creation, validation, 401/403 paths. Not yet used for other endpoint groups.                                                                                                                                   |
| End-to-end                | Playwright                                            | Planned, not yet introduced                                                                                                                                                                                                                                                                                                                                      |
| Regression                | Re-run the full suite before merging                  | Accepted practice, not yet automated in CI                                                                                                                                                                                                                                                                                                                       |
| Security testing          | Manual + dependency scanning (`npm audit`)            | Partial — see [`../08-quality/RISK-REGISTER.md`](../08-quality/RISK-REGISTER.md)                                                                                                                                                                                                                                                                                 |

## Known local-only limitations

- **The integration suite needs a real `dropzo_test` PostgreSQL+PostGIS database.** This repository
  currently cannot provision one locally (Docker requires firmware virtualization this machine has
  disabled; the native Postgres 17 service lacks PostGIS) — see `DEVELOPMENT-SETUP.md`. CI
  provisions a real Postgres service container and is the actual verification path for
  `npm run test:integration`; `npm run verify --skip-db` runs everything that doesn't need it.
- **`apps/api/test/integration/auth.integration-spec.ts` deliberately does not import the real
  `AppModule`/`AuthModule`.** `@nestjs/throttler@6.7.1` ships a CommonJS build that `require()`s the
  now ESM-only `@nestjs/common`; real Node resolves this via CJS/ESM interop (verified directly:
  both `node -e "require('@nestjs/throttler')"` and `node -e "import('@nestjs/throttler')"` succeed
  under this project's Node version), but Jest's own module registry under
  `--experimental-vm-modules` does not, and crashes the whole test file the moment anything imports
  it. The spec instead builds a small test module that mirrors `AuthModule` exactly, minus
  `ThrottlerModule`/`ThrottlerGuard` — see the in-file comment on `TestAuthAppModule` for the full
  reasoning. The real application is unaffected; this is purely a Jest/ts-jest limitation.

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
