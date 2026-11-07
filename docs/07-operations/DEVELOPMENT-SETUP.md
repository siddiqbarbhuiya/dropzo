# Development setup (Windows)

This project is developed on a Windows PC. Application code (Node.js/npm) needs no WSL. **Docker
Desktop, since BC-004, needs either WSL2 or the Hyper-V backend enabled** - see the CAUTION note
below.

## Required software

| Tool           | Version used in this project | Notes                                             |
| -------------- | ---------------------------- | ------------------------------------------------- |
| Node.js        | v25.7.0                      | See the CAUTION note below                        |
| npm            | 11.10.1                      | Ships with Node.js                                |
| Git            | 2.55.0                       |                                                   |
| Docker Desktop | 29.6.2                       | Runs local PostgreSQL + PostGIS - see BC-004 note |
| Nx CLI         | 24.0.5 (global, one-time)    | See "Task orchestration with Nx" below            |

CAUTION: Node.js v25 is a non-LTS release. Some devDependencies (`@nestjs/schematics`,
`@angular-devkit/*`) print an `EBADENGINE` warning because they expect Node 22 LTS, 24 LTS, or
26+. This is a warning, not an install failure, and everything in this project runs correctly on
v25.7.0. If you hit a strange install or tooling issue later, try Node 22 LTS or 24 LTS first.

