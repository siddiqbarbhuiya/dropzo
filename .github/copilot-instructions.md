# Copilot instructions — Dropzo

Before suggesting or generating code in this repository:

1. Read [`../AGENTS.md`](../AGENTS.md) — the canonical entry point and mandatory workflow for
   every coding assistant working on this project.
2. Read [`../docs/README.md`](../docs/README.md) — the documentation index (product scope,
   requirements, architecture, ADRs, business rules, engineering standards).

This file intentionally does not duplicate those instructions. If anything here ever conflicts
with `AGENTS.md`, `AGENTS.md` wins — update this file to match it, not the other way around.

Key points to remember while suggesting code:

- TypeScript strict mode; avoid `any`.
- Follow the module boundaries in
  [`../docs/02-architecture/SYSTEM-ARCHITECTURE.md`](../docs/02-architecture/SYSTEM-ARCHITECTURE.md).
- Never invent API contracts, database fields, or business rules that contradict `docs/`.
- Do not introduce microservices, Kubernetes, Kafka, Redis, or paid services without an approved
  ADR in [`../docs/03-decisions/`](../docs/03-decisions/).
