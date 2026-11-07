---
name: dropzo-release-readiness
description: Pre-merge or pre-deploy readiness check for Dropzo - confirms checks actually pass, documentation is synchronized, and nothing in the approved architecture or scope was silently changed. Use before committing, before opening a PR, or before considering a task complete.
when_to_use: "is this ready", "ready to merge", "ready to commit", "before I push", end of any non-trivial task
---

# Dropzo: release readiness and change verification

## Purpose

The final gate before calling a task done — per `AGENTS.md`'s "after implementation" workflow and
this project's own repeated practice (every BC-00x task in this repository's history has ended with
an explicit verification pass before being reported complete).

## When to use this skill

- Before committing a non-trivial change.
- Before opening a PR.
- Before marking a task "Done" in `docs/06-delivery/TASK-TRACKER.md`.
- Before pushing, if you have push access for this task (many tasks in this repository explicitly
  require holding changes for review first — check the task's own instructions).

## When NOT to use this skill

- Mid-task, before the work is actually finished — this is a completion gate, not a progress check.

## Workflow

1. **Re-run every relevant check, don't trust memory of an earlier run:**
    ```bash
    npm run format:check
    npm run lint
    npm run typecheck
    npm run test
    npm run build
    ```
    or the Nx equivalents (`npx nx affected -t lint,typecheck,test,build` for a faster targeted
    run, `npx nx run-many -t ...` for the full set).
2. **Review the actual diff** (`git status`, `git diff`) — confirm it matches what you intended,
   and nothing unrelated crept in (an accidental formatter-wide pass, a stray debug line, a secret).
3. **Check documentation synchronization** — see `dropzo-docs-and-adr`'s mapping table. Confirm
   `TASK-TRACKER.md` and `PROGRESS.md` reflect the change.
4. **Confirm scope boundaries were respected** — re-read the task's own stated restrictions (many
   tasks in this repository explicitly list what must _not_ be touched: no dependency upgrades, no
   schema changes, no commits without reporting first, etc.). A release-ready change is one that
   did exactly what was asked, not more.
5. **Check for unexpected changes outside the task's scope**: `git diff --stat` — does the file
   list match what the task should have touched? An unexpected `package.json` or `package-lock.json`
   diff on a documentation-only task is a red flag, not a convenience.
6. **Confirm risk/debt tracking is current** — if the change introduces a new known limitation or
   resolves a tracked one, update
   [`docs/08-quality/RISK-REGISTER.md`](../../../docs/08-quality/RISK-REGISTER.md) or
   [`TECHNICAL-DEBT.md`](../../../docs/08-quality/TECHNICAL-DEBT.md) accordingly.
7. **State what was and wasn't verified** — if something couldn't be tested (e.g. no database
   exists yet to run an integration test against), say so explicitly rather than implying full
   coverage.

## Required checks

All of step 1's commands, actually executed, with their real output available to report — never
assert a check passed without having run it in this session.

## Expected output

A short, honest completion report: what changed, what was verified (with real command output),
what wasn't verified and why, and confirmation that the task's own scope boundaries were respected.

## Failure handling

- If any check fails, fix it or explicitly report the failure — do not report a task as complete
  with a known-failing check.
- If scope crept beyond what was asked, say so and either revert the extra change or get explicit
  confirmation it's wanted — don't silently keep it.

## This skill does not

- Replace human review or approval where a task requires it — many tasks in this repository
  explicitly require holding changes for review before pushing; this skill verifies readiness, it
  doesn't grant permission to skip that step.
- Guarantee production readiness beyond what the repository's own current state supports — e.g.
  there is no CI pipeline yet (tracked in `TECHNICAL-DEBT.md`), so "all local checks pass" is the
  real ceiling today, not a stand-in for CI.
