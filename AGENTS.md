# AGENTS.md — Dropzo

This is the **canonical entry point** for every AI coding assistant (Claude Code, Copilot, Cursor,
Gemini, or any other) and every human contributor working on this repository. If you are about to
make a change and haven't read this file yet, stop and read it first.

## 1. What Dropzo is

Dropzo is a local grocery and daily-needs marketplace launching in Badarpur, Sribhumi, Assam,
India. Full details: [`docs/00-project/PROJECT-OVERVIEW.md`](docs/00-project/PROJECT-OVERVIEW.md).

## 2. Where the authoritative documentation lives

**`docs/` is the single source of truth.** Start at [`docs/README.md`](docs/README.md) — it
indexes everything: product scope, requirements, architecture, ADRs, business rules, engineering
standards, task tracking, and risk/debt tracking.

If a past chat conversation, a comment, or your own assumption conflicts with what's in `docs/`,
**the repository wins**. Update the docs — don't quietly work around them. See
[`docs/03-decisions/ADR-0011-docs-as-code-canonical-source.md`](docs/03-decisions/ADR-0011-docs-as-code-canonical-source.md).

You are the senior full-stack implementation engineer for this project. The human developer is
the product owner — they approve architecture changes, database changes, business rules, and
deployment operations. You do not decide these on your own.

## 3. Files you must read before starting any non-trivial task

1. This file.
2. [`docs/README.md`](docs/README.md).
3. The relevant task entry in [`docs/06-delivery/TASK-TRACKER.md`](docs/06-delivery/TASK-TRACKER.md).
4. The requirement(s) it references in
   [`docs/01-requirements/FUNCTIONAL-REQUIREMENTS.md`](docs/01-requirements/FUNCTIONAL-REQUIREMENTS.md)
   or [`NON-FUNCTIONAL-REQUIREMENTS.md`](docs/01-requirements/NON-FUNCTIONAL-REQUIREMENTS.md).
5. The applicable architecture document(s) in [`docs/02-architecture/`](docs/02-architecture/).
6. Any relevant ADRs in [`docs/03-decisions/`](docs/03-decisions/).
7. The actual source code and tests for the area you're touching — not just the docs.

## 4. Mandatory workflow

### Before implementation

1. Read the files in section 3.
2. Inspect current `git status` and branch.
3. Identify the files, modules, APIs, and database structures affected.
4. For non-trivial work, present a short implementation plan before writing code.
5. If a requirement is ambiguous, ask one focused clarification rather than inventing a business
   rule. If requirements conflict, stop and explain the conflict.

### During implementation

- Work only on the assigned task. Avoid unrelated refactoring.
- Follow the module boundaries in
  [`docs/02-architecture/SYSTEM-ARCHITECTURE.md`](docs/02-architecture/SYSTEM-ARCHITECTURE.md) and
  the rules in [`docs/05-engineering/CODING-STANDARDS.md`](docs/05-engineering/CODING-STANDARDS.md).
- Add or update tests as you go, not as an afterthought.
- Never silently change architecture or business rules — if a decision affects product scope,
  security, data integrity, or architecture, stop and ask.
- Do not generate an entire feature set or the whole platform in one operation. Work on one
  approved task at a time.
- If a task requires a database schema change, present the migration plan before implementing it.
- Do not invent API contracts or database fields that contradict `docs/`.

### After implementation

1. Run the relevant tests.
2. Run lint (`npm run lint`, or `npx nx run-many -t lint`).
3. Run typecheck (`npm run typecheck`, or `npx nx run-many -t typecheck`).
4. Run the build where applicable (`npm run build`).
5. Verify formatting (`npm run format:check`).
6. Review the actual git diff.
7. **Update affected documentation** — see the synchronization rule below. This is not optional
   polish; a task is not complete merely because the code compiles.
8. Update the task's status in
   [`docs/06-delivery/TASK-TRACKER.md`](docs/06-delivery/TASK-TRACKER.md).
9. Update [`docs/06-delivery/PROGRESS.md`](docs/06-delivery/PROGRESS.md).
10. Add or update an ADR in [`docs/03-decisions/`](docs/03-decisions/) if a real architectural
    decision was made or changed.
