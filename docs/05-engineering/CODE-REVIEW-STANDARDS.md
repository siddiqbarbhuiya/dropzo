# Code review standards

**Status: Accepted.** This checklist doubles as the code-review template — copy it into a PR
description or review comment rather than maintaining a separate template file.

## Checklist

- [ ] **Requirement compliance** — does this match the referenced requirement ID(s) and acceptance
      criteria?
- [ ] **Correctness** — does the logic do what it claims, including edge cases?
- [ ] **Security** — input validated? No secrets introduced? No new unauthenticated access?
- [ ] **Authorisation** — role and resource-ownership checks present on every new endpoint?
- [ ] **Data integrity** — transactions used where needed? No client-trusted prices/totals/stock?
- [ ] **Concurrency** — could two simultaneous requests cause overselling, duplicate orders, or a
      race condition?
- [ ] **Performance** — any obvious N+1 queries or unbounded result sets?
- [ ] **Maintainability** — module boundaries respected? No unrelated refactoring mixed in?
- [ ] **Tests** — are there tests for the new behaviour, and were they actually run (not just
      written)?
- [ ] **Documentation** — were affected docs updated (see
      [`DOCUMENTATION-STANDARDS.md`](DOCUMENTATION-STANDARDS.md))? If not, is that explicitly
      justified?
- [ ] **Migration safety** — if this includes a database migration, is it non-destructive, or has
      a destructive step been explicitly approved?
- [ ] **Dependency impact** — any new dependency, and is it necessary? Any version bump, and is it
      a breaking change that was called out?

## When to request changes vs. approve with comments

- Request changes for: security gaps, missing authorization checks, data-integrity risks, missing
  tests for new business logic, undocumented breaking changes.
- Approve with comments for: naming nits, minor style preferences, optional follow-up suggestions.

## Related documents

- [`CODING-STANDARDS.md`](CODING-STANDARDS.md)
- [`SECURITY-STANDARDS.md`](SECURITY-STANDARDS.md)
- [`TESTING-STRATEGY.md`](TESTING-STRATEGY.md)
