# GEMINI.md — Dropzo (Antigravity & Gemini CLI)

Before anything else:

1. Read [`AGENTS.md`](AGENTS.md) — the canonical entry point for this repository.
2. Read [`docs/README.md`](docs/README.md) — the documentation index.
3. Read the relevant specification, architecture document, and ADR(s) for the task at hand (see
   `AGENTS.md` section 3 for the full reading list).
4. Read the current task and progress status in
   [`docs/06-delivery/TASK-TRACKER.md`](docs/06-delivery/TASK-TRACKER.md) and
   [`docs/06-delivery/PROGRESS.md`](docs/06-delivery/PROGRESS.md).
5. Follow the engineering standards in [`docs/05-engineering/`](docs/05-engineering/).

This file does not duplicate those instructions — `AGENTS.md` is authoritative.

## Customizations & Resources for Antigravity

- **Skills**: Discovered automatically under `.agents/skills/` (and `.claude/skills/` via `.agents/skills.json`). Includes `dropzo-stitch-to-react` for 1:1 UI translation.
- **MCP Servers**: Configured under `.agents/mcp_config.json` and bundled in `.agents/plugins/stitch/`.
- **Rules**: Enforced automatically via `AGENTS.md` and `GEMINI.md`.

## Stitch UI 1:1 Implementation Rules

When creating or modifying frontend screens in `apps/web`:

- **Always fetch the latest artifacts via Stitch MCP**: If a design might have changed or when starting work on a screen, use the Stitch MCP tools or `node scripts/stitch.mjs` to fetch the newest HTML and screenshots for **both Mobile and Desktop viewports** from project `3837531702173487386`.
- **Reference approved Stitch designs**: Reference `audit/stitch-audit/html/<screenId>.html` and `audit/stitch-audit/screenshots/<screenId>.png` (see [`docs/04-design/UI-SCREEN-COVERAGE.md`](docs/04-design/UI-SCREEN-COVERAGE.md)).
- **NEVER delete visual sections or simplify layouts** because backend database columns/APIs are missing. Preserve all headers, stat cards, toggles, sidebars, and badges using static/default props with `// TODO: wire to API` comments.
- Replicate the exact DOM hierarchy, layout grid, and Dropzo theme tokens (Plus Jakarta Sans, Coral `#FF5733`, Forest `#006E2D`, Surface `#FBF8FF`).
