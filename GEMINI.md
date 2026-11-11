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

- **Skills**: Discovered automatically under `.agents/skills/` and registered via `.agents/skills.json`.
- **MCP Servers**: Configured under `.agents/mcp_config.json` and bundled in `.agents/plugins/stitch/`.
- **Rules**: Enforced automatically via `AGENTS.md` and `GEMINI.md`.
