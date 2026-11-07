---
name: dropzo-backend-nestjs
description: Build or modify Dropzo's NestJS backend (apps/api) following the modular-monolith architecture, module boundaries, and ESM conventions already established. Use for any new module, controller, service, guard, or DTO in apps/api.
when_to_use: "add an endpoint", "create a NestJS module", "add a controller/service", any change under apps/api/src
paths: "apps/api/**"
---

# Dropzo: NestJS backend development

## Purpose

Keep `apps/api` a coherent modular monolith (per
[ADR-0001](../../../docs/03-decisions/ADR-0001-modular-monolith.md) and
[ADR-0004](../../../docs/03-decisions/ADR-0004-nestjs-rest-backend.md)), not a pile of ad hoc
controllers.

## When to use this skill

- Adding a new NestJS module, controller, service, guard, pipe, or DTO.
- Adding or changing a REST endpoint.
- Wiring a new dependency into `apps/api` (e.g. the future Prisma/database layer).

## When NOT to use this skill

- Frontend work (`apps/web`) — use `dropzo-frontend-e2e`.
- Database schema design itself — use `dropzo-database-prisma`; this skill covers the NestJS layer
  that sits on top of it.

## Workflow

1. Read [`docs/02-architecture/SYSTEM-ARCHITECTURE.md`](../../../docs/02-architecture/SYSTEM-ARCHITECTURE.md)
   for the current and planned module boundaries, and
   [`docs/04-design/API-SPECIFICATION.md`](../../../docs/04-design/API-SPECIFICATION.md) for naming
   conventions (`/api/v1` prefix, consistent error shape).
2. Place the new code in its own module directory under `apps/api/src/modules/` (or
   `apps/api/src/health/` as the existing precedent) — never reach into another module's files or
   database access directly.
3. **Controllers stay thin**: validate input (DTO + `ValidationPipe`, already wired globally in
   `apps/api/src/main.ts`), call a service, return a typed response. No business logic in the
   controller.
4. **Services own business rules.** Repositories/data-access live separately once Prisma exists
   (see `dropzo-database-prisma`).
5. **ESM conventions, already established in this codebase** (see `apps/api/src/main.ts`,
   `app.module.ts`): relative imports end in `.js`; default-import CJS packages
   (`import Joi from 'joi'`, not `import * as Joi`); `package.json` has `"type": "module"`;
   `tsconfig.json` uses `NodeNext` module resolution. Follow the existing files as the template —
   don't reintroduce CommonJS-style imports.
6. **Validation and errors**: use the existing `AllExceptionsFilter` pattern
   (`apps/api/src/common/filters/http-exception.filter.ts`) for consistent error shapes; add new
   DTOs with `class-validator` decorators.
7. **Environment variables**: add new required config to `apps/api/src/config/env.validation.ts`
   (Joi schema, validated at startup) — never read `process.env` directly in a service.
8. **Swagger**: decorate new endpoints (`@ApiTags`, `@ApiOkResponse`, etc.) so
   `GET /api/docs` stays accurate — it is the living API reference, not a hand-maintained doc.
9. Write or update tests per `dropzo-tdd` before considering the module done.

## Required checks

```bash
npm run lint -w apps/api
npm run typecheck -w apps/api
npm run test -w apps/api
npm run build -w apps/api
```

## Expected output

A new module respecting existing boundaries, with Swagger annotations, env validation for any new
config, and tests — confirmed by actually running the commands above.

## Failure handling

- If a new module genuinely needs to modify another module's data, that's a sign the boundary is
  wrong or a service interface is missing — raise it rather than reaching across directly.
- If NestJS/ESM tooling produces an unfamiliar error, check
  [`docs/07-operations/TROUBLESHOOTING.md`](../../../docs/07-operations/TROUBLESHOOTING.md) first
  (ESM import issues are already documented there) or use `dropzo-debugging`.

## This skill does not

- Cover database schema design — see `dropzo-database-prisma` for anything touching
  `DATABASE-DESIGN.md`'s tables.
- Authorize implementing business modules (auth, orders, payments) ahead of their scheduled task in
  `docs/06-delivery/TASK-TRACKER.md` — check that first.
