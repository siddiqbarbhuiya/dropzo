# Progress

## BC-001 — Repository foundation

Status: **Complete.**

- Monorepo structure created (`apps/web`, `apps/api`, `packages/shared-types`,
  `packages/validation`, `packages/api-client`, `docs`, `infrastructure`, `scripts`).
- `README.md`, `AGENTS.md`, `.env.example`, `.gitignore` added.
- Pushed to GitHub: https://github.com/siddiqbarbhuiya/dropzo (branch `main`).

## BC-002 — Development tooling

Status: **Complete.**

### What was built

- **Shared tooling**: root `tsconfig.base.json` (TypeScript strict mode), root `.prettierrc.json`,
  a shared ESLint flat-config factory (`eslint.config.base.mjs`) used by the shared packages.
- **Shared packages**:
    - `@dropzo/shared-types` — shared TypeScript types (currently `ApiHealthResponse`).
    - `@dropzo/validation` — a small `zod`-based validation helper, with a Vitest unit test.
    - `@dropzo/api-client` — a typed `fetch` wrapper the frontend uses to call the backend.
- **Backend (`apps/api`)**: NestJS 12, modular monolith, global prefix `/api/v1`, a `HealthModule`
  with `GET /api/v1/health`, environment-variable validation (`joi`), a centralised exception
  filter, and Swagger/OpenAPI docs at `/api/docs` in non-production environments. Jest unit test
  for the health endpoint.
- **Frontend (`apps/web`)**: React + TypeScript + Vite, React Router, TanStack Query, Zustand,
  styled-components. A single development home page shows the Dropzo name, the launch market, a
  live backend health check (via `@dropzo/api-client`), and a Zustand-backed button. Vitest smoke
  test.
- **Root scripts**: `dev`, `dev:web`, `dev:api`, `build`, `lint`, `lint:fix`, `typecheck`, `test`,
  `format`, `format:check` — each runs across every workspace that defines it.
- **Docs**: this file and `docs/DEVELOPMENT-SETUP.md`.

### Verification performed (actual results)

| Check                                              | Result                                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm install` (root)                               | Passes. 818 packages, `EBADENGINE` warnings only (Node 25 vs. toolchain's stated support range)         |
| `npm run typecheck`                                | Passes, all 5 workspaces                                                                                |
| `npm run lint`                                     | Passes, all 5 workspaces                                                                                |
| `npm run format:check`                             | Passes                                                                                                  |
| `npm run test`                                     | Passes — API: 1 test, web: 1 test, validation: 3 tests                                                  |
| `npm run build`                                    | Passes — `nest build` for the API, `tsc --noEmit && vite build` for the web app                         |
| Backend starts (`node dist/main.js`)               | Yes — confirmed `GET /api/v1/health` returns `{"status":"ok",...}`                                      |
| Swagger UI                                         | Yes — `GET /api/docs` returns HTTP 200                                                                  |
| Frontend starts (`npm run dev:web`)                | Yes — confirmed in a browser: renders "Dropzo", shows live backend status, Zustand button toggles state |
| Frontend reaches backend via configurable base URL | Yes — `VITE_API_BASE_URL` (default `http://localhost:3000/api/v1`)                                      |

### Problems found and fixed during this task

1. An earlier, interrupted `nest new` command had left debris (`apps/api/src`, `apps/api/test`,
   a partial `node_modules`, and ~250 stray hoisted packages at the repository root). Removed and
   reinstalled cleanly before starting BC-002 work.
2. A stale `package-lock.json` entry from that same interrupted command recorded
   `@dropzo/api@0.0.1` instead of `0.1.0`, which caused an `ERESOLVE` conflict. Fixed by deleting
   `package-lock.json` and `node_modules` and reinstalling.
3. The originally pinned `@nestjs/*` packages (`^11.x`) and `@nestjs/swagger@^8.x` are mutually
   incompatible, and NestJS has moved on to v12 as its current stable line (v11 is now tagged
   `legacy` on npm). Updated all `@nestjs/*` packages to `^12.x`.
