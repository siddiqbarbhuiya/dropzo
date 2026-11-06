# Test coverage

**Status: Accepted** (tracking process) — figures below are actual counts, not percentages, since
no coverage tooling is configured yet.

## Current state (as of BC-003)

| Project                | Test files | Tests | What's covered                                                      |
| ---------------------- | ---------- | ----- | ------------------------------------------------------------------- |
| `@dropzo/api`          | 1          | 1     | `HealthController` returns `status: ok` with a timestamp and uptime |
| `@dropzo/web`          | 1          | 1     | `App` renders the "Dropzo" heading                                  |
| `@dropzo/validation`   | 1          | 3     | `isNonEmptyString` accepts/rejects correctly                        |
| `@dropzo/shared-types` | 0          | 0     | Type-only package; nothing to unit test yet                         |
| `@dropzo/api-client`   | 0          | 0     | Not yet tested — see note below                                     |

**Gap:** `@dropzo/api-client`'s `createApiClient`/`getHealth` function has no direct unit test.
Its behaviour is exercised indirectly through `@dropzo/web`'s smoke test (which mocks it), but a
direct test (success response, non-OK response → `ApiError`) does not exist. Noted here rather
than silently left uncovered — add it in the next task that touches this package.

## Coverage tooling

No code-coverage percentage tooling (e.g. `--coverage` thresholds enforced in CI) is configured
yet. This is acceptable for the current size of the codebase (3 source modules with real logic)
but should be introduced once business modules start landing — track as part of TD-002 in
[`TECHNICAL-DEBT.md`](TECHNICAL-DEBT.md) (CI pipeline).

## Related documents

- [`../05-engineering/TESTING-STRATEGY.md`](../05-engineering/TESTING-STRATEGY.md)
- [`TECHNICAL-DEBT.md`](TECHNICAL-DEBT.md)
