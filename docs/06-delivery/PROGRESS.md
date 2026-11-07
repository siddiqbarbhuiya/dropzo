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

## BC-003 — Documentation governance & AI-agent knowledge system

Status: **Complete.**

### What was built

A canonical, versioned documentation system under `docs/`, replacing the two standalone files
(`docs/PROGRESS.md`, `docs/DEVELOPMENT-SETUP.md`) that existed before this task — both were moved,
not deleted (`docs/06-delivery/PROGRESS.md` is this file; `docs/07-operations/DEVELOPMENT-SETUP.md`
holds the setup guide).

- [`docs/README.md`](../README.md) — documentation index and status-label conventions.
- `docs/00-project/` — `PROJECT-OVERVIEW.md`, `PRODUCT-VISION.md`, `SCOPE.md`, `GLOSSARY.md`.
- `docs/01-requirements/` — `FUNCTIONAL-REQUIREMENTS.md` (with IDs and inline acceptance criteria),
  `NON-FUNCTIONAL-REQUIREMENTS.md`.
- `docs/02-architecture/SYSTEM-ARCHITECTURE.md` — backend/frontend architecture, with Mermaid
  system-context, container, and module-boundary diagrams.
- `docs/03-decisions/` — an ADR index plus 12 ADRs for the decisions genuinely already made.
- `docs/04-design/` — `BUSINESS-RULES.md`, `API-SPECIFICATION.md`, `DATABASE-DESIGN.md` (proposed
  schema, clearly labelled, not implemented), `UI-UX-SPECIFICATION.md`.
- `docs/05-engineering/` — `CODING-STANDARDS.md`, `TESTING-STRATEGY.md`, `SECURITY-STANDARDS.md`,
  `CODE-REVIEW-STANDARDS.md` (doubles as the review template), `DOCUMENTATION-STANDARDS.md` (the
  synchronization rule and consolidation reasoning).
- `docs/06-delivery/` — `ROADMAP.md` (also serves as the implementation plan), `TASK-TRACKER.md`,
  this `PROGRESS.md`.
- `docs/07-operations/` — `DEVELOPMENT-SETUP.md` (moved, updated links and Nx section),
  `DEPLOYMENT-GUIDE.md` (planned direction), `TROUBLESHOOTING.md` (real issues from BC-002/002.1).
- `docs/08-quality/` — `RISK-REGISTER.md` (includes the unresolved BC-002.1 security findings),
  `TECHNICAL-DEBT.md`, `TEST-COVERAGE.md`.
- `docs/_templates/` — ADR, feature spec, implementation plan, task, and release-notes templates.
- `AGENTS.md` — rewritten as the canonical AI-agent entry point: what to read, the mandatory
  before/during/after-implementation workflow, and the documentation synchronization rule.
- `CLAUDE.md` — a concise entry point prepended before the existing Nx-generated block, which is
  preserved unchanged.
- `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`,
  `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md` — short,
  all pointing back to `AGENTS.md`/`docs/` rather than duplicating instructions.
- Root `README.md` — updated to point to `docs/README.md` as the canonical index.

### Deliberately not created

