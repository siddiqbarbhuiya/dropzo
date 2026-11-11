---
name: dropzo-security-review
description: Security-focused review of Dropzo code against docs/05-engineering/SECURITY-STANDARDS.md and the Dropzo-specific integrity rules in the database design (tenant isolation, idempotency, payment webhooks, pickup codes, the financial ledger). Use for anything touching authentication, authorization, payments, inventory, or personal data.
when_to_use: "security review", "is this safe", "check for vulnerabilities", any change to auth, payments, webhooks, pickup codes, or merchant/customer data access
---

# Dropzo: security review

## Purpose

Apply [`docs/05-engineering/SECURITY-STANDARDS.md`](../../../docs/05-engineering/SECURITY-STANDARDS.md)
and the security-relevant invariants already designed into
[`docs/04-design/DATABASE-DESIGN.md`](../../../docs/04-design/DATABASE-DESIGN.md), rather than a
generic OWASP pass with no project context.

## When to use this skill

- Any authentication, session, or authorization code (once the auth module exists).
- Any endpoint that reads or writes another entity's data (merchant, order, payment, address).
- Any payment, webhook, or refund-handling code.
- Any pickup-verification or OTP-adjacent code.
- Any change touching personal data (`users`, `user_addresses`).
- Any new dependency, or a dependency version bump.

## When NOT to use this skill

- Pure UI styling changes with no data access.
- Documentation-only changes (use `dropzo-docs-and-adr` instead).

## Workflow

1. Identify what the change can newly _see_ or _do_ — new data access, a new endpoint, a new role
   check, a new external call (gateway, webhook, FCM).
2. Check against [`SECURITY-STANDARDS.md`](../../../docs/05-engineering/SECURITY-STANDARDS.md):
   authentication/session handling, role- and resource-level authorization, input validation,
   secrets management, OTP/pickup-code protection, webhook/payment security, audit logging,
   dependency vulnerability management.
3. Check against the Dropzo-specific invariants in `DATABASE-DESIGN.md` relevant to the change:
    - **Tenant isolation**: does every merchant-scoped query verify `merchant_staff` or
      `merchants.owner_user_id`, not just that _a_ valid session exists? A missing `WHERE
merchant_id = :currentMerchant` is the single most common tenant-isolation bug.
    - **Idempotency**: is the key scoped `(scope, user_id, idempotency_key)` or
      `(customer_id, idempotency_key)` as designed — never a bare global key an attacker could
      guess or collide with another user's?
    - **Payment webhooks**: is the signature verified before any processing? Is
      `(provider, provider_event_id)` uniqueness relied on for dedup, not just "processed_at is
      null"?
    - **Pickup codes**: hashed at rest, `expires_at` enforced, `attempt_count`/`max_attempts`
      enforced before accepting a verification?
    - **Ledger**: no `UPDATE`/`DELETE` path exists on `ledger_transactions`/`ledger_entries` from
      application code — only `INSERT`.
    - **No client-trusted values**: price, stock, and totals are always server-recalculated, per
      `BUSINESS-RULES.md`.
4. For a dependency change, cross-check
   [`docs/08-quality/RISK-REGISTER.md`](../../../docs/08-quality/RISK-REGISTER.md) — is this
   introducing, worsening, or (ideally) fixing a tracked vulnerability? Record the outcome there if
   it changes.
5. Run `npm audit` if `package.json`/`package-lock.json` changed, and report actual output — don't
   assert a dependency is "probably fine."

## Required checks

- `npm audit` (full, and `--omit=dev` to separate production impact) for any dependency change.
- Confirm tests exist for the specific failure scenarios named above (duplicate webhook, cross-
  merchant access attempt, reused pickup code), not just the happy path.

## Expected output

A findings list distinguishing **exploitable now** (a real attack path exists today) from
**design gap for a future task** (the invariant isn't enforced yet because the relevant module
doesn't exist yet — not actionable today, but worth recording). Never state a check passed without
having actually run it.

## Failure handling

- If a finding is severe (auth bypass, tenant-isolation bypass, secret exposure), say so plainly
  and do not soften it to seem less disruptive — per `AGENTS.md`, this is exactly when to stop and
  ask before proceeding.
- If the fix requires a breaking dependency upgrade, do not apply it silently — flag it, per
  `SECURITY-STANDARDS.md`'s existing practice for the tracked `react-router-dom`/Vite/Vitest
  findings.

## This skill does not

- Guarantee the code is secure, free of vulnerabilities, or compliant with any regulation — it is
  a structured review against known standards and known Dropzo invariants, not a certification.
- Perform automated penetration testing, fuzzing, or static-analysis scanning — if that's needed,
  it requires dedicated tooling, not this skill.