CAUTION: Docker Desktop on Windows requires either WSL2 or the Hyper-V backend to run Linux
containers (this project's Postgres image is Linux-only). If `docker info` fails with a message
like `request returned 500 ... dockerDesktopLinuxEngine`, WSL2 is most likely missing - install it
with `wsl --install` (as Administrator) and reboot, then restart Docker Desktop. This is a one-time,
per-machine Windows feature change outside this repository's own tooling.

## Repository layout

See the root [README.md](../../README.md) for the full folder layout, and
[`../02-architecture/SYSTEM-ARCHITECTURE.md`](../02-architecture/SYSTEM-ARCHITECTURE.md) for how
the pieces fit together.

## First-time setup

Run these commands from the repository root, in PowerShell:

```powershell
npm install
```

This installs dependencies for every workspace (`apps/web`, `apps/api`, and all `packages/*`) in
one step.

## Environment variables

Copy the example environment files before running the apps:

```powershell
Copy-Item .env.example .env
Copy-Item .env.test.example .env.test
Copy-Item apps\web\.env.example apps\web\.env
```

`DATABASE_URL` (required since BC-004) must point at a running Postgres - see "Database setup"
below. `.env.test` is only used by the API's integration test suite, never by `npm run dev` - it
points at a separate `dropzo_test` database so tests can never accidentally run against your
development data. The web app still runs with a safe default even without a `.env` file (its API
base URL defaults to `http://localhost:3000/api/v1`).

## Database setup (BC-004)

A clean clone needs these one-time and per-session steps before the API will start successfully -
`DATABASE_URL` is a required environment variable (see `apps/api/src/config/env.validation.ts`).

1. Start Docker Desktop, then start the database:
    ```powershell
    npx nx run infrastructure:dev
    ```
    This runs `docker compose up -d --wait` under
    [`infrastructure/docker/docker-compose.yml`](../../infrastructure/docker/docker-compose.yml) and
    does not return until Postgres actually reports healthy (not merely until the container exists).
    Check status any time with `npx nx run infrastructure:status`; stop it with
    `npx nx run infrastructure:down`.
2. Run the initial migration (creates all 41 MVP tables, the custom SQL from
   [`DATABASE-DESIGN.md`](../04-design/DATABASE-DESIGN.md)'s Prisma Implementation Readiness
   Checklist, and the restricted `dropzo_app` runtime role - created **without** a password, so the
   shared migration file never contains a credential):
    ```powershell
    npm run prisma:migrate:deploy -w apps/api
    ```
3. Set `dropzo_app`'s password for this environment, from `APP_DATABASE_URL` (one place the
   password is configured, never baked into the migration - see that migration's own comment):
    ```powershell
    npm run prisma:set-app-password -w apps/api
    ```
4. Seed deterministic development data (safe to rerun):
    ```powershell
    npm run db:seed -w apps/api
    ```
5. For the integration test suite only, also migrate the separate test database and set its
   `dropzo_app` password the same way:
    ```powershell
    npm run prisma:migrate:deploy:test -w apps/api
    npm run prisma:set-app-password:test -w apps/api
    ```

## Running the apps

Start the database, the API, and the web app together with the one required command:

```powershell
nx run-many -t dev
```

(A global, one-time Nx CLI install makes the bare `nx` command work - see "Task orchestration with
Nx" below. `npx nx run-many -t dev` works too, without that one-time step.) This starts exactly
three projects with a `dev` target - `infrastructure`, `@dropzo/api`, `@dropzo/web` - never the
shared packages, which have no `dev` script. The API's `dev` target depends on
`infrastructure:dev`, so it waits for Postgres to be healthy before starting; the web app starts
immediately regardless (it already shows "backend unreachable" in its health-check UI if the API
isn't up yet - see BC-002). Press Ctrl+C to stop the API and web dev servers; Postgres keeps
running in the background until you explicitly stop it with `npx nx run infrastructure:down`.

Or start the pieces separately, in separate terminals (useful for frontend- or backend-only work
that doesn't need the database):

```powershell
npm run dev:api
```

```powershell
npm run dev:web
```

- Backend: http://localhost:3000/api/v1
- Backend health check: http://localhost:3000/api/v1/health
- Backend Swagger docs (development only): http://localhost:3000/api/docs
- Frontend: http://localhost:5173

## Database integration tests

The API's integration/concurrency test suite (`apps/api/test/integration/*.integration-spec.ts`)
needs a real, migrated `dropzo_test` database - see "Database setup" above (step 4). Run it with:

```powershell
npm run test:integration -w apps/api
```

This is separate from `npm run test`, which only runs fast, database-free unit tests and is safe
to run without Docker at all.

## Database backup and restore

See [`DATABASE-BACKUP-RESTORE.md`](DATABASE-BACKUP-RESTORE.md).

## Running checks

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
```

Each of these runs across every workspace. Use `-w apps/api` or `-w apps/web` to target one
workspace, for example:

```powershell
npm run test -w apps/api
```

## Task orchestration with Nx

This project uses [Nx](https://nx.dev) on top of npm workspaces for task running and local
caching (no Nx Cloud, no remote caching — everything stays on your machine). The existing
`npm run <script>` commands still work and now run through Nx under the hood for `lint`,
`typecheck`, and (for `apps/web`) `dev`/`build`/`preview`.

You can also use the Nx CLI directly:

```powershell
npx nx show projects
npx nx graph
npx nx run-many -t build
npx nx run-many -t test
npx nx run-many -t lint
npx nx run-many -t typecheck
npx nx affected -t build --base=HEAD~1
```

`nx run-many` runs a target across every project that defines it, in parallel, and caches the
result locally — re-running an unchanged target reads from the cache instead of re-executing.
`nx affected` only runs a target for projects that changed relative to a given git ref.

Installed Nx plugins: `@nx/eslint`, `@nx/jest`, `@nx/vite`. `@nx/vitest` is intentionally **not**
installed — it requires Vitest 3–5, and this project pins Vitest `^2.1.4`. See
[`../06-delivery/PROGRESS.md`](../06-delivery/PROGRESS.md) (BC-002.1) for the full reasoning.

## Known issues / unfinished configuration

See [`../08-quality/RISK-REGISTER.md`](../08-quality/RISK-REGISTER.md) and
[`../08-quality/TECHNICAL-DEBT.md`](../08-quality/TECHNICAL-DEBT.md) for the full, tracked list
(unresolved `react-router-dom`, `vite`/`vitest`, and Nx `minimatch` advisories; `joi` vs. `zod`
validation split). Summary:

- The database schema (41 MVP-required tables) and local Docker infrastructure exist since BC-004
    - see "Database setup" above. No authentication is implemented yet (a separate, later task).
- Known dependency vulnerabilities are tracked, not fixed — see the risk register, not this file,
  for current status.
- Live Postgres verification of BC-004's migration/seed/integration tests could not be completed
  on the machine this task was implemented on: Docker Desktop's Linux engine needs hardware
  virtualization enabled in the machine's BIOS/UEFI firmware (a one-time, per-machine change
  outside any software fix), and a separate native PostgreSQL 17 service on that machine - whose
  credentials were obtained - is missing the PostGIS extension. See
  [`PROGRESS.md`](../06-delivery/PROGRESS.md)'s BC-004 entry for the exact blockers and what
  remains to verify on a machine with a working Docker/Postgres+PostGIS setup.
- The first two CI runs failed at "Prisma schema validation" due to an npm bin-name collision
  between `dotenv-cli` and a transitive `dotenv` dependency (both provide a `dotenv` binary) - fixed
  by invoking `dotenv-cli` via its exact file path in every `apps/api/package.json` script, rather
  than relying on the ambiguous `dotenv` command name. See `PROGRESS.md`'s BC-004 entry for the
  full diagnosis.

## CI

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) (added in BC-004) runs formatting,
lint, typecheck, unit tests, Prisma schema validation, migrations and database integration tests
against a real `postgis/postgis` service container, and the production builds, on every push to
`main` and every pull request. It does not yet include the documentation-specific checks below -
required files present (this file, `AGENTS.md`, `docs/README.md`), Markdown link validation, and
Mermaid syntax validation where tooling allows - which remain a tracked follow-up, not built
speculatively ahead of being needed.

## Related documents

- [`../README.md`](../README.md) — documentation index
- [`../02-architecture/SYSTEM-ARCHITECTURE.md`](../02-architecture/SYSTEM-ARCHITECTURE.md)
- [`../08-quality/RISK-REGISTER.md`](../08-quality/RISK-REGISTER.md)
- [`../08-quality/TECHNICAL-DEBT.md`](../08-quality/TECHNICAL-DEBT.md)