4. NestJS 12 ships as ESM-only (`"type": "module"`). This required converting `apps/api` to ESM:
   `"type": "module"` in its `package.json`, `"module"/"moduleResolution": "NodeNext"` in its
   `tsconfig.json`, `.js` extensions on all relative imports, and a Jest config updated for ESM
   (`extensionsToTreatAsEsm`, a `moduleNameMapper` to resolve the `.js`-suffixed imports back to
   `.ts` for ts-jest, `useESM: true`, and running Jest with `NODE_OPTIONS=--experimental-vm-modules`
   via `cross-env` for Windows portability).
5. TypeScript has also moved to v6.0 as current; bumped the `^5.6.0` pin to `^6.0.0` across every
   workspace, since `@nestjs/schematics@12` requires TypeScript `>=6.0.0`.
6. Minor tsconfig fixes: removed an unused `baseUrl`, added `isolatedModules: true` (required by
   ts-jest under `NodeNext`), and added a `rootDir` the compiler required once `isolatedModules`
   was set.
7. `@nestjs/config`'s v12 `ConfigModule.forRoot({ validationSchema })` option now expects a
   Standard-Schema-compatible validator, which `joi` is not. Switched to the `validate` option
   with a plain function that runs the `joi` schema manually.
8. `import * as Joi from 'joi'` under Node's ESM interop did not expose `Joi.string` etc. directly
   (everything landed under a `.default`). Switched to a default import (`import Joi from 'joi'`).
9. `zod` had an open high-severity advisory (GHSA-mrhx-c7xc-m3w5) on the version first pinned
   (`^3.23.8`). Since `@dropzo/validation` was brand new with no real usage yet, upgraded to
   `^4.6.7` immediately rather than carrying the vulnerability forward.

### Remaining issues (not fixed in this task)

- `react-router-dom` (currently `^6.27.0`) has two open moderate-severity advisories
  (GHSA-wrjc-x8rr-h8h6, GHSA-337j-9hxr-rhxg). The fix is a major-version upgrade to v7, which is a
  breaking change to the approved stack and was not made without asking first.
- `npm audit` (including dev dependencies) still reports vulnerabilities inside
  `@nestjs/schematics`'s `@angular-devkit/*` dependency tree. These do not appear in
  `npm audit --omit=dev` and do not affect the running application — only the local CLI tooling.
- No database, authentication, or business modules — out of scope for BC-002 by design.
- Two local dev server processes (API on port 3000, web on port 5173) were left running during
  verification in this session and were not force-stopped (process termination was restricted in
  this environment). Stop them yourself if needed, e.g. close the terminal window or use Task
  Manager.

## BC-002 completion status: **Complete**, with the remaining issues above noted for follow-up.

## BC-002.1 — Nx verification and dependency security review

Status: **Complete.**

Note: Nx was not part of the BC-002 instructions originally given for this project — the earlier
BC-002 prompts specified npm workspaces only, with no mention of Nx. This task treats Nx as a new,
approved requirement and integrates it now.

### Part 1 — Nx integration

Nx was not installed before this task (no `nx.json`, no `nx` devDependency, no `node_modules/.bin/nx`).
Integrated using the official `npx nx init` flow, in "Nx on top of npm workspaces" mode — npm
workspaces are unchanged and remain the package manager; Nx adds task orchestration and caching on
top.

Installed plugins: `@nx/eslint`, `@nx/jest`, `@nx/vite` (local caching only — **no Nx Cloud**, per
instruction; the `--nxCloud=skip` flag was used, and `nx connect`/Nx Cloud was never run).

`@nx/vitest` was deliberately **not installed** — see the compatibility note below.

Verified Nx discovers all 5 projects and infers `build`, `test`, `lint`, and `typecheck` targets
correctly, with local caching active:

| Command                                  | Result                                                                                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `npx nx show projects`                   | `["@dropzo/shared-types","@dropzo/api-client","@dropzo/validation","@dropzo/api","@dropzo/web"]`                                       |
| `npx nx graph --file=...`                | Generated successfully; dependency edges match actual code imports (e.g. `@dropzo/web` → `@dropzo/api-client`, `@dropzo/shared-types`) |
| `npx nx run-many -t build`               | 2/2 succeeded (only `@dropzo/api`, `@dropzo/web` define `build`); second run: **2/2 cache hit (100%)**                                 |
| `npx nx run-many -t test`                | 3/3 succeeded (`@dropzo/api`, `@dropzo/web`, `@dropzo/validation`)                                                                     |
| `npx nx run-many -t lint`                | 5/5 succeeded                                                                                                                          |
| `npx nx run-many -t typecheck`           | 5/5 succeeded                                                                                                                          |
| `npx nx affected -t build --base=HEAD~1` | Correctly identified `@dropzo/api` and `@dropzo/web` as affected; both read from local cache                                           |

Local task caching is confirmed working (`nx.json` sets `"cache": true` for `build`/`test`/`lint`,
and repeat runs show cache hits). No remote/Nx Cloud caching is configured.

A real regression surfaced and was fixed during this work: installing `@nx/vite` reshuffled npm's
hoisting and briefly broke `apps/web`'s tests (`@testing-library/jest-dom` got hoisted to the root
without `vitest` alongside it, so its `vitest.mjs` entry point failed to resolve). Fixed by adding
`vitest` as an explicit root devDependency, which restored correct hoisting. Verified via a second
`nx run-many -t test` run.

### Part 2 — Dependency security audit

`npm audit` (all dependencies): **42 vulnerabilities** (6 low, 33 moderate, 1 high, 2 critical).
`npm audit --omit=dev`: **2 vulnerabilities** (both moderate) — only `react-router` /
`react-router-dom` affect what actually ships to users; everything else is dev-tooling only.

`npm audit fix` (non-force) was run and made **no changes** — every available fix in this tree
requires a major-version upgrade (`isSemVerMajor: true`), so there was nothing safe to apply
automatically. No major upgrades were performed without presenting them here first.