See [`docs/05-engineering/DOCUMENTATION-STANDARDS.md`](../05-engineering/DOCUMENTATION-STANDARDS.md#consolidation-decisions-made-in-bc-003)
for the full reasoning: no separate `PRODUCT-SRS.md`, `ACCEPTANCE-CRITERIA.md`,
`BACKEND-ARCHITECTURE.md`/`FRONTEND-ARCHITECTURE.md` split, `RELEASE-PLAN.md`, or
`BACKUP-RESTORE.md` — each would either duplicate another document or be an empty placeholder
today.

### Repository audit findings (Stage A)

- Confirmed BC-002.1 was committed locally as `13554d4`, not yet pushed, exactly as reported.
- `docs/` contained only `PROGRESS.md` and `DEVELOPMENT-SETUP.md` — no other documentation existed.
- `AGENTS.md` existed with coding/database/security/testing rules, but no pointer to a canonical
  documentation index (because none existed yet) and no explicit mandatory agent workflow beyond a
  short numbered list.
- `CLAUDE.md` and `.claude/settings.json` existed, auto-generated by `nx init` (official Nx↔Claude
  Code integration) — preserved as-is, with our own entry-point section added before the Nx block.
- No `.github/copilot-instructions.md`, PR template, or issue templates existed.
- No conflicts found between `AGENTS.md`'s existing rules and the new documentation — they were
  consistent, just not cross-referenced.

### Verification performed (Stage F)

| Check                         | Result                                                                                                                                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                | Passes (all 5 projects)                                                                                                                                                                              |
| `npm run typecheck`           | Passes (all 5 projects)                                                                                                                                                                              |
| `npm run test`                | Passes — API: 1, web: 1, validation: 3                                                                                                                                                               |
| `npm run build`               | Passes                                                                                                                                                                                               |
| `npx nx show projects`        | Unaffected — same 5 projects                                                                                                                                                                         |
| Markdown internal links       | Spot-checked after the `docs/PROGRESS.md` → `docs/06-delivery/PROGRESS.md` and `docs/DEVELOPMENT-SETUP.md` → `docs/07-operations/DEVELOPMENT-SETUP.md` moves; relative links in both files corrected |
| Dependency changes            | None — BC-003 is documentation-only; `package.json`/`package-lock.json` untouched                                                                                                                    |
| No application features added | Confirmed — no new source files under `apps/*/src` or `packages/*/src`                                                                                                                               |

### BC-003 completion status: **Complete.**

Committed locally as `3c0303e`; pushed to `origin/main` once BC-003.1 confirmed it was safe to do
so (see the BC-003.1 section below).

## BC-003.1 — Final documentation review, database design review, BC-004 preparation

Status: **Complete.**

### Part 1 — BC-003 final verification

Inspected `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, `.github/copilot-instructions.md`,
`docs/README.md`, all documentation directories, all 12 ADRs, `docs/04-design/DATABASE-DESIGN.md`,
and the delivery/quality tracking docs. Ran `git status`, `git log -5 --oneline`,
`git fetch origin`, and `git diff origin/main...HEAD --stat`.

Findings:

- All 12 ADRs have appropriate statuses (11 plain "Accepted"; ADR-0005 and ADR-0006 correctly
  qualified as "Accepted (decision made, not yet implemented)" / "Accepted (implementation
  planned)").
- Prisma is correctly marked planned, not implemented, everywhere it's mentioned.
- The proposed database design is clearly labelled "Proposed."
- `CLAUDE.md`'s Nx-generated block is preserved unchanged; no conflicting AI-agent instructions
  found between `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md`.
- `PROGRESS.md` history has not been rewritten — each `BC-xxx` section's original content is
  intact; this BC-003.1 section is purely additive.
- 0 broken internal documentation links (same automated check as BC-003, re-run).
- `git diff origin/main...HEAD --stat` showed exactly the 53 files from the BC-003 commit — no
  unexpected application or dependency changes.
- **One discrepancy found**: the task brief for BC-003.1 asked to read
  `docs/01-requirements/PRODUCT-SRS.md`. That file does not exist — BC-003 deliberately
  consolidated its content into `docs/00-project/PROJECT-OVERVIEW.md` and `SCOPE.md` (documented in
  `docs/05-engineering/DOCUMENTATION-STANDARDS.md`). No action taken; noted per "the repository
  wins" when a brief's assumed file list differs from actual state.

Verification commands and results (all re-run after this task's own changes, not just before):

| Command                | Result                               |
| ---------------------- | ------------------------------------ |
| `npm run format:check` | Pass                                 |
| `npm run lint`         | Pass (5/5 projects)                  |
| `npm run typecheck`    | Pass (5/5 projects)                  |
| `npm run test`         | Pass — API: 1, web: 1, validation: 3 |
| `npm run build`        | Pass                                 |
| `npx nx show projects` | Same 5 projects, unaffected          |

No genuine BC-003 corrections were needed.

### Part 2 — Database design review

Full review: [`../04-design/DATABASE-DESIGN-REVIEW.md`](../04-design/DATABASE-DESIGN-REVIEW.md).
Summary: the design is a correct high-level overview but is missing several entities explicitly
required by this review (an idempotency mechanism, a financial ledger, `payment_webhook_events`
and `refunds` in the diagram, `carts`/`cart_items` in the diagram, `stock_reservations` in the
diagram, `audit_logs` in the diagram), and has no column-level detail (keys, constraints, indexes)
anywhere in the repository yet. `DATABASE-DESIGN.md` was **not modified** beyond adding a link to
the review — per instruction, no design changes were made silently. Five decisions need
product-owner approval before BC-004 schema work begins (see the review's section 10).

### Part 3 — Single-command development environment investigation

Investigated whether `nx run-many -t dev` can work as a bare command (no `npm`/`npx` prefix) on
Windows. **Confirmed working**, using Nx's own documented global/local delegation behaviour:

```powershell
npm install -g nx@24.0.5   # one-time, matches this repo's pinned local version
```

Verified in this session:

- Before the install, a global `nx@23.1.0` already existed on this machine (from an earlier `nx
init` in BC-002.1) and the bare `nx show projects` command — run from inside the repository —
  already correctly delegated to the **local** pinned Nx (v24.0.5), returning the same 5 projects
  as `npx nx show projects`. It printed a cosmetic "time to update" nag because the global version
  was older than the local one.
- After `npm install -g nx@24.0.5` (matching the local version), `nx --version` reported
  `Local: v24.0.5` / `Global: v24.0.5` with no nag, and `nx show projects` returned the correct
  result.
- Confirmed via `git status` that this global install did **not** touch this repository's
  `package.json` or `package-lock.json` — only `docs/04-design/DATABASE-DESIGN-REVIEW.md` (new)
  and a link added to `DATABASE-DESIGN.md` were pending, both unrelated to the global install.
- Confirmed `@dropzo/web` and `@dropzo/api` already have an Nx-inferred `dev` target each (from
  their existing `"dev"` npm scripts), and that the shared packages (`shared-types`, `validation`,
  `api-client`) do **not** get a `dev` target, since they define no `dev` script — satisfying "do
  not create fake targets for shared libraries" without any extra configuration.
- **Did not run** `nx run-many -t dev` for real in this session — both existing `dev` scripts start
  long-running dev servers with no orchestration or Docker dependency yet, and actually starting
  them was out of scope for a verification task (and risked leaving unmanaged background processes,
  as already happened once in BC-002).

Conclusion: the bare `nx` command requirement is achievable with a one-time, per-machine global
install that does not affect the repository's pinned version. Full design for the orchestrated
`nx run-many -t dev` (Docker Compose dependency ordering, infrastructure project, etc.) is in
[`BC-004-IMPLEMENTATION-PLAN.md`](BC-004-IMPLEMENTATION-PLAN.md), Stage 8 — not implemented here,
per instruction.

### Part 4 — BC-004 preparation

Produced [`BC-004-IMPLEMENTATION-PLAN.md`](BC-004-IMPLEMENTATION-PLAN.md): 9 stages (Docker
Compose → Nx infrastructure project → Prisma installation → initial MVP-required schema →
migrations/seed → dev/test database separation → local backup/restore → unified `nx run-many -t
dev` → testing/verification), each with explicit dependencies on the previous stages. Schema work
(Stage 4) is explicitly blocked on approving the database review's open questions.

### Part 5 — Security and technical debt re-verification

Re-checked [`../08-quality/RISK-REGISTER.md`](../08-quality/RISK-REGISTER.md) and
[`../08-quality/TECHNICAL-DEBT.md`](../08-quality/TECHNICAL-DEBT.md): all three BC-002.1 findings
(`react-router-dom` production CVEs, `vite`/`vitest`/`esbuild` dev-tooling CVEs, Nx's nested
`minimatch` advisory) remain present and marked unresolved/open. **No dependency upgrades were
made in this task** — confirmed via `git diff` showing no changes to any `package.json` or
`package-lock.json`.

### Part 6 — Git and push

- Branch: `main`. Confirmed commit `3c0303e` contains BC-003 (`git log`, `git diff` both verified).
- Confirmed `origin/main` had not advanced unexpectedly — `git fetch origin` showed `13554d4` as
  the remote tip, exactly the expected baseline.
- Reviewed the full diff (`git diff origin/main...HEAD --stat`) before pushing.
- Pushed `main` to `origin` (fast-forward, no force) after this task's own BC-003.1 changes were
  committed. See the commit hash in this task's final report.

### BC-003.1 completion status: **Complete.**

## BC-003.2 — Database design corrections and implementation readiness review

Status: **Complete.** Documentation-only — no Prisma, migrations, Docker services, or application
code were introduced.

### What changed

The product owner approved 6 decisions resolving `DATABASE-DESIGN-REVIEW.md`'s open questions:
keep one canonical database file (no split); include a minimal financial ledger in the MVP;
include basic notifications/notification-device registration in the MVP (advanced automation
stays deferred); remove `store_locations` as a separate table (a store's location is a column on
`stores`); include every entity the review flagged as missing (carts, stock reservations, refunds,
payment webhook events, audit logs, idempotency records); and preserve all existing product
decisions (still one store per order, no microservices, no new infrastructure).

`docs/04-design/DATABASE-DESIGN.md` was rewritten in full as an implementation-ready
specification: every MVP-required table (38 of them) now has its columns, types, nullability,
defaults, keys, unique constraints, and indexes specified, plus the business rule it serves. The
previous high-level module-list version is superseded — not kept alongside it, per the "one
canonical file" decision.

Key corrections from the review that are now reflected:

- `stock_reservations`/`stock_reservation_items`, `carts`/`cart_items`, `refunds`,
  `payment_webhook_events`, and `audit_logs` are now fully specified and in the ERD (previously
  missing from the diagram, some missing from the document entirely).
- A new `ledger_entries` table provides the minimal financial ledger the review found missing —
  see its own section in `DATABASE-DESIGN.md` for the debit/credit model, what counts as a
  financial event, and how corrections are recorded (new offsetting entries, never edits).
- New `idempotency_records` and `outbox_events` tables close the idempotency/reliable-async-
  processing gap the review flagged against NFR-API-001.
- `notifications`/`notification_devices` are now included, scoped to "basic record and device
  registration only" per the approved decision — not a notification automation system.
- `store_locations` is removed; `stores.location` (a `GEOGRAPHY(POINT, 4326)` column) is the
  single source of a store's location, resolving the review's finding #1.
- `stock_batches` was reclassified from "MVP optional" (in the review) to **MVP-required** in this
  revision — dairy and bakery items are in the day-one catalogue per `docs/00-project/SCOPE.md`,
  so batch/expiry tracking is needed immediately, not deferred.
- Coupons/redemptions remain the only tables classified **Future extension** — consistent with
  `SCOPE.md`'s existing deferral of promotions/dynamic pricing.

`docs/04-design/DATABASE-DESIGN-REVIEW.md` was **not rewritten** — a short "Resolved" note was
added at its top pointing to this section and the new design, while its original findings remain
intact as the historical record of the review itself.

### ADR review

Reviewed all 12 ADRs against the approved decisions. **No conflicts found, no ADR amendment or
new ADR needed.** Specifically: the financial ledger, notification tables, and additional
reliability tables (idempotency, outbox) are implementation details within the already-accepted
modular-monolith and PostgreSQL/Prisma decisions ([ADR-0001](../03-decisions/ADR-0001-modular-monolith.md),
[ADR-0005](../03-decisions/ADR-0005-postgresql-database.md),
[ADR-0006](../03-decisions/ADR-0006-prisma-orm-planned.md)), not architectural changes. Removing
`store_locations` doesn't touch any ADR — it was never itself the subject of one. One store per
order ([ADR-0008](../03-decisions/ADR-0008-one-store-per-order-mvp.md)), merchant-owned inventory
([ADR-0007](../03-decisions/ADR-0007-merchant-owned-inventory-launch.md)), COD-first
([ADR-0009](../03-decisions/ADR-0009-cod-first-payments.md)), and pickup/manual delivery
([ADR-0010](../03-decisions/ADR-0010-pickup-manual-delivery.md)) are all still fully reflected in
the revised schema.

### BC-004 plan updated

`docs/06-delivery/BC-004-IMPLEMENTATION-PLAN.md` Stage 4 now lists the actual 38 MVP-required
tables from the finalized design (previously a shorter, pre-decision list), and the plan's header
now states explicitly that Prisma implementation additionally needs its own
schema-implementation review (translating a design document to Prisma syntax can introduce its
own mistakes) before migrations are generated — this is a new gate, not yet satisfied. The unified
`nx run-many -t dev` command, Docker Compose/health-check approach, and Windows PowerShell
verification steps from BC-003.1 are preserved unchanged in Stages 1, 2, 8, and 9.

### Documentation verification

| Check                                                        | Result                                                                                                                            |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check`                                       | Pass                                                                                                                              |
| `npm run lint`                                               | Pass (5/5 projects)                                                                                                               |
| `npm run typecheck`                                          | Pass (5/5 projects)                                                                                                               |
| `npm run test`                                               | Pass — API: 1, web: 1, validation: 3                                                                                              |
| `npm run build`                                              | Pass                                                                                                                              |
| Internal documentation links                                 | 0 broken (same automated check as BC-003/BC-003.1)                                                                                |
| Mermaid fences                                               | Balanced in `DATABASE-DESIGN.md` (1 open, 1 close)                                                                                |
| Application code / package files / dependencies / migrations | **Unchanged** — confirmed via `git diff`: no `package.json`, `package-lock.json`, or `apps/*/src`, `packages/*/src` files touched |

### Remaining unresolved decisions

None from this task's own scope — all 6 approved decisions were applied. Two smaller items remain
open for whoever implements BC-004, not requiring a decision now:

- The exact Prisma `relationMode` / referential-action choices (`onDelete`, `onUpdate`) per
  relationship aren't specified at the Prisma-syntax level yet — intentionally left to Stage 4's
  own implementation, since that's a Prisma-specific detail, not a database-design decision.
- A formal data-retention/deletion policy (flagged in `DATABASE-DESIGN.md`'s "Critical integrity
  rules") is explicitly out of this task's scope and belongs with the authentication/privacy task.

### BC-003.2 completion status: **Complete.**

Not committed and not pushed — reporting these results first, as instructed. See the working-tree
state below.

Do not start BC-004 implementation. Do not implement Prisma, migrations, or application code from
this task.

_(Update: these BC-003.2 changes were subsequently approved, committed as `ac18834`, and pushed —
see the BC-003.3 section below.)_

## BC-003.3 — Database design corrections and final review

Status: **Complete.** Documentation-only — no Prisma, SQL migrations, database infrastructure, or
application code were introduced.

### Why this task existed

An independent schema review of the BC-003.2 `DATABASE-DESIGN.md` found that, while complete at
the entity level, it had real technical gaps: the financial ledger could not guarantee balanced
accounting, stock reservations didn't reference batches (undermining FEFO and risking double-
counted stock), reservation ownership relied on a comment rather than a constraint, there was no
payment history, order snapshots were incomplete, idempotency keys were scoped too broadly,
`settlement_items` conflated a commission rate with a commission amount, service-zone/delivery
eligibility was unspecified, and the outbox had no worker-claiming or retry model. All of these
are now corrected.

### Every correction made

1. **Financial ledger redesigned for guaranteed balance.** Replaced the single `ledger_entries`
   table with `financial_accounts` (a small, fixed chart of accounts: one `MERCHANT_PAYABLE` per
   merchant, plus platform-level commission/delivery-revenue/COD-clearing/cash accounts),
   `ledger_transactions` (groups entries that must balance), and a redesigned `ledger_entries`
   (journal lines). Balance is enforced by a documented deferred constraint trigger, not merely a
   convention — see "Financial accounting model" in `DATABASE-DESIGN.md`.
2. **Batch-level stock allocation.** `stock_reservation_items` now has a `batch_id` column.
   `store_products.uses_batch_tracking` makes explicit whether a listing's stock lives in
   `stock_batches` or in `inventory`'s own counters — never both, which is what prevents double
   counting. FEFO allocation order (`expiry_date ASC NULLS LAST`), batch-level locking, and exactly
   how receiving/reserving/releasing/selling/damage/expiry movements affect batch and aggregate
   counters are now fully specified in "Inventory and FEFO allocation."
3. **Reservation integrity is now DB-enforced, not just commented.** Added
   `CHECK (num_nonnulls(cart_id, order_id) = 1)` and two partial unique indexes (at most one active
   reservation per cart, per order). Added `consumed_at`/`released_at` timestamps with `CHECK`
   constraints tying them to `status`, so a reservation cannot be consumed or released twice. A
   full lifecycle (cart-held → order-held → consumed/released, with exactly when each transition
   happens) is documented in "Reservation lifecycle."
4. **Payment history added.** New `payment_status_history` table, append-only, mirroring
   `order_status_history` (old/new status, actor, source, reason, timestamp). `payments.updated_at`
   now documented as "latest state only — see this table for the trail."
5. **Order snapshots expanded.** `order_items` gained `sku_snapshot` and per-line `tax_amount`.
   `orders` gained `store_name_snapshot`, `store_address_snapshot`,
   `delivery_recipient_name_snapshot`, `delivery_recipient_phone_snapshot`, and a full
   `delivery_address_snapshot` (JSONB) — all frozen at order time. `delivery_address_id` remains
   for traceability only and is explicitly documented as "never read for display."
6. **Idempotency keys rescoped.** `orders.idempotency_key` changed from a bare global unique
   column to `UNIQUE (customer_id, idempotency_key)`. `idempotency_records` gained `scope` and
   `user_id` columns, with its unique constraint changed to `(scope, user_id, idempotency_key)`.
   Full request-handling behaviour (same key + same payload, same key + different payload,
   concurrent requests, `IN_PROGRESS`/`COMPLETED`/`FAILED` handling, expiry) is specified in
   "Idempotency rules," including why `idempotency_records`, `orders.idempotency_key`, and
   `payments.idempotency_key` are deliberately layered, not redundant.
7. **Settlement precision corrected.** `settlement_items` gained `commission_rate_applied` (the %
   used) as a column distinct from `commission_amount` (the ₹ result) — previously only the amount
   existed, risking confusion between the two. `settlement_items.order_id` is now `UNIQUE` on its
   own (not just part of a composite key), so an order can never appear in two settlements.
8. **Service zones and delivery eligibility specified.** A new section defines the MVP approach
   (radius check within an active zone, with `service_zones.max_delivery_radius_km` as a fallback
   until `boundary` polygons are mapped) and documents the PostGIS extension prerequisite and its
   provider-specific migration implications.
9. **Outbox redesigned for reliable, claim-based processing.** `outbox_events` gained `attempt_count`,
   `max_attempts`, `next_attempt_at`, `claimed_by`, `locked_until`, and a `DEAD` terminal status.
   The claiming pattern (`SELECT ... FOR UPDATE SKIP LOCKED`), retry/backoff, crash recovery, and
   duplicate-delivery protection are specified in "Outbox and notification reliability" — no
   Kafka, Redis, or microservices, as required.
10. **`ON DELETE` behaviour specified.** Documented a default of `RESTRICT` for every foreign key,
    with `cart_items` and `stock_reservation_items` as the only `CASCADE` exceptions (both are
    meaningless without their parent row).
11. **Prisma Implementation Readiness Checklist added** — a new, required closing section in
    `DATABASE-DESIGN.md` covering schema completeness, relations/referential actions, PostgreSQL
    extensions, constraints needing hand-written SQL, transaction boundaries, inventory
    concurrency, financial balancing, index verification, and migration/rollback considerations.

None of these corrections changed any existing product decision.

### Revised table inventory

41 MVP-required tables (up from 38 in BC-003.2 — net +3: `financial_accounts`,
`ledger_transactions`, and `payment_status_history` are new; `ledger_entries`, `settlements`, and
`settlement_items` were already counted and are now corrected in place). 2 tables remain classified
**Future extension** (`coupons`, `coupon_redemptions`), unchanged. Full table with purpose for each
is in `DATABASE-DESIGN.md`'s "Table inventory and classification."

### Updated ERD

The Mermaid ERD in `DATABASE-DESIGN.md` now includes `financial_accounts`, `ledger_transactions`,
`payment_status_history`, and the `stock_batches` ↔ `stock_reservation_items` relationship that was
previously missing. No undocumented entities either direction.

### Financial accounting model

See `DATABASE-DESIGN.md`'s dedicated section. Summary: a small fixed chart of accounts
(`financial_accounts`), balanced journal transactions (`ledger_transactions` +
redesigned `ledger_entries`), explicit posting points (COD recognised at order `COMPLETED`; online
payment, when it ships, recognised at `CAPTURED`), proportional partial-refund reversal, and
correction-via-reversal (never edits to a posted entry). Merchant outstanding balance and
settlement reconciliation are both always derived from the ledger, never a separately-maintained
counter that could drift.

### Batch-level inventory and FEFO design

See `DATABASE-DESIGN.md`'s "Inventory and FEFO allocation." Summary: batch-tracked listings
allocate `expiry_date ASC NULLS LAST` under row locks; non-batch-tracked listings never have
`stock_batches` rows at all — this split is what prevents double-counting the same physical stock.
A table distinguishes what PostgreSQL can enforce (quantity `CHECK`s, reservation ownership/
uniqueness) from what remains application responsibility (aggregate sync between `inventory` and
its batches, FEFO ordering, lock-based concurrency).

### Payment and order history improvements

`payment_status_history` (new) and the expanded `orders`/`order_items` snapshot columns (see
correction #5 above) — both summarized there, not repeated here.

### Idempotency and concurrency rules

See `DATABASE-DESIGN.md`'s "Idempotency rules" for the full decision table (same key/same payload,
same key/different payload, concurrent requests, status handling, expiry) and "Inventory and FEFO
allocation" / "Reservation lifecycle" for concurrency (row locking, lock ordering to avoid
deadlocks).