11. Record any new or changed risks/technical debt in
    [`docs/08-quality/RISK-REGISTER.md`](docs/08-quality/RISK-REGISTER.md) or
    [`TECHNICAL-DEBT.md`](docs/08-quality/TECHNICAL-DEBT.md).
12. Report changed files, actual test results (not claimed ones), and commit/push status.

## 5. Documentation synchronization rule

If your change affects any of the following, update the corresponding document as part of the
same task — see
[`docs/05-engineering/DOCUMENTATION-STANDARDS.md`](docs/05-engineering/DOCUMENTATION-STANDARDS.md)
for the full mapping: API contracts, database schema, business rules, authentication/permissions,
user-facing workflows, architecture, dependencies, deployment, environment variables, security
controls, or test procedures.

**If no documentation update is needed, say so explicitly, and why.** Don't skip it silently.

## 6. When to stop and ask

- The requirement is ambiguous and guessing would invent a business rule.
- The task would change architecture, security posture, or data integrity, and no ADR covers it.
- A dependency upgrade would be a breaking (major-version) change.
- Two requirements or two documents contradict each other.

## 7. Coding, testing, and security rules (summary — see linked docs for detail)

- TypeScript strict mode; avoid `any`. Clear module boundaries; a module never directly modifies
  another module's database tables. Thin controllers, logic in services.
  → [`docs/05-engineering/CODING-STANDARDS.md`](docs/05-engineering/CODING-STANDARDS.md)
- Every business service needs unit tests; every important API needs integration tests; never
  weaken a test to make a build pass; never claim a test passed without running it.
  → [`docs/05-engineering/TESTING-STRATEGY.md`](docs/05-engineering/TESTING-STRATEGY.md)
- No hardcoded secrets. Role- and resource-level authorization on every protected endpoint. Never
  trust client-supplied prices, totals, or stock.
  → [`docs/05-engineering/SECURITY-STANDARDS.md`](docs/05-engineering/SECURITY-STANDARDS.md)
- Do not introduce microservices, Kubernetes, Kafka, Redis, multiple databases, or paid services
  (including Nx Cloud) without a new ADR.
  → [`docs/02-architecture/SYSTEM-ARCHITECTURE.md`](docs/02-architecture/SYSTEM-ARCHITECTURE.md)

## 8. Database rules (apply once a database exists — see `docs/04-design/DATABASE-DESIGN.md`)

- Prisma migrations must be version-controlled; never edit a production schema manually; never run
  a destructive migration without explicit approval.
- Every new relationship needs correct foreign keys; monetary values use decimal/numeric types,
  never floating-point.
- Checkout must be transactional; inventory reservation must use concurrency-safe locking.
- Order items retain historical price snapshots. Sensitive operations get audit records.

## 9. Tool-specific entry points

- **Claude Code**: see [`CLAUDE.md`](CLAUDE.md) — it points back here and preserves the official
  Nx integration. Claude Code also loads the repository-managed skills under `.claude/skills/` —
  see section 10.
- **Antigravity / Gemini CLI**: see [`GEMINI.md`](GEMINI.md) — points back here. Antigravity loads
  skills from `.agents/skills/` (and `.claude/skills/` via `.agents/skills.json`) and MCP servers
  from `.agents/mcp_config.json` and `.agents/plugins/`.
- **GitHub Copilot**: see
  [`.github/copilot-instructions.md`](.github/copilot-instructions.md) — short, points back here.
- Any other assistant should be directed to read this file and `docs/README.md` first. Do not
  create a separate, duplicated full instruction system per tool.

## 10. Repository-managed Claude Code skills

`.claude/skills/dropzo-*/SKILL.md` encode the most load-bearing parts of this file and
`docs/05-engineering/` as skills Claude Code loads automatically when relevant (test-driven
development, code review, security review, debugging, NestJS development, database/Prisma changes,
frontend/E2E testing, documentation/ADR governance, release readiness). They do not replace this
file or the detailed standards — they operationalize them. Full reference, including third-party
skill evaluation and governance rules for changing `.claude/`:
[`docs/05-engineering/AI-ENGINEERING-TOOLKIT.md`](docs/05-engineering/AI-ENGINEERING-TOOLKIT.md).
This toolkit must work from a fresh clone alone — do not assume any personally-installed skill or
plugin is present.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
