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

Do not start BC-003 (database/Prisma) until instructed.
