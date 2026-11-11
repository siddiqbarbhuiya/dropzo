# CLAUDE.md — Dropzo

Before anything else:

1. Read [`AGENTS.md`](AGENTS.md) — the canonical entry point for this repository.
2. Read [`docs/README.md`](docs/README.md) — the documentation index.
3. Read the relevant specification, architecture document, and ADR(s) for the task at hand (see
   `AGENTS.md` section 3 for the full reading list).
4. Read the current task and progress status in
   [`docs/06-delivery/TASK-TRACKER.md`](docs/06-delivery/TASK-TRACKER.md) and
   [`docs/06-delivery/PROGRESS.md`](docs/06-delivery/PROGRESS.md).
5. Follow the engineering standards in [`docs/05-engineering/`](docs/05-engineering/).

## Stitch UI 1:1 Implementation Rules

When creating or modifying frontend screens in `apps/web`:

- You MUST reference the approved Stitch designs in `audit/stitch-audit/html/<screenId>.html` and `audit/stitch-audit/screenshots/<screenId>.png` (see [`docs/04-design/UI-SCREEN-COVERAGE.md`](docs/04-design/UI-SCREEN-COVERAGE.md)).
- **NEVER delete visual sections or simplify layouts** because backend database columns/APIs are missing. Preserve all headers, stat cards, toggles, sidebars, and badges using static/default props with `// TODO: wire to API` comments.
- Replicate the exact DOM hierarchy, layout grid, and Dropzo theme tokens (Plus Jakarta Sans, Coral `#FF5733`, Forest `#006E2D`, Surface `#FBF8FF`).
- Invoke the repository skill `dropzo-stitch-to-react` for complete guidelines.

This file does not duplicate those instructions — `AGENTS.md` is authoritative. The section below
is Nx's own generated guidance; it does not conflict with the above and should be preserved as-is
(Nx updates it automatically between the markers).

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
