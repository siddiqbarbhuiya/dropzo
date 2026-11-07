# AI engineering toolkit (Claude Code skills)

**Status: Accepted.** This documents the repository-managed Claude Code skills under
`.claude/skills/`, why each exists, and how to use, verify, and extend them. It does not duplicate
[`AGENTS.md`](../../AGENTS.md) — read that first; this page is the detailed reference for the
skills layer specifically.

## Why this exists

Dropzo's engineering rules (`AGENTS.md`, `docs/05-engineering/`, the database design's closed
review) are long and easy to forget mid-task. Claude Code's **Agent Skills** feature lets us encode
the most load-bearing parts of those rules as files the assistant reads automatically when they're
relevant — committed to the repository, so every contributor gets the same toolkit without
depending on anything installed in their personal Claude Code environment.

## Available skills

All skills live at `.claude/skills/<skill-name>/SKILL.md` and are prefixed `dropzo-` to make clear
they're project-specific, not a general-purpose or plugin-provided skill.

| Skill                      | Covers                                                                                  | Key doc references                                                     |
| -------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `dropzo-tdd`               | Test-driven development (red-green-refactor) for backend, frontend, and shared packages | `TESTING-STRATEGY.md`                                                  |
| `dropzo-code-review`       | Code review against Dropzo's standards and business rules                               | `CODE-REVIEW-STANDARDS.md`, `CODING-STANDARDS.md`, `BUSINESS-RULES.md` |
| `dropzo-security-review`   | Security review: auth, tenant isolation, payments, webhooks, pickup codes               | `SECURITY-STANDARDS.md`, `DATABASE-DESIGN.md`                          |
| `dropzo-debugging`         | Systematic root-cause debugging, including known Dropzo issues                          | `TROUBLESHOOTING.md`                                                   |
| `dropzo-backend-nestjs`    | NestJS module/controller/service development (`apps/api`)                               | `SYSTEM-ARCHITECTURE.md`, `API-SPECIFICATION.md`                       |
| `dropzo-database-prisma`   | PostgreSQL/Prisma schema and migrations, inventory/ledger/concurrency rules             | `DATABASE-DESIGN.md`, `BC-004-IMPLEMENTATION-PLAN.md`                  |
| `dropzo-frontend-e2e`      | React development, accessibility, Playwright end-to-end testing (`apps/web`)            | `CODING-STANDARDS.md`, `TESTING-STRATEGY.md`                           |
| `dropzo-docs-and-adr`      | Documentation synchronization, requirements traceability, ADR governance                | `DOCUMENTATION-STANDARDS.md`, `03-decisions/`                          |
| `dropzo-release-readiness` | Pre-merge/pre-commit completion gate                                                    | `AGENTS.md` ("after implementation")                                   |

This covers the twelve originally-requested workflows, consolidated into nine skills where two
workflows are tightly coupled in practice (Prisma schema work with its concurrency tests; React
development with its end-to-end tests; documentation traceability with ADR governance) — per
[`DOCUMENTATION-STANDARDS.md`](DOCUMENTATION-STANDARDS.md)'s general preference for consolidation
over a file for every conceivable split.