| Package                                                                                                              | Installed                 | Severity          | Advisory                                                                                                                                                                                                                                                                                        | Production or dev-only                                     | Patched version                                                                                                              | Breaking?                                             |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `react-router-dom` / `react-router`                                                                                  | 6.30.6                    | Moderate          | [GHSA-wrjc-x8rr-h8h6](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6), [GHSA-337j-9hxr-rhxg](https://github.com/advisories/GHSA-337j-9hxr-rhxg)                                                                                                                                              | **Production** (bundled into the web app)                  | 7.18.5                                                                                                                       | Yes — major (v6→v7)                                   |
| `vitest`                                                                                                             | 2.1.9                     | Critical          | [GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp) (Vitest UI server arbitrary file read/execute), [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) (moderate, path traversal)                                                                    | Dev-only (test runner)                                     | 4.1.12                                                                                                                       | Yes — major (v2→v4)                                   |
| `tinypool`, `vite-node`, `@vitest/mocker`                                                                            | (bundled with vitest 2.x) | Critical/Moderate | Transitive via `vitest` (incl. [GHSA-5gmw-xhrv-c9v3](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3), [GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8))                                                                                                              | Dev-only                                                   | Resolved by the `vitest` 4.x upgrade                                                                                         | Yes — same as above                                   |
| `vite`                                                                                                               | 5.4.21                    | High              | [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm) (`launch-editor`, Windows `fs.existsSync` bypass) plus several moderate/low dev-server-only issues (GHSA-4w7w-66w2-5vf9, GHSA-rq7h-c2jc-7f22, GHSA-fx2h-pf6j-xcff, GHSA-9jrq-w75r-8gcw, and more `launch-editor` CVEs) | Dev-only (dev server / build tool; not in shipped `dist/`) | 8.3.6                                                                                                                        | Yes — major (v5→v8, two majors)                       |
| `esbuild`                                                                                                            | (bundled with vite 5.x)   | Moderate          | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) (dev server accepts any request origin)                                                                                                                                                                                | Dev-only                                                   | Resolved by the `vite` 8.x upgrade                                                                                           | Yes — same as above                                   |
| `nx`, `@nx/eslint`, `@nx/jest`, `@nx/vite`, `@nx/web`, `@nx/devkit`, `@nx/workspace`, `@nx/js`                       | 24.0.5 (Nx packages)      | Moderate          | No CVE of their own — all cascade from a nested `minimatch@10.2.5` inside `node_modules/nx` ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), ReDoS)                                                                                                                   | Dev-only (CLI tooling)                                     | None that npm can resolve automatically (its suggested "fix" is `nx@17.2.8`, a _downgrade_ from our 24.0.5 — not meaningful) | N/A — tracked upstream                                |
| `@typescript-eslint/*`, `typescript-eslint`                                                                          | 8.x                       | Moderate          | Same nested `minimatch` ReDoS, via `@typescript-eslint/typescript-estree`                                                                                                                                                                                                                       | Dev-only                                                   | `npm audit fix` found no safe version                                                                                        | No (per audit), but blocked by the same tree conflict |
| `jest`, `ts-jest`, `jest-*`, `babel-jest`, `@jest/*`, `glob`, `deepmerge`, `test-exclude`, `create-jest`, `jest-cli` | 29.7.0 (jest)             | Low/Moderate      | Same nested `minimatch`/`glob` ReDoS chain, pulled in by `@nx/jest`'s own dependency tree                                                                                                                                                                                                       | Dev-only                                                   | npm's suggested "fix" (`jest@25.1.0`) is a downgrade and not meaningful                                                      | N/A                                                   |

### Vulnerabilities fixed in this task

None of the 42 had a non-breaking fix available (confirmed empirically — `npm audit fix` made no
changes). **No fixes were applied in Part 2.** The one real security upgrade already applied in
this project (`zod` 3.23.8 → 4.6.7, for a high-severity advisory) was done earlier, in BC-002.

### Remaining security risks (accepted, with reasons)

- **`react-router-dom` (moderate, production).** Fix requires a v6→v7 major upgrade. Not applied
  without approval, since it may require code changes to `apps/web/src/App.tsx` and routing usage.
  **Recommendation:** schedule this as its own small task once routes exist beyond the current
  single `/` route — the migration surface is still trivial right now.
- **`vite`/`vitest`/`esbuild` family (dev-only, up to critical severity).** These vulnerabilities
  require either an attacker-controlled network request reaching the local Vite dev server, or
  Vitest's UI mode being exposed — neither applies to this solo-developer, localhost-only
  workflow today. Risk is low in the current setup, but real if the dev server is ever exposed on
  a shared network or a CI runner reachable by untrusted traffic.
  **Recommendation:** upgrade `vite` to 6.x or 7.x (not 8.x yet — see compatibility note below)
  and `vitest` to 4.x together, as a dedicated task, since both are major version jumps that touch
  every workspace's test/build tooling and deserve their own verification pass.
- **Nx/`@nx/*`/Jest-adjacent `minimatch`/`glob` ReDoS chain (dev-only, moderate).** No fix path
  exists yet that `npm audit` can resolve automatically; this is upstream of Nx's own dependency
  pinning. Accepted as-is — exposure requires feeding attacker-controlled glob patterns into the
  local CLI tooling, which doesn't apply here.

### Part 3 — Compatibility review

- NestJS 12 + TypeScript 6 + Jest 29 (ESM) + Node 25.7.0: confirmed working (build, typecheck,
  test, dev server, Swagger, live health check all verified in BC-002).
- `@nx/vite@24.0.5` accepts Vite `^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0` — our pinned Vite 5.4.21 is
  compatible. Confirmed by reading `@nx/vite`'s own `peerDependencies`.
