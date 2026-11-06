# Technical debt

**Status: Accepted** (tracking process).

| ID     | Item                                                                                                    | Why it exists                                                                                          | Pay-down plan                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| TD-001 | `apps/api`'s own `joi`-based env validation is separate from `@dropzo/validation`'s `zod`-based helpers | They were introduced at different times for different purposes (NestJS config vs. a generic validator) | Revisit when a second backend config-validation need arises; unify only if that creates real duplication |
| TD-002 | No CI pipeline (GitHub Actions) runs checks automatically                                               | Out of scope for BC-001–BC-003 by design                                                               | Add when `.github/workflows/` is populated — placeholder exists at `.github/workflows/.gitkeep`          |
| TD-003 | `react-router-dom` pinned to v6, with known CVEs (RISK-001)                                             | Fixing requires a major-version migration, deferred pending a dedicated task                           | Scheduled in [`../06-delivery/ROADMAP.md`](../06-delivery/ROADMAP.md)                                    |
| TD-004 | `vite`/`vitest` pinned below their latest majors (RISK-002)                                             | Same reason — dev-tooling major upgrade, deferred                                                      | Scheduled alongside TD-003                                                                               |
| TD-005 | No automated database backup/restore process                                                            | No database exists yet                                                                                 | Required before public launch (NFR-OPS-001); build alongside the database task                           |

## Related documents

- [`RISK-REGISTER.md`](RISK-REGISTER.md)
- [`../06-delivery/ROADMAP.md`](../06-delivery/ROADMAP.md)