### Refund and settlement rules

See `DATABASE-DESIGN.md`'s "Refunds and settlements": COD vs. online refunds, partial vs. full,
maximum refundable amount, initiation vs. completion, settlement eligibility, and the two
independent duplicate-inclusion guards (`settlement_items.order_id UNIQUE`,
`ledger_entries.settlement_id IS NULL` as the selection filter).

### ADR review

Reviewed all 12 ADRs against these corrections. **No conflicts found, no amendment or new ADR
needed** — the financial-accounting model, batch-level inventory, reservation constraints, and
outbox design are all implementation detail within already-accepted decisions
([ADR-0001](../03-decisions/ADR-0001-modular-monolith.md),
[ADR-0005](../03-decisions/ADR-0005-postgresql-database.md),
[ADR-0006](../03-decisions/ADR-0006-prisma-orm-planned.md)), not new architecture. The explicit
"no Kafka, Redis, or microservices" requirement for the outbox is consistent with, not a departure
from, ADR-0001.

### BUSINESS-RULES.md corrected

Found and fixed one real contradiction: `BUSINESS-RULES.md` listed perishable batch/FEFO tracking
as "deferred until perishables are prioritised," which contradicted `DATABASE-DESIGN.md`'s
classification of `stock_batches` as MVP-required (dairy/bakery are in the day-one catalogue).
Corrected, and added three new rows reflecting the financial-ledger balance requirement, the
idempotency-key scoping rule, and the address-snapshot immutability rule — all cross-referencing
`DATABASE-DESIGN.md` rather than duplicating its detail.

