# ADR-0011: Repository documentation as canonical source of truth

- **Status:** Accepted
- **Date:** 2026-11-07
- **Related requirements/tasks:** BC-003

## Context

This project's requirements and decisions originated in a series of ChatGPT conversations and
pasted prompts before any of it lived in the repository. An AI coding assistant (or a human)
picking up the project later has no access to those conversations, only the repository.

## Problem

Where does the authoritative record of requirements, decisions, and progress live, so that any
future contributor — human or AI — can understand the project without needing prior chat context?

## Decision

The repository's `docs/` directory, `AGENTS.md`, and `CLAUDE.md` are the **single source of
truth**. If a past conversation, comment, or assumption conflicts with what's in the repository,
**the repository wins**. Every coding agent must read `AGENTS.md` and `docs/README.md` before
starting work, and must update affected documentation as part of finishing a task — not as a
separate, optional step.

## Alternatives considered

- **Keep relying on chat history / external docs** — rejected: breaks down the moment a new AI
  session or contributor starts without that context, which is exactly what happened before
  BC-003.
- **A wiki or external documentation tool** — rejected: adds a second system that can drift from
  the code; Markdown in the repository stays versioned with the code it describes.

## Consequences

- Easier: any future session (human or AI) can onboard from the repository alone.
- Harder: documentation must actually be kept up to date — this is now a mandatory part of every
  task's definition of done, not optional polish (see
  [`../05-engineering/DOCUMENTATION-STANDARDS.md`](../05-engineering/DOCUMENTATION-STANDARDS.md)).

## Security and operational implications

None directly, beyond ensuring secrets are never captured in documentation (use
`.env.example` placeholders, never real values).

## Revisit conditions

None anticipated — this is a foundational governance decision for the project.