- **`@nx/vitest@24.0.5` requires Vitest `^3.0.0 || ^4.0.0 || ^5.0.0` — incompatible with our
  approved Vitest `^2.1.4` pin.** This is why `@nx/vitest` was not installed. Vitest test running
  still works correctly without it (Nx just doesn't get to independently infer/cache Vitest test
  targets the same way it does for `@nx/jest`; the existing `vitest run` npm scripts, now wrapped
  and cached by Nx's generic task runner, continue to work — confirmed by `nx run-many -t test`).
- `npm ls` reports zero `UNMET DEPENDENCY` / `invalid` entries across the whole tree — no
  unresolved peer dependency conflicts.
- Installing `@nx/vite` caused npm to want to raise the root `vite` devDependency to `^8.0.0` and
  `jest` to `~30.3.0` by default. Both were pinned back down to match the versions actually used by
  `apps/web` (`^5.4.11`) and `apps/api` (`^29.7.0`) to avoid an unplanned major upgrade — see
  "Problems found and fixed" below.
- Node.js v25.7.0 (non-LTS) continues to trigger `EBADENGINE` warnings from `@angular-devkit/*` and
  `@nestjs/schematics` (want Node 22 LTS, 24 LTS, or 26+). Still warnings only — every check in
  this task passed on v25.7.0.

### Problems found and fixed in BC-002.1

1. `npx nx init` could not run non-interactively without an explicit `--plugins` flag; re-ran with
   `--plugins=@nx/eslint,@nx/jest,@nx/vite,@nx/vitest` (the four it detected).
2. `@nx/vite` and `@nx/vitest` failed on the first attempt: `@nx/vite` hit an `UNKNOWN: unknown
error` writing `packages/api-client/package.json` (transient), and `@nx/vitest` failed because
   `vitest` wasn't resolvable from the root `node_modules`. Retried `@nx/vite` alone — it
   succeeded. `@nx/vitest` was not retried, since it also turned out to require Vitest 3+ (see
   Part 3).
3. `npx nx init`/`npx nx add @nx/vite` defaulted the root `vite` devDependency to `^8.0.0` and
   `jest` to `~30.3.0`, both newer majors than our approved, working pins. Reset both to match
   the versions already used in `apps/web`/`apps/api` (`^5.4.11` / `^29.7.0`).
4. Installing `@nx/vite` reshuffled hoisting and broke `apps/web`'s test (see Part 1). Fixed by
   adding `vitest` as an explicit root devDependency.
5. `@nx/vitest` requires Vitest 3–5; our approved stack pins Vitest `^2.1.4`. Did not force this
   upgrade — `@nx/vitest` was left uninstalled instead (see Part 3).

### Files changed in BC-002.1

- `package.json` (root) — added `nx` and `@nx/*` plugin devDependencies; pinned `vite`, `jest`,
  `vitest` to match existing approved versions.
- `package-lock.json` — regenerated.
- `nx.json` — new; target defaults (`build`/`test`/`lint` cached) and the 3 installed plugins.
- `.gitignore` — Nx added `.nx/cache`, `.nx/workspace-data`, `.nx/migrate-runs`.
- `apps/api/package.json`, `apps/web/package.json`, `packages/*/package.json` — `lint`/`typecheck`
  scripts now delegate to `nx eslint:lint` / `nx tsc:typecheck`; `apps/web`'s `dev`/`build`/
  `preview` scripts now delegate to `nx serve` / `nx tsc:typecheck && nx vite:build` /
  `nx vite:preview`.
- `docs/PROGRESS.md` — this section.
- `docs/DEVELOPMENT-SETUP.md` — Nx commands and notes added.

### BC-002.1 completion status: **Complete.**

Changes are committed locally but **not yet pushed** — reporting these results first, as
instructed.

Do not start BC-003 (database/Prisma) until instructed.
