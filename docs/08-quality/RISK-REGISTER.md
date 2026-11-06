# Risk register

**Status: Accepted** (tracking process). This is verified against the actual `npm audit` output
and repository state as of BC-002.1/BC-003 — re-verify before assuming a risk's status is current.

| ID       | Risk                                                                                     | Severity      | Area                                     | Status              | Notes                                                                                                                                                                      |
| -------- | ---------------------------------------------------------------------------------------- | ------------- | ---------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RISK-001 | `react-router-dom` has two open moderate CVEs (GHSA-wrjc-x8rr-h8h6, GHSA-337j-9hxr-rhxg) | Moderate      | Production (frontend)                    | Open                | Fix requires a major v6→v7 upgrade; not yet approved. See [`../05-engineering/SECURITY-STANDARDS.md`](../05-engineering/SECURITY-STANDARDS.md).                            |
| RISK-002 | `vite`/`vitest`/`esbuild` have open advisories up to critical severity                   | High–Critical | Dev-only (local dev server, test runner) | Open                | Requires major upgrades (Vite 5→8, Vitest 2→4). Low real risk today since the dev server is localhost-only; would become relevant if ever exposed on a shared network.     |
| RISK-003 | Nx's nested `minimatch@10.2.5` carries a moderate ReDoS advisory (GHSA-g3hv-75wg-m249)   | Moderate      | Dev-only (Nx CLI internals)              | Open                | No automatic fix available from `npm audit`; upstream issue in Nx's own dependency pinning.                                                                                |
| RISK-004 | Node.js v25.7.0 (non-LTS) is used for development                                        | Low           | Dev environment                          | Accepted            | Triggers `EBADENGINE` warnings from `@angular-devkit`/`@nestjs/schematics`; all verified checks pass on this version regardless. Recommend Node 22/24 LTS if issues arise. |
| RISK-005 | No database exists yet; all data-integrity rules in `BUSINESS-RULES.md` are unenforced   | High (future) | Data integrity                           | Accepted, scheduled | Will be addressed by the database/Prisma task — see [`../06-delivery/ROADMAP.md`](../06-delivery/ROADMAP.md).                                                              |
| RISK-006 | No authentication exists yet; all authorization rules are unenforced                     | High (future) | Security                                 | Accepted, scheduled | Will be addressed by the authentication task.                                                                                                                              |
| RISK-007 | No CI pipeline runs tests/lint/typecheck automatically on push                           | Moderate      | Process                                  | Open                | Documented as a future requirement in [`../07-operations/DEVELOPMENT-SETUP.md`](../07-operations/DEVELOPMENT-SETUP.md); not built in BC-003 per its scope boundary.        |

## How to update this register

When a risk is resolved, move it to a "Resolved" section below with the date and how it was
verified (not just "fixed" — show the command/output that proves it).

## Resolved

_None yet._

## Related documents

- [`../05-engineering/SECURITY-STANDARDS.md`](../05-engineering/SECURITY-STANDARDS.md)
- [`TECHNICAL-DEBT.md`](TECHNICAL-DEBT.md)
- [`../06-delivery/PROGRESS.md`](../06-delivery/PROGRESS.md)
