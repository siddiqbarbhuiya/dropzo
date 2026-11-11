---
name: dropzo-debugging
description: Systematic root-cause debugging for Dropzo (NestJS backend, React frontend, Nx tooling, Windows development environment). Use when something fails unexpectedly - a test, a build, a dev-server start, a CI-style check - before proposing a fix.
when_to_use: "this is failing", "why doesn't this work", "debug this", "this error", a failing test/build/lint run
---

# Dropzo: debugging and root-cause analysis

## Purpose

Reproduce, isolate, and diagnose before fixing — not guess-and-patch. Dropzo's own
[`docs/07-operations/TROUBLESHOOTING.md`](../../../docs/07-operations/TROUBLESHOOTING.md) already
documents several real, previously-hit issues; check it before re-deriving a known fix from
scratch.

## When to use this skill

- Any failing test, build, lint, or typecheck.
- Any dev-server (`nx run-many -t dev`, `npm run dev:api`, `npm run dev:web`) that won't start or
  behaves unexpectedly.
- Any `npm install`/dependency resolution failure.
- Any Nx task that produces an unexpected result (wrong cache hit, wrong affected set).

## When NOT to use this skill

- A feature that doesn't exist yet isn't a bug — check `docs/06-delivery/TASK-TRACKER.md` first;
  "this isn't implemented" is a different situation from "this is broken."

## Workflow

1. **Check `TROUBLESHOOTING.md` first.** Known issues already documented: `EBADENGINE` warnings on
   Node v25 (expected, not a failure), stale-lockfile `ERESOLVE` conflicts, a hoisting regression
   after installing an Nx plugin, NestJS ESM import errors, and `npm audit fix` reporting no
   changes when every fix is a major upgrade. Don't re-diagnose these from zero.
2. **Reproduce exactly.** Run the failing command yourself; copy the exact error, not a paraphrase.
3. **Isolate.** Change one variable at a time — does it fail on a clean `npm install`? On a single
   workspace in isolation (`npm run test -w apps/api` vs. the full `npm run test`)? With Nx cache
   disabled (`--skip-nx-cache`)?
4. **Form a hypothesis from the actual error text**, not from what seems plausible. If the error
   names a file/line, start there.
5. **Verify the hypothesis** with the smallest possible check before writing a fix (e.g., `node -e
"require.resolve('pkg')"` to confirm a resolution theory, rather than assuming).
6. **Fix the root cause**, not the symptom — per `AGENTS.md`, don't bypass a safety check or skip a
   hook to make an error go away.
7. **Re-run the original failing command** to confirm the fix, then the full check suite
   (`lint`/`typecheck`/`test`/`build`) to confirm nothing else broke.
8. **Record a new, previously-undocumented root cause** in `TROUBLESHOOTING.md` if it's likely to
   recur — this is how the document grew from BC-002/BC-002.1's real incidents.

## Required checks

Re-run whatever failed, plus the full check suite, after the fix — per `AGENTS.md`'s "after
implementation" workflow.

## Expected output

A clear statement of: what was actually broken (the root cause, not just the symptom), the fix,
and the commands run to confirm it, with real output — not "this should fix it."

## Failure handling

- If the root cause isn't clear after isolating, say so explicitly rather than applying a
  plausible-looking fix and hoping — a random fix that happens to make an error disappear often
  reappears somewhere else.
- If fixing the root cause would mean a breaking dependency upgrade or an architecture change, stop
  and flag it per `AGENTS.md`'s "when to stop and ask" — don't silently take that scope.

## This skill does not

- Guarantee a fix is complete or that the underlying class of bug can't recur — only that this
  specific reproduction is resolved and verified.
- Replace `dropzo-tdd` — once a root cause is found, write the regression test for it, don't just
  patch and move on.