Every skill explicitly states what it does **not** guarantee (e.g. a code review "does not
guarantee the reviewed code is secure or bug-free") — see each `SKILL.md`'s closing section.

## How Claude Code discovers these skills

Per the [official Claude Code skills documentation](https://code.claude.com/docs/en/skills):
project skills at `.claude/skills/<name>/SKILL.md` load automatically for anyone working in this
repository, once the workspace trust dialog has been accepted. Claude Code keeps every skill's
`description` (and `when_to_use`, if set) in context at all times; the full instructions in the
file body load only when a skill is actually invoked — either automatically (the request matches
the description) or manually.

## How to invoke a skill

- **Automatically**: just describe the task normally (e.g. "review this PR" or "add a Prisma
  migration for X") — Claude Code matches your request against each skill's `description`.
- **Manually**: type `/dropzo-<name>` at the start of a message (e.g. `/dropzo-security-review`).
- Several skills declare a `paths` glob (e.g. `dropzo-backend-nestjs` activates for `apps/api/**`),
  so they're more likely to trigger automatically when you're already editing matching files.

## Which workflows activate automatically

All nine skills are model-invocable (none sets `disable-model-invocation: true`), so Claude Code
may load any of them on its own when your request matches. If you want to force manual-only
invocation for a skill in the future, add `disable-model-invocation: true` to its frontmatter — see
the official docs linked above for the full frontmatter reference.

## How to add or update a skill

1. Create `.claude/skills/<skill-name>/SKILL.md` (or edit an existing one).
2. Give it YAML frontmatter with at least `name` and `description` — the description is what
   Claude Code matches against, so be specific about when the skill should (and should not) fire.
3. Structure the body like the existing skills: purpose, when to use / not use, workflow, required
   checks, expected output, failure handling, and a closing "this skill does not" section.
4. Reference the real Dropzo documentation the skill depends on (relative links from the skill file
   to `docs/...`), not a restatement of it.
5. Run the validation script before committing:
    ```bash
    node scripts/validate-claude-skills.mjs
    ```
6. **Changes to `.claude/` go through a pull request** like any other change — see "Security and
   governance" below.

## How to evaluate a third-party skill or plugin

Before recommending or vendoring anything external:

1. Find the **official, authoritative repository** — not a mirror, fork, or aggregator site (several
   exist for popular plugins and can lag behind or be unmaintained; a few flagged as suspicious by
   third-party scanners were found during this evaluation — always verify against the org/author's
   own GitHub account).
2. Check its **license** in the actual `LICENSE` file, not a third-party summary.
3. Decide: redistribute (only if the license clearly permits it and it's worth the maintenance
   burden) vs. **reference it** (document the official install command and let each contributor opt
   in individually) vs. exclude.
4. Record the source repository, license, and version/commit basis in whatever references it (see
   "Third-party skills evaluated" below for the format used here).
5. Never commit proprietary or license-incompatible content.

## Third-party skills evaluated

| Candidate                                                                               | Official source                                                                                                   | License                                                                                                                                                                                                                                        | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Superpowers                                                                             | [github.com/obra/superpowers](https://github.com/obra/superpowers)                                                | MIT                                                                                                                                                                                                                                            | **Referenced, not vendored.** A genuinely useful TDD/debugging/collaboration methodology (`test-driven-development`, `systematic-debugging`, `verification-before-completion`, etc.), already installable via the official marketplace (`/plugin install superpowers@claude-plugins-official`). Registered as a known marketplace in `.claude/settings.json` (`superpowers-marketplace` → `obra/superpowers-marketplace`) for convenience, **not enabled by default** — each contributor opts in. Not vendored because (a) it would duplicate `dropzo-tdd`/`dropzo-debugging`'s Dropzo-specific content with generic content, and (b) the project must not depend on it being installed. |
| Anthropic official skills                                                               | [github.com/anthropics/skills](https://github.com/anthropics/skills)                                              | Stated as open-source in places; licensing for some document skills is described by third parties as "source-available" rather than fully open — **verify the actual `LICENSE` file before relying on this for anything beyond personal use.** | **Referenced, not vendored.** Contains document-format skills (PDF/DOCX/PPTX/XLSX), `mcp-builder`, `skill-creator`, and similar — none of it overlaps with Dropzo's engineering workflows (no code-review or security-review skill exists in this repository as of this evaluation). Registered as a known marketplace (`anthropic-skills` → `anthropics/skills`), not enabled. Useful mainly if a contributor wants `skill-creator` to help author further Dropzo skills.                                                                                                                                                                                                               |
| Trail of Bits security skills                                                           | [github.com/trailofbits/skills](https://github.com/trailofbits/skills)                                            | CC BY-SA 4.0                                                                                                                                                                                                                                   | **Referenced, not vendored.** A large catalogue (40+ skills) overwhelmingly focused on smart-contract security, C/C++/Rust review, and other domains Dropzo's stack doesn't use. One skill, `differential-review` (security review of changes using git history), is generically relevant. Not vendored: CC BY-SA 4.0 requires any adapted material to carry the same share-alike license and attribution, which doesn't fit cleanly into an otherwise proprietary repository; registering the marketplace (`trailofbits-skills`) lets an interested contributor install it individually instead.                                                                                        |
| "Anthropic Code Review" / "Anthropic Security Guidance" / "Anthropic PR Review Toolkit" | **Could not verify** as a specific, named, authoritative repository or marketplace entry under those exact names. | N/A                                                                                                                                                                                                                                            | **Not included**, per the explicit instruction not to invent plugin names or identifiers. A generic code-review-style skill and a generic security-review-style skill may already be available in some Claude Code sessions (e.g. via an organization's own plugin configuration), independent of anything in this repository — if so, use `dropzo-code-review`/`dropzo-security-review` _in addition_ to them for the Dropzo-specific checks a generic tool won't know.                                                                                                                                                                                                                 |
| Context7                                                                                | [github.com/upstash/context7](https://github.com/upstash/context7) (Upstash, not Anthropic)                       | MIT                                                                                                                                                                                                                                            | **Not a skill — an MCP server** for fetching up-to-date library documentation. Not configured in this repository (it's a personal/account-level tool choice, and some Claude Code environments already provide it as an account-level plugin). Documented here only so contributors know what it is if they see it offered.                                                                                                                                                                                                                                                                                                                                                              |
| Playwright MCP                                                                          | [github.com/microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) (Microsoft, not Anthropic)     | MIT (verify the repository's own `LICENSE` file)                                                                                                                                                                                               | **Not a skill — an MCP server** for browser automation, relevant once `dropzo-frontend-e2e`'s Playwright work actually starts. Not configured in this repository for the same reason as Context7 — it's often already available as an account/environment-level tool.                                                                                                                                                                                                                                                                                                                                                                                                                    |

## Skills deliberately excluded

No candidate workflow from the original twelve was dropped — each is covered by one of the nine
skills above. No third-party skill was vendored (copied) into this repository, for the reasons in
the table: either genuine license incompatibility with a proprietary codebase (Trail of Bits,
CC BY-SA 4.0), low relevance to Dropzo's actual stack (most of Trail of Bits's and Anthropic's own
catalogues), or risk of making the project depend on something not guaranteed to be installed
(Superpowers).

## Project-scoped plugin configuration

`.claude/settings.json` now declares three additional **known marketplaces**, alongside the
existing Nx one, using the same mechanism already in place for `nx-claude-plugins`:

```json
"extraKnownMarketplaces": {
  "anthropic-skills": { "source": { "source": "github", "repo": "anthropics/skills" } },
  "superpowers-marketplace": { "source": { "source": "github", "repo": "obra/superpowers-marketplace" } },
  "trailofbits-skills": { "source": { "source": "github", "repo": "trailofbits/skills" } }
}
```

**None of these are enabled by default** — only `nx@nx-claude-plugins` is (inherited from BC-002.1,
required for this repository's Nx integration). Registering a marketplace only makes
`/plugin install <plugin>@<marketplace>` work without first running `/plugin marketplace add`; it
does not install or enable anything on its own, and does not touch any contributor's personal/global
Claude Code configuration. Any contributor who wants Superpowers, the official Anthropic skills, or
Trail of Bits's security skills can run the install command themselves, reviewing and approving it
through Claude Code's normal plugin flow.

## Required external dependencies

None of the nine Dropzo-owned skills require anything beyond what the repository already needs
(Node.js, npm — see [`DEVELOPMENT-SETUP.md`](../07-operations/DEVELOPMENT-SETUP.md)). The
optional third-party marketplaces above have their own requirements if installed (none introduce
paid services). Playwright itself (the test framework, not the MCP server) will be an actual
`package.json` dependency once `dropzo-frontend-e2e`'s end-to-end testing work begins — not yet
added, since Playwright isn't introduced in this repository yet (see
[`TESTING-STRATEGY.md`](TESTING-STRATEGY.md)).

## How contributors verify their available skills

1. Confirm the files exist and are structurally valid:
    ```bash
    node scripts/validate-claude-skills.mjs
    ```
2. In Claude Code, ask "what skills are available in this repository?" or check the `/` command
   menu — every `dropzo-*` skill should be listed (this requires having accepted the workspace
   trust dialog for this repository).
3. To confirm a skill actually triggers, describe a matching task (e.g. "review my changes" should
   surface `dropzo-code-review`) and check that its guidance is reflected in the response.

## Security and governance

`.claude/` is **trusted project configuration** — everyone who clones this repository runs whatever
it contains. Treat it accordingly:

- **Changes to `.claude/` go through a pull request**, reviewed like any other code change — see
  [`CODE-REVIEW-STANDARDS.md`](CODE-REVIEW-STANDARDS.md).
- **Third-party material requires source and license information** recorded in this document (see
  the evaluation table above) before it's referenced, and before any vendoring decision.
- **No secrets, API keys, or personal credentials** may appear in any skill file.
  `scripts/validate-claude-skills.mjs` includes a basic pattern check for this as defence in depth
  — it is not a substitute for care, and does not catch every possible secret format.
- **No skill may instruct bypassing authorization, tests, security checks, or required human
  approval** — every skill in this toolkit explicitly defers to `AGENTS.md`'s "when to stop and
  ask" rules rather than overriding them.
- **No skill executes arbitrary remote scripts.** None of the nine skills declare `hooks` or an
  external script dependency; if a future skill needs one, it must be reviewed for exactly what it
  does and what permissions it needs before being added.
- **No skill performs an automatic destructive database, Git, or deployment operation.** Several
  skills explicitly restate `AGENTS.md`'s rule against destructive migrations without approval.
- **No hooks exist in this repository as of this toolkit's creation** — `.claude/settings.json` has
  no `hooks` key. If one is added later, review its actual trigger conditions and effects as part
  of the same PR, not as an afterthought.
- **No skill is granted unrestricted tool permissions.** None of the nine skills set
  `allowed-tools` to bypass normal approval; they rely on Claude Code's standard permission prompts
  like any other session activity.

## Related documents

- [`../../AGENTS.md`](../../AGENTS.md) — canonical entry point; this page is the detailed
  skills-layer reference it points to.
- [`../../CLAUDE.md`](../../CLAUDE.md) — Claude Code's own entry point (points here and to
  `AGENTS.md`).
- [`CODE-REVIEW-STANDARDS.md`](CODE-REVIEW-STANDARDS.md), [`SECURITY-STANDARDS.md`](SECURITY-STANDARDS.md),
  [`TESTING-STRATEGY.md`](TESTING-STRATEGY.md), [`DOCUMENTATION-STANDARDS.md`](DOCUMENTATION-STANDARDS.md)
- [`../04-design/DATABASE-DESIGN.md`](../04-design/DATABASE-DESIGN.md)
