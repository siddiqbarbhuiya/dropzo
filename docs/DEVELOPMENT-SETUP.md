# Development setup (Windows)

This project is developed on a Windows PC, without WSL.

## Required software

| Tool           | Version used in this project | Notes                                                  |
| -------------- | ---------------------------- | ------------------------------------------------------ |
| Node.js        | v25.7.0                      | See the CAUTION note below                             |
| npm            | 11.10.1                      | Ships with Node.js                                     |
| Git            | 2.55.0                       |                                                        |
| Docker Desktop | 29.6.2                       | Not yet used — database setup is a later task (BC-003) |

CAUTION: Node.js v25 is a non-LTS release. Some devDependencies (`@nestjs/schematics`,
`@angular-devkit/*`) print an `EBADENGINE` warning because they expect Node 22 LTS, 24 LTS, or
26+. This is a warning, not an install failure, and everything in this project runs correctly on
v25.7.0. If you hit a strange install or tooling issue later, try Node 22 LTS or 24 LTS first.

## Repository layout

See the root [README.md](../README.md) for the full folder layout.

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
Copy-Item apps\web\.env.example apps\web\.env
```

Both apps also run with safe defaults even without a `.env` file: the API defaults to
`NODE_ENV=development` and `PORT=3000`, and the web app defaults its API base URL to
`http://localhost:3000/api/v1`.

## Running the apps

Start both apps together:

```powershell
npm run dev
```

Or start them separately, in two terminals:

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
`docs/PROGRESS.md` (BC-002.1) for the full reasoning.

## Known issues / unfinished configuration

- No database is configured yet (BC-003).
- No authentication is implemented yet.
- The `@dropzo/validation` package's `zod` dependency and the backend's env validation are not
  yet unified — `apps/api` validates its own environment variables with `joi`, independent of the
  shared `@dropzo/validation` package. This is fine for now since they validate different things,
  but worth keeping in mind before BC-003.
- `react-router-dom` has an open moderate-severity advisory (GHSA-wrjc-x8rr-h8h6/GHSA-337j-9hxr-rhxg)
  that is only fixed by a major-version upgrade to v7. Not upgraded in this task — see
  `docs/PROGRESS.md` for details.
- NestJS 12's tooling (`@nestjs/schematics`, pulling in `@angular-devkit/*`) carries some
  dev-only vulnerabilities per `npm audit`. These do not appear in `npm audit --omit=dev`, so they
  do not affect the running application, only the local dev toolchain.
- `vite` (5.4.21) and `vitest` (2.1.9) have open dev-only advisories, up to critical severity, that
  are only fixed by major-version upgrades (Vite 8.x, Vitest 4.x). These affect the local dev
  server / test runner, not the production build. See `docs/PROGRESS.md` (BC-002.1) for the full
  table and a recommended upgrade path.
- Nx's own dependency tree carries a nested, older `minimatch` with a moderate ReDoS advisory.
  Dev-tooling only; no fix available yet that `npm audit` can apply automatically.
