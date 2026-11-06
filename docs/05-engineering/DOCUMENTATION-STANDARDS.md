# Documentation standards

**Status: Accepted.**

## The core rule: documentation is part of the implementation

A task is not complete merely because the code compiles. If code changes affect any of the
following, the corresponding documentation must be updated **as part of that task**, not as a
follow-up:

- API contracts → [`../04-design/API-SPECIFICATION.md`](../04-design/API-SPECIFICATION.md)
- Database schema → [`../04-design/DATABASE-DESIGN.md`](../04-design/DATABASE-DESIGN.md)
- Business rules → [`../04-design/BUSINESS-RULES.md`](../04-design/BUSINESS-RULES.md)
- Authentication or permissions → [`SECURITY-STANDARDS.md`](SECURITY-STANDARDS.md)
- User-facing workflows → [`../04-design/UI-UX-SPECIFICATION.md`](../04-design/UI-UX-SPECIFICATION.md)
- Architecture → [`../02-architecture/SYSTEM-ARCHITECTURE.md`](../02-architecture/SYSTEM-ARCHITECTURE.md)
  and, if the decision is significant and new, a new [ADR](../03-decisions/)
- Dependencies → note in the relevant task entry and, if security-relevant,
  [`../08-quality/RISK-REGISTER.md`](../08-quality/RISK-REGISTER.md)
- Deployment → [`../07-operations/DEPLOYMENT-GUIDE.md`](../07-operations/DEPLOYMENT-GUIDE.md)
- Environment variables → [`../07-operations/DEVELOPMENT-SETUP.md`](../07-operations/DEVELOPMENT-SETUP.md)
  and `.env.example`
- Security controls → [`SECURITY-STANDARDS.md`](SECURITY-STANDARDS.md)
- Test procedures → [`TESTING-STRATEGY.md`](TESTING-STRATEGY.md)

**If no documentation update is needed, say so explicitly** in the task's completion report, and
why — don't just skip it silently.

## Status labels

Use the labels defined in [`../README.md`](../README.md): **Implemented**, **Accepted**,
**Proposed**, **Planned**, **Deferred**. Never let a document imply something is built when it
isn't.

## Keep the repository as the only source of truth

If a past chat conversation, comment, or assumption conflicts with what's in `docs/`, the
repository wins — update the docs, don't work around them. See
[ADR-0011](../03-decisions/ADR-0011-docs-as-code-canonical-source.md).

## Consolidation decisions made in BC-003

To avoid duplicated or near-empty documents for a solo-developer project, these proposed files
were deliberately **not** created as separate files:

| Proposed file                                                                            | Where its content actually lives                         | Why                                                                                                                                                              |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-requirements/PRODUCT-SRS.md`                                                         | `00-project/PROJECT-OVERVIEW.md` + `00-project/SCOPE.md` | An SRS for this project is the overview + scope + requirements docs combined; a separate SRS would just re-state them.                                           |
| `01-requirements/ACCEPTANCE-CRITERIA.md`                                                 | Inline in `01-requirements/FUNCTIONAL-REQUIREMENTS.md`   | Acceptance criteria are per-requirement; a separate document would force constant cross-referencing for no benefit at this scale.                                |
| `02-architecture/BACKEND-ARCHITECTURE.md`, `FRONTEND-ARCHITECTURE.md`                    | Sections within `02-architecture/SYSTEM-ARCHITECTURE.md` | Both are small today; splitting them creates two thin files instead of one coherent one. Split them out once either grows large enough to need its own document. |
| `04-design/DATABASE-DESIGN.md` vs. a separate `02-architecture/DATABASE-ARCHITECTURE.md` | One file: `04-design/DATABASE-DESIGN.md`                 | The proposed schema and the architectural rationale for PostgreSQL are the same discussion at this stage.                                                        |
| `06-delivery/RELEASE-PLAN.md`                                                            | Not created yet                                          | There is nothing to release. Creating this now would be an empty placeholder; add it when a first release is actually being planned.                             |
| `07-operations/BACKUP-RESTORE.md`                                                        | Not created yet                                          | There is no database yet. Add it when the database task introduces one.                                                                                          |
| Separate code-review template file                                                       | Inline in `05-engineering/CODE-REVIEW-STANDARDS.md`      | The checklist IS the template; a separate copy would drift out of sync.                                                                                          |

If any of the above grows enough to deserve its own file, split it out then and update this table
and [`../README.md`](../README.md) accordingly.

## Templates

Reusable templates live in [`../_templates/`](../_templates/): ADR, feature spec, implementation
plan, task definition, and release notes. A bug-report template lives at
[`../../.github/ISSUE_TEMPLATE/bug_report.md`](../../.github/ISSUE_TEMPLATE/bug_report.md) (GitHub
renders it natively there). Keep every template short enough to actually use — do not add
elaborate paperwork for a small change.

## Related documents

- [`../README.md`](../README.md)
- [`../03-decisions/ADR-0011-docs-as-code-canonical-source.md`](../03-decisions/ADR-0011-docs-as-code-canonical-source.md)
- [`../../AGENTS.md`](../../AGENTS.md)