### BC-004 plan updated

Stage 4 now lists all 41 finalized tables and explicitly points to the new "Prisma Implementation
Readiness Checklist" as the gate, replacing the vaguer "needs its own review" language from
BC-003.2. The header now states the full history of both review rounds.

### Documentation verification

| Check                                                                               | Result                                                                                                                                                |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check`                                                              | Pass                                                                                                                                                  |
| `npm run lint`                                                                      | Pass (5/5 projects)                                                                                                                                   |
| `npm run typecheck`                                                                 | Pass (5/5 projects)                                                                                                                                   |
| `npm run test`                                                                      | Pass — API: 1, web: 1, validation: 3                                                                                                                  |
| `npm run build`                                                                     | Pass                                                                                                                                                  |
| Internal documentation links                                                        | 0 broken                                                                                                                                              |
| Mermaid fences                                                                      | Balanced in `DATABASE-DESIGN.md`                                                                                                                      |
| Application code / package files / dependencies / migrations / infrastructure files | **Unchanged** — confirmed via `git diff`: no `package.json`, `package-lock.json`, `apps/*/src`, `packages/*/src`, or `infrastructure/*` files touched |

### Remaining unresolved decisions

None invented. Two items are explicitly left as open, documented questions rather than silent
assumptions:

- The exact Prisma `relationMode`/referential-action syntax is intentionally left to BC-004's own
  implementation (a Prisma-specific detail, not a database-design decision).
- A formal data-retention/deletion policy remains out of scope, flagged for the future
  authentication/privacy task (unchanged from BC-003.2).

### BC-003.3 completion status: **Complete.**

Not committed and not pushed — reporting these results first, per instruction. See the
working-tree state below.

Do not start BC-004 implementation. Do not implement Prisma, migrations, or application code from
this task.

_(Update: these BC-003.3 changes were subsequently approved, committed as `13bd139`, and pushed —
see the BC-003.4 section below.)_

## BC-003.4 — Final database finalization (one-time comprehensive review)

Status: **Complete. Database design review is now closed.**

### Why this task existed

A final, comprehensive review of the complete BC-003.3 design — not limited to re-checking the
three headline BC-003.3 findings — was commissioned to either close database design review
entirely or identify a genuine implementation blocker. It found five further, real defects.

### Every defect found and its resolution

1. **`financial_accounts` platform-account uniqueness was actually broken.** PostgreSQL treats
   every `NULL` as distinct from every other `NULL` in an ordinary `UNIQUE` constraint, so the
   BC-003.3 `UNIQUE (account_type, merchant_id)` constraint did **not** prevent two
   `PLATFORM_CASH` (or any other platform-level) rows from both existing with
   `merchant_id = NULL` — a real, demonstrable bug, not a style nitpick. **Resolution**: kept the
   composite unique (correct for merchant-owned accounts, where `merchant_id` is never null), and
   added a partial unique index, `UNIQUE (account_type) WHERE merchant_id IS NULL`, which correctly
   enforces "exactly one of each platform-level account type."
2. **Settlement reconciliation had no worked example and no failed-payout procedure.**
   **Resolution**: added a full numeric example (order → ledger entries → settlement generation →
   payout, with the exact `settlement_id` tagging that prevents double-counting), explicit
   partial-settlement handling (untouched entries simply roll into the next period), and explicit
   failed-payout handling (the amount re-enters the outstanding balance via an
   `OR settlement.status = 'FAILED'` clause, without altering any historical row).
3. **The outbox/notification design didn't address the FCM delivery guarantee.** A PostgreSQL
   transaction cannot atomically commit an external Firebase Cloud Messaging call, so a worker can
   crash between sending a push and recording that it sent it. **Resolution**: explicitly
   documented that database event processing is idempotent (via the new
   `notifications.source_outbox_event_id` unique column) but external push delivery is
   at-least-once and can duplicate — with `notifications.id` as the stable client-side dedup key
   sent in the push payload, which is the standard, proportional mitigation (not a database-level
   fix, since none exists for this class of problem without a distributed transaction).
4. **FEFO batch-locking order wasn't fully deadlock-safe.** Locking batches in `expiry_date` order
   alone isn't a deterministic _global_ order if two batches share an expiry date. **Resolution**:
   added an `id` tiebreaker to the lock-acquisition order, and stated a global rule (always lock
   `inventory` before its `stock_batches`, never the reverse) explicitly.
5. **The ER diagram omitted five tables** (`service_zones`, `categories`, `audit_logs`,
   `idempotency_records`, `outbox_events`) while the document claimed none were omitted — a real
   internal-consistency defect. **Resolution**: added every genuine foreign-key relationship these
   tables have (`categories` ↔ `products` and self; `audit_logs`/`idempotency_records` ↔ `users`
   via `actor_user_id`/`user_id`; `outbox_events` ↔ `notifications` via the new
   `source_outbox_event_id`), and corrected the document's claim to be accurate:
   `service_zones` has no foreign-key relationship by design (delivery eligibility is computed at
   query time, not stored as a FK) and is explicitly called out as the one intentionally
   unconnected table, rather than silently missing.

None of these corrections changed any existing product decision, and the MVP-required table count
remains 41 (no tables added or removed — only `notifications` gained one new column,
`source_outbox_event_id`, and `settlements` gained `paid_at`/`failed_at`).

### Platform-account uniqueness, settlement reconciliation, and outbox delivery — explained

See defects #1, #2, and #3 above for the full explanation of each, as specifically requested.

### ADR review

Reviewed all 12 ADRs again against these five corrections. **No conflicts, no amendment or new ADR
needed** — a partial unique index, a worked accounting example, an external-delivery disclosure,
and a lock-ordering clarification are all implementation detail within already-accepted decisions,
not new architecture.

### Documentation synchronization

- `docs/04-design/DATABASE-DESIGN.md`: all five corrections applied in place; a new "Change log for
  this revision (BC-003.4 — final)" section added above the existing BC-003.3 change log (renamed
  "Change log for the BC-003.3 revision" to disambiguate); status line changed to "Finalized for
  BC-004 (BC-003.4)."
- `docs/04-design/DATABASE-DESIGN-REVIEW.md`: resolution note extended to mention BC-003.4 and the
  closed status; original review findings untouched.
- `docs/06-delivery/BC-004-IMPLEMENTATION-PLAN.md`: status changed to "Ready to begin"; Stage 4's
  custom-SQL list expanded with the two new partial indexes; Stage 9 expanded with concrete
  database integrity/concurrency tests and explicit Stage-4 acceptance criteria (both were missing
  before this task).
- `docs/06-delivery/TASK-TRACKER.md`, `ROADMAP.md`: BC-003.4 entry added; BC-004 status changed
  from Backlog to **Ready**.
- `docs/04-design/BUSINESS-RULES.md`: not changed in this task — the BC-003.3 pass already
  resolved its one real contradiction, and none of this task's five corrections touch
  business-rule-level statements (they're schema/implementation-detail corrections).

### Final verification

| Check                                                                               | Result                                                                    |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm run format:check`                                                              | Pass                                                                      |
| `npm run lint`                                                                      | Pass (5/5 projects)                                                       |
| `npm run typecheck`                                                                 | Pass (5/5 projects)                                                       |
| `npm run test`                                                                      | Pass — API: 1, web: 1, validation: 3                                      |
| `npm run build`                                                                     | Pass                                                                      |
| Internal documentation links                                                        | 0 broken                                                                  |
| Mermaid fences                                                                      | Balanced in `DATABASE-DESIGN.md`                                          |
| ERD completeness (every FK-connected table present)                                 | Verified — see defect #5 resolution                                       |
| Application code / package files / dependencies / migrations / infrastructure files | **Unchanged** — confirmed via `git diff`: nothing outside `docs/` touched |

### Schema consistency checks (requested explicitly)

- Table inventory count re-verified programmatically against the document: 41 MVP-required rows,
  2 future-extension rows — unchanged from BC-003.3.
- Every table with a foreign-key relationship appears in the ERD (verified by diffing the entity
  list in the diagram against the full table inventory — see defect #5).
- The worked settlement example's numbers reconcile exactly (400 gross − 32 commission = 368 net;
  merchant account nets to 0 after payout).
- No remaining stale references to superseded terms (`remaining_quantity`, bare global idempotency
  keys, etc.) found via a repository-wide grep.

### No critical unresolved blocker

No genuinely important business decision was encountered that couldn't be safely inferred from
approved requirements and established PostgreSQL/accounting/inventory practice. The two previously
flagged open items remain explicitly deferred (not blockers): exact Prisma `relationMode` syntax
(a BC-004 implementation detail) and a formal data-retention/deletion policy (belongs with the
future authentication/privacy task).

### BC-003.4 completion status: **Complete. Database design review is closed.**

Not committed and not pushed — reporting these results first, per instruction.

BC-004 is ready to begin, pending your explicit go-ahead. Do not implement Prisma, migrations, or
application code from this task.

## BC-004 — Database and development infrastructure

Status: **Implemented; live database verification in progress** (see "Live verification" below).

### What was built

- **Docker Compose infrastructure**: [`infrastructure/docker/docker-compose.yml`](../../infrastructure/docker/docker-compose.yml)
  (`postgis/postgis:16-3.4`, a named volume, a `pg_isready` healthcheck), plus
  [`infrastructure/docker/init/01-create-test-database.sh`](../../infrastructure/docker/init/01-create-test-database.sh)
  (creates the separate `dropzo_test` database on first init) and
  [`infrastructure/docker/.env.example`](../../infrastructure/docker/.env.example).
- **Nx `infrastructure` project**: [`infrastructure/project.json`](../../infrastructure/project.json)
  with `dev` (`docker compose up -d --wait`), `down`, `status` targets — no fake build/test/lint
  targets.
- **`nx run-many -t dev` orchestration**: `apps/api/package.json`'s `dev` target now declares
  `dependsOn: [{ target: "dev", projects: ["infrastructure"] }]` (via its `nx.targets` override),
  so the API waits for Postgres to report healthy before starting; the web app has no such
  dependency (starts immediately, shows "backend unreachable" per its existing BC-002 health-check
  UI if the API isn't up yet). Verified via `npx nx show project api --json` that the dependency is
  registered correctly (shown below).
- **Prisma + NestJS integration**: `apps/api/prisma/schema.prisma` (41 models), a NestJS-managed
  `PrismaService`/`PrismaModule` (`apps/api/src/prisma/`) with connect-on-init/disconnect-on-
  destroy lifecycle, and `DATABASE_URL` made required in `apps/api/src/config/env.validation.ts`
  (previously optional).
- **Least-privilege runtime role**: the initial migration creates a restricted `dropzo_app`
  Postgres role (SELECT/INSERT/UPDATE/DELETE on all tables, with UPDATE/DELETE explicitly revoked
  on `ledger_transactions`/`ledger_entries`). `PrismaService` connects via `APP_DATABASE_URL`
  (falling back to `DATABASE_URL`), so the running API never has the ledger-mutation privilege
  that migrations (run as the Postgres superuser, which becomes the table owner) need — PostgreSQL
  never restricts a table's owner via `REVOKE`, so this separation is what makes the design
  document's "no UPDATE/DELETE grants" requirement actually effective, not merely cosmetic.
- **Initial migration**: `apps/api/prisma/migrations/20261107120000_init/migration.sql`.
  Generated via `prisma migrate diff --from-empty --to-schema-datamodel=prisma/schema.prisma
--script` (no live database needed for this step), then hand-extended with every item from
  `DATABASE-DESIGN.md`'s Prisma Implementation Readiness Checklist: `pgcrypto`/`postgis`
  extensions; every CHECK constraint named in the table specifications (store_products,
  inventory, stock_batches, cart_items, stock_reservations ×3, stock_reservation_items, orders,
  order_items, refunds, financial_accounts, ledger_entries ×2); the two `stock_reservations`
  partial unique indexes; the `financial_accounts` platform-account partial unique index; the
  `ledger_entries` unsettled-balance partial index; GIST indexes on `stores.location` and
  `user_addresses.location`; a GIN full-text index on `products.name`; the ledger balance
  `CONSTRAINT TRIGGER ... INITIALLY DEFERRED`; and the `dropzo_app` role/grants/revokes above.
- **Deterministic seed**: `apps/api/prisma/seed.ts` — the platform chart of accounts (4 rows, no
  ledger entries, so no risk of an unbalanced transaction), one service zone, two categories, two
  products/variants, one merchant with its `MERCHANT_PAYABLE` account, one store, two store
  listings (one batch-tracked with an expiry-dated batch, one counter-based), and two users. Every
  write is an upsert (or a raw-SQL `INSERT ... ON CONFLICT DO NOTHING` for `stores`, whose required
  `GEOGRAPHY` column Prisma Client cannot write at all) — safe to rerun.
- **Integration/concurrency test suite** (`apps/api/test/`, a separate Jest config/`tsconfig.json`
  from the unit-test suite, run via `npm run test:integration -w apps/api`): schema integrity (all
  41 tables present, FK/unique/CHECK/partial-index rejections), the full financial ledger (balanced
  accepted, unbalanced rejected at commit time, the exact worked settlement example from
  `DATABASE-DESIGN.md` reproduced to zero outstanding balance, a reversal that never edits the
  original rows, and a dedicated test proving the `dropzo_app` role genuinely cannot `UPDATE`/
  `DELETE` ledger rows), inventory concurrency (CHECK-enforced non-negative stock, FEFO ordering
  with an expiry-date tiebreaker, exhausted-batch fallthrough, and two concurrent transactions
  racing for the last unit of stock — exactly one succeeds), order/payment idempotency (scoped
  `(customer_id, idempotency_key)`, webhook `(provider, provider_event_id)` dedup, append-only
  payment status history), and outbox/notification reliability (`source_outbox_event_id` dedup,
  two concurrent `SKIP LOCKED` claims never overlapping). A small test-only helper
  (`apps/api/test/helpers/reservation.ts`) implements the FEFO locking procedure exactly as
  `DATABASE-DESIGN.md` describes it, purely so these tests can exercise real transactional
  behavior — it is not a NestJS service, controller, or API endpoint; the actual checkout feature
  remains a separate, future task per `TASK-TRACKER.md`.
- **CI**: `.github/workflows/ci.yml` — format, lint, typecheck, unit tests, `prisma validate`,
  `prisma migrate deploy`, the integration suite, and production builds, against a real
  `postgis/postgis` service container on every push/PR.
- **Backup/restore**: `scripts/db-backup.mjs`/`db-restore.mjs` (shell out to the container's own
  `pg_dump`/`pg_restore`), documented in the new
  [`docs/07-operations/DATABASE-BACKUP-RESTORE.md`](../07-operations/DATABASE-BACKUP-RESTORE.md).
- **Documentation sync**: `DEVELOPMENT-SETUP.md` (full database setup workflow, Docker/WSL2
  caution note, CI section), `BC-004-IMPLEMENTATION-PLAN.md` (status), `TASK-TRACKER.md`,
  `ROADMAP.md`, ADR-0005/ADR-0006 (status: implemented), `RISK-REGISTER.md`/`TECHNICAL-DEBT.md`
  (TD-002 and TD-005 resolved at the appropriate level; new TD-006/RISK-008 tracked honestly rather
  than hidden), `docs/README.md`.

### Exact count of implemented MVP tables

**41 of 41**, verified three ways: (1) `docs/04-design/DATABASE-DESIGN.md`'s own table-inventory
list has exactly 41 `MVP-required` rows (counted programmatically); (2) `schema.prisma` has exactly
41 `model` blocks, one per table, each `@@map`-ped to that table's exact name; (3) the generated
migration's `CREATE TABLE` statements were diffed against the same list. `coupons`/
`coupon_redemptions` are not modelled, as required.

### Scope boundaries respected

No application feature (cart, checkout, auth) was implemented. No business rule was changed. The
approved schema was followed column-for-column; the one place I nearly deviated — giving
`financial_accounts.merchant_id` a standalone `@unique` for a cleaner Prisma one-to-one relation —
was caught via a reading of the generated SQL against the document (which specifies only the
composite unique and the partial platform-account index) and corrected before it reached the
migration. `DATABASE-DESIGN.md` itself was not changed; the BC-003.4 review remains closed.

### Live verification

Two independent environment blockers were found and worked through during this task, on the
machine it was built on:

1. **Docker Desktop's Linux engine could not start.** `docker info` returned a 500 error on the
   `dockerDesktopLinuxEngine` pipe. Investigation (`wsl --status`) found WSL was not installed.
   After WSL was installed mid-task, the real blocker surfaced: **hardware virtualization is not
   enabled in this machine's firmware** (`wsl --status`: "WSL2 is unable to start since
   virtualization is not enabled on this machine... enable it in your computer's firmware
   settings"). This requires a BIOS/UEFI-level change and a reboot - outside what any software in
   this repository, or this session, can do. Docker-based verification (`nx run infrastructure:dev`
   end to end) was not completed for this reason.
2. **A separate, pre-existing native PostgreSQL 17 Windows service** (unrelated to this project,
   already running on port 5432 for other local work) was identified as an alternative real-Postgres
   target. Its superuser credentials were supplied by the product owner. It was missing the PostGIS
   extension (`pg_available_extensions` had no `postgis` row - only `pgcrypto`), which the schema's
   `stores`/`user_addresses`/`service_zones` geography columns require; the migration's first
   statements would fail immediately without it. Installing PostGIS via the instance's own Stack
   Builder tool was in progress at the time of this report.

No pre-existing database on that native instance was touched - verification used only newly
created `dropzo`/`dropzo_test` databases and a new `dropzo_app` role, never `tenon-dev-local`,
`tenon_dev_local`, `tenon_local_dev`, `tenon_admin_dev`, or `digidna_mcp`.

**What was verified without a live database** (all of these completed and pass): `prisma format`,
`prisma validate` (schema is syntactically and referentially valid), `prisma migrate diff
--from-empty` (the exact DDL Prisma would generate, inspected statement-by-statement against
`DATABASE-DESIGN.md`), TypeScript compilation of the schema-consuming code (`PrismaService`, the
seed script, and the entire integration test suite - all type-check cleanly against the generated
Prisma Client), and the full existing check suite (`format:check`, `lint`, `typecheck`, `test`,
`build` - all pass, 0 regressions from the 36 new/changed files). A careful re-read of every
integration test against the schema it exercises caught and fixed one real bug before it could
cause confusing failures: several `inventory-concurrency.integration-spec.ts` cases called the FEFO
reservation helper with no owning cart, which would have violated `stock_reservations`'s
`num_nonnulls(cart_id, order_id) = 1` CHECK constraint - fixed to create and pass a real cart (a
distinct one per concurrent actor, so the "last unit" race tests the stock constraint, not the
reservation-uniqueness constraint).

**Not yet verified**: actually applying the migration to a live Postgres, running the seed, and
running the integration/concurrency test suite against real data and real locking behavior. This
repository's own CI (`.github/workflows/ci.yml`) will do exactly this, against a real
`postgis/postgis` service container with no environment-specific blockers, on the first push.

### Security review finding, fixed

An automated security review flagged `CREATE ROLE dropzo_app LOGIN PASSWORD 'dropzo_app_dev_only'`
in the initial migration as a hardcoded credential (HIGH). Unlike `docker-compose.yml`'s dev-only
defaults, a migration is applied byte-for-byte in every environment (local, CI, and eventually
production), so a credential baked into it is a real risk, not local-dev noise. Fixed: the
migration now creates `dropzo_app` with `LOGIN` and no password (unable to authenticate until one
is set); a new `scripts/set-app-role-password.mjs` (wired as `npm run prisma:set-app-password[:test]
-w apps/api`) sets it per environment from `APP_DATABASE_URL` - the one place the password is
configured. `ci.yml` and `DEVELOPMENT-SETUP.md` updated to run this step after each migration.

### Second security review finding, fixed

A follow-up automated review of the pushed migration flagged (MEDIUM) that the balance trigger's
`IF TG_OP = 'DELETE' ... ELSE NEW.transaction_id` logic only checked `NEW.transaction_id` on
UPDATE, never `OLD.transaction_id` - if a row's `transaction_id` were ever changed, the old
transaction's now-altered balance would go unchecked. Fixed two ways: (1) the balance trigger now
checks both `OLD` and `NEW` transaction IDs whenever they differ; (2) new `BEFORE UPDATE` triggers
on both ledger tables make the design document's own stated invariant - a posted
`ledger_transactions` row is never updated at all, and a posted `ledger_entries` row may only ever
have `settlement_id` changed (the one sanctioned exception, for settlement tagging) - a hard
database rule, not just application discipline or the `dropzo_app` REVOKE (which only restricts
the application's own role, not whatever process performs settlement tagging).
