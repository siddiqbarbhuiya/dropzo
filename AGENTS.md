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

## 4. Mandatory three-phase workflow (Spike -> Plan -> Execution)

Every new task, feature, bugfix, or refactoring in this repository MUST strictly proceed through
three distinct gates. Never jump ahead to planning before a Spike is approved; never write
production code before a Plan is approved.

### Scope threshold (When to trigger)

- **Trigger this full workflow for**: Any non-trivial task — new features, frontend screens, new API endpoints, database schema changes, architectural modifications, or multi-step bugfixes.
- **Do NOT trigger full ceremony for**: Trivial single-line typo fixes, isolated documentation edits, or simple one-off config updates.

```
┌─────────────────────────────────┐
│     Phase 1: Spike              │ ──> Requires >95% Confidence & Owner Approval
└─────────────────────────────────┘
                 │ (Approved)
                 ▼
┌─────────────────────────────────┐
│     Phase 2: Plan               │ ──> Requires Owner Approval
└─────────────────────────────────┘
                 │ (Approved)
                 ▼
┌─────────────────────────────────┐
│     Phase 3: Execution (TDD)    │ ──> Verified via Tests, Types, Lint, & Docs Sync
└─────────────────────────────────┘
```

### Dedicated Spike and Plan Storage

Every spike and implementation plan MUST be committed to the repository for historical traceability:

- **Spikes**: Save to `docs/06-delivery/spikes/YYYY-MM-DD-<task-id>-<slug>.md` (use template [`docs/_templates/SPIKE-TEMPLATE.md`](docs/_templates/SPIKE-TEMPLATE.md)).
- **Plans**: Save to `docs/06-delivery/plans/YYYY-MM-DD-<task-id>-<slug>.md` (use template [`docs/_templates/IMPLEMENTATION-PLAN-TEMPLATE.md`](docs/_templates/IMPLEMENTATION-PLAN-TEMPLATE.md)).

### Interactive Clarification Protocol (Multiple-Choice Questions)

If any ambiguity, open requirement, or technical trade-off arises during **Phase 1 (Spike)** or **Phase 2 (Plan)**:

- **DO NOT GUESS or invent business rules.**
- **Present the question as a Multiple-Choice Question (MCQ)** with explicit options (using the `ask_question` tool or structured markdown options), placing the `(Recommended)` option first, followed by clear alternatives.

---

### Phase 1: Spike & Feasibility Analysis (Confidence > 95% Gate)

Before writing any plan or code, immediately conduct a Spike investigation.

1. **Activate relevant skills**:
    - `brainstorming` — explore approaches, requirements, and edge cases.
    - `systematic-debugging` — for bugs, investigate root cause before proposing fixes.
    - `dropzo-stitch-to-react` & Stitch MCP — for frontend work, fetch fresh HTML and screenshots for **both Mobile and Desktop viewports** from project `3837531702173487386`.
2. **Investigation checklist**:
    - Read Section 3 authoritative docs (`docs/README.md`, `TASK-TRACKER.md`, requirements, ADRs, database schema).
    - Inspect current `git status` and branch.
    - Identify affected files, modules, API contracts, database tables, and foreign keys.
    - Uncover potential blockers, performance implications, security boundaries, and edge cases.
    - Resolve any ambiguities with the owner via MCQ questions.
3. **Produce & Save Spike Report**:
    - Save report to `docs/06-delivery/spikes/YYYY-MM-DD-<task-id>-<slug>.md`.
    - Summarize findings, proposed approach, affected boundaries, and any open design questions.
    - Explicitly state the **Confidence Level (e.g. 98%)**.
4. **GATE 1**: **Stop and present the Spike Report to the product owner.** If confidence is not
   **>95%**, identify the unknowns and resolve them first. Do NOT proceed to Phase 2 without explicit
   user approval.

### Phase 2: Formal Implementation Planning (Approval Gate)

Once the Spike is approved, draft a detailed implementation plan.

1. **Activate relevant skills**:
    - `writing-plans` — structure the plan into bite-sized, single-responsibility tasks.
    - `writing-skills` — if new agent behaviors or skills are being defined.
2. **Planning standards**:
    - Save plan to `docs/06-delivery/plans/YYYY-MM-DD-<task-id>-<slug>.md`.
    - Break work into small, independently testable tasks (each ending with a test verification).
    - Specify exact file paths (Create, Modify, Test), concrete interfaces/signatures, and test assertions.
    - Adhere to module boundaries in `SYSTEM-ARCHITECTURE.md` and rules in `CODING-STANDARDS.md`.
    - If database schema changes are required, present the migration plan upfront.
    - Never invent business rules or API contracts that contradict `docs/`.
3. **GATE 2**: **Stop and present the plan to the product owner.** Do NOT write production code
   until the user reviews and explicitly approves the plan.

### Phase 3: Execution, TDD & Verification (Verification Gate)

Once the Plan is approved, execute it task-by-task.

1. **Activate relevant skills**:
    - `executing-plans` / `subagent-driven-development` — disciplined task-by-task execution.
    - `test-driven-development` (`dropzo-tdd`) — write failing test first, then minimal implementation, then verify pass.
    - `dropzo-stitch-to-react` — for UI work, preserve 100% visual fidelity against Stitch designs without stripping sections.
    - `dropzo-code-review` & `dropzo-security-review` — rigorous verification of correctness, authorization, and data safety.
    - `verification-before-completion` — execute actual verification commands and verify real output before claiming success.
    - `dropzo-release-readiness` — ensure repository hygiene before completion.
2. **Execution rules**:
    - Work only on the assigned task; avoid unrelated refactoring.
    - Add/update tests as you go, not as an afterthought.
    - Strict TypeScript mode, avoid `any`.
3. **Mandatory verification suite**:
    - Run unit & integration tests (`npm run test` or `npx nx run-many -t test`).
    - Run typecheck (`npm run typecheck` or `npx nx run-many -t typecheck`).
    - Run linter (`npm run lint` or `npx nx run-many -t lint`).
    - Run build (`npm run build`).
    - Run formatting check (`npm run format:check`).
    - Review git diff (`git status`, `git diff`).
4. **Documentation synchronization**:
    - Update affected documents per Section 5 mapping.
    - Update `docs/06-delivery/TASK-TRACKER.md` and `docs/06-delivery/PROGRESS.md`.
    - Record any new risks or technical debt in `RISK-REGISTER.md` or `TECHNICAL-DEBT.md`.
5. **GATE 3**: Report changed files, actual test outputs, and await user authorization for git commit/push.

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
