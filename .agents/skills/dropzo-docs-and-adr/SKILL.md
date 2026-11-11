---
name: dropzo-docs-and-adr
description: Keep Dropzo's documentation (requirements, architecture, business rules, task tracker, progress) synchronized with the code, and manage Architecture Decision Records. Use after any change affecting an API contract, schema, business rule, architecture, dependency, security control, or test procedure - and whenever a genuine architectural decision is made or needs revisiting.
when_to_use: "update the docs", "is this documented", "write an ADR", "does this need a doc update", after implementing anything described in AGENTS.md's documentation synchronization rule
---

# Dropzo: documentation, requirements traceability, and ADR governance

## Purpose

Enforce [`docs/05-engineering/DOCUMENTATION-STANDARDS.md`](../../../docs/05-engineering/DOCUMENTATION-STANDARDS.md)'s
core rule: documentation is part of the implementation, not an optional follow-up. Also governs
when an ADR is genuinely warranted versus when it would just be noise.

## When to use this skill

- After any code change — to decide what in `docs/` needs updating (see the mapping below).
- When a real architectural or business decision is made, changed, or needs to be formally
  recorded.
- When checking whether a requirement is actually traceable (`FR-xxx-NNN` → doc → task → code →
  test).
- When reviewing whether existing docs still agree with each other (a frequent source of drift —
  see the three rounds of corrections this project's database design went through).

## When NOT to use this skill

- Writing the actual feature code — this skill is about what to document _as a result of_ that
  work, not a substitute for `dropzo-tdd`/`dropzo-backend-nestjs`/etc.
- Creating an ADR for a decision that was never actually approved — verify against the real
  repository state first; see `DOCUMENTATION-STANDARDS.md`'s warning not to mark something
  "Accepted" just because it appeared in an old proposal.

## Workflow: documentation synchronization

After implementing a change, check whether it affects any of:

| Changed                    | Update                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| API contracts              | `docs/04-design/API-SPECIFICATION.md`                                                                                |
| Database schema            | `docs/04-design/DATABASE-DESIGN.md` (only with the same rigor as its prior revisions — see `dropzo-database-prisma`) |
| Business rules             | `docs/04-design/BUSINESS-RULES.md`                                                                                   |
| Authentication/permissions | `docs/05-engineering/SECURITY-STANDARDS.md`                                                                          |
| User-facing workflows      | `docs/04-design/UI-UX-SPECIFICATION.md`                                                                              |
| Architecture               | `docs/02-architecture/SYSTEM-ARCHITECTURE.md`, and a new/updated ADR if the decision is new                          |
| Dependencies               | the relevant task entry, and `docs/08-quality/RISK-REGISTER.md` if security-relevant                                 |
| Deployment                 | `docs/07-operations/DEPLOYMENT-GUIDE.md`                                                                             |
| Environment variables      | `docs/07-operations/DEVELOPMENT-SETUP.md` and `.env.example`                                                         |
| Security controls          | `docs/05-engineering/SECURITY-STANDARDS.md`                                                                          |
| Test procedures            | `docs/05-engineering/TESTING-STRATEGY.md`                                                                            |

**If none apply, say so explicitly** in the task report, and why — don't skip this step silently.

Always also check: `docs/06-delivery/TASK-TRACKER.md` (status), `PROGRESS.md` (what changed and
why — append, never rewrite history), and `ROADMAP.md` if the change affects what's next.

## Workflow: requirements traceability

Follow the chain `Requirement (FR-xxx-NNN) → docs/01-requirements/ → Task ID
(TASK-TRACKER.md) → Implementation (source file) → Test (test file)`. When implementing a
requirement, record its task ID and test file in `TASK-TRACKER.md`. Never mark a requirement
"Implemented" in `docs/01-requirements/FUNCTIONAL-REQUIREMENTS.md` until it actually is — use the
status labels defined in [`docs/README.md`](../../../docs/README.md) (Implemented / Accepted /
Proposed / Planned / Deferred) precisely.

## Workflow: ADR governance

1. An ADR is warranted for a genuine, significant technical or business decision — not every
   implementation detail. See [`docs/03-decisions/README.md`](../../../docs/03-decisions/README.md)
   and the existing 12 ADRs for the right scope/weight.
2. Use [`docs/_templates/ADR-TEMPLATE.md`](../../../docs/_templates/ADR-TEMPLATE.md).
3. **Verify the decision was actually approved** before marking an ADR "Accepted" — don't infer
   approval from an old conversation or proposal.
4. If a new decision conflicts with an existing accepted ADR, **do not silently rewrite it** —
   propose a documented amendment or a superseding ADR, as this project's own database-review
   rounds did when checking decisions against ADRs (finding no conflicts each time, but explicitly
   checking).
5. Avoid creating two ADRs for the same decision — check the index first.

## Required checks

- Internal link check (every `[text](path)` in changed docs resolves) — a simple Node script
  walking `docs/**/*.md` and `AGENTS.md`/`CLAUDE.md`/`README.md` for `](...)` targets is sufficient;
  one was used for every BC-003.x task in this project's history.
- Mermaid fence balance check (`grep -c` for opening/closing triple-backtick pairs) for any changed
  diagram.
- `npm run format:check` — documentation is Prettier-formatted along with code in this repository.

## Expected output

Updated docs that agree with the code and with each other, a task-tracker entry, a progress-log
entry, and (when warranted) a new or amended ADR — with the verification commands above actually
run.

## Failure handling

- If you're unsure whether a decision is "significant enough" for an ADR, err toward recording it
  — a short ADR costs little; a missing one costs future confusion.
- If documentation and code have already drifted apart before your change, flag the drift
  explicitly rather than silently "fixing" history to match either side without saying so.

## This skill does not

- Duplicate `AGENTS.md`'s full text — read it directly; this skill operationalizes its
  documentation-synchronization rule, it doesn't replace it.
- Authorize rewriting historical `PROGRESS.md` entries to look like something was true earlier than
  it was — see `DOCUMENTATION-STANDARDS.md` and this project's own practice of appending resolution
  notes rather than rewriting history.
