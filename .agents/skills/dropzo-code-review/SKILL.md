---
name: dropzo-code-review
description: Review a Dropzo code change (diff, PR, or working-tree edit) against this repository's own standards and Dropzo-specific business rules. Use before merging, before marking a task done, or when asked to review code. Complements, does not replace, any general-purpose code-review tool or plugin already available.
when_to_use: "review this PR", "review my changes", "is this ready to merge", "check this diff", before committing a non-trivial change
---

# Dropzo: code review

## Purpose

Apply [`docs/05-engineering/CODE-REVIEW-STANDARDS.md`](../../../docs/05-engineering/CODE-REVIEW-STANDARDS.md)'s
checklist plus Dropzo's own architecture and business-rule constraints — not a generic style
review. If a general code-review plugin or tool is already available in your environment (several
exist, e.g. via the Claude Code marketplace), use this skill _in addition_ to it for the
Dropzo-specific checks it won't know about on its own.

## When to use this skill

- Before merging any non-trivial PR.
- When asked to review a diff, branch, or set of staged changes.
- As a self-check before marking a task in `docs/06-delivery/TASK-TRACKER.md` as done.

## When NOT to use this skill

- As a substitute for running the actual test suite — review finds things tests don't, and vice
  versa; do both.
- To approve your own change without disclosing that it's a self-review — say so explicitly if a
  human reviewer isn't involved.

## Workflow

1. Get the actual diff (`git diff`, `git diff main...HEAD`, or the PR's file list) — review the
   real change, not a description of it.
2. Work through [`CODE-REVIEW-STANDARDS.md`](../../../docs/05-engineering/CODE-REVIEW-STANDARDS.md)'s
   checklist: requirement compliance, correctness, security, authorization, data integrity,
   concurrency, performance, maintainability, tests, documentation, migration safety, dependency
   impact.
3. **Dropzo-specific checks** — apply whichever are relevant to the files touched:
    - **Any `apps/api` change**: controllers thin, business logic in services, module boundaries
      respected (no module reaching into another's tables) — see
      [`CODING-STANDARDS.md`](../../../docs/05-engineering/CODING-STANDARDS.md).
    - **Any file under a merchant/store/order/inventory/payment module (once they exist)**: is
      merchant tenant isolation actually checked (role + resource ownership), not just a role check?
      See [`BUSINESS-RULES.md`](../../../docs/04-design/BUSINESS-RULES.md), "Merchant isolation."
    - **Any schema-adjacent change**: does it match
      [`DATABASE-DESIGN.md`](../../../docs/04-design/DATABASE-DESIGN.md) exactly (column names,
      constraints, `ON DELETE` behavior)? A silent drift here is how a reviewed design stops
      matching the real schema.
    - **Any financial/ledger code**: are entries append-only (no `UPDATE`/`DELETE` on
      `ledger_transactions`/`ledger_entries`)? Does every transaction actually balance? See
      `DATABASE-DESIGN.md`'s "Financial accounting model."
    - **Any inventory/checkout code**: is stock locked (`FOR UPDATE`) before being read and reserved?
      Is a client-supplied price/stock value ever trusted? See `DATABASE-DESIGN.md`'s "Inventory and
      FEFO allocation."
    - **Any idempotency-sensitive endpoint**: is the key scoped per user/operation, not global? See
      `DATABASE-DESIGN.md`'s "Idempotency rules."
    - **Any new dependency**: necessary? Pinned sensibly? Checked against
      [`docs/08-quality/RISK-REGISTER.md`](../../../docs/08-quality/RISK-REGISTER.md) if it touches
      an area with a known open vulnerability.
4. Classify each finding: blocking (security gap, missing auth check, data-integrity risk, missing
   test for new business logic, undocumented breaking change) vs. non-blocking (style, naming,
   optional follow-up).

## Required checks

Confirm the author actually ran (don't just trust a claim): `npm run lint`, `npm run typecheck`,
`npm run test`, `npm run build` (or the Nx equivalents) for the affected workspace(s).

## Expected output

A findings list, most severe first, each naming the file/line, the concrete failure scenario (not
just "this could be a problem"), and whether it's blocking.

## Failure handling

- If you can't determine whether a change is correct without more context (e.g. a requirement that
  isn't written down), say so — don't approve on a guess.
- If a finding touches an already-accepted ADR or business decision, flag it as a question for the
  product owner rather than unilaterally rejecting the pattern.

## This skill does not

- Guarantee the reviewed code is secure or bug-free — it structures a review, it doesn't replace
  judgment, testing, or (for anything sensitive) `dropzo-security-review`.
- Duplicate the full text of `AGENTS.md` or `CODE-REVIEW-STANDARDS.md` — read those directly for
  anything this summary doesn't cover.
