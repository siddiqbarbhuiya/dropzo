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

## BC-004 — Final verification, CI remediation and closure (remediation pass)

Status: **Defects fixed; live CI verification not yet re-run (not committed/pushed per this
task's own instruction).**

### Git and CI state at the start of this task

- Branch `main`, HEAD `8e5e561`, working tree clean, `origin/main` in sync.
- Both published CI runs had **failed**:
    - Run #1 (`264eebc`, `https://github.com/siddiqbarbhuiya/dropzo/actions/runs/42359532048`):
      failed at "Prisma schema validation".
    - Run #2 (`8e5e561`, `https://github.com/siddiqbarbhuiya/dropzo/actions/runs/42360302835`):
      **also failed**, at the same step - confirmed by reading its actual log, not assumed.
- The user signed in to GitHub in the session's browser pane so the actual step logs (not just the
  "Process completed with exit code 1" annotation) could be read.

### Root cause of the CI failure (from the actual log, not guessed)

Run #1's "Prisma schema validation" log showed `dotenv`'s own usage text
(`Usage: dotenv run [...] -f|--file <paths> [--] <command>`), not `dotenv-cli`'s
(`Usage: dotenv [...] [-e <path>] [...]`) - meaning the `dotenv` command every
`apps/api/package.json` script invoked (`dotenv -e ../../.env -- prisma validate`) was **not**
resolving to the intended `dotenv-cli` package. `npm ls dotenv` explained why: `@nestjs/config`
depends directly on `dotenv@18.0.3`, which (as of its own CLI rewrite) also ships a binary
literally named `dotenv` - the exact same name `dotenv-cli@8.0.0` registers. Both packages are
legitimate, necessary dependencies; this is a genuine npm bin-name collision, and which one wins
the `node_modules/.bin/dotenv` symlink is install-order-dependent - it happened to resolve
differently in CI's clean `npm ci` than in prior local testing.

### Defects fixed

1. **The dotenv bin collision** (root cause above): every `apps/api/package.json` script changed
   from `dotenv -e <file> -- <command>` to `node ../../node_modules/dotenv-cli/cli.js -e <file> --
<command>` - invoking the intended package by its exact file path, never by the ambiguous
   `dotenv` command name. Reproduced locally (a clean reinstall briefly hit the exact same
   collision after an unrelated `npm ci` interruption) and confirmed the fix resolves it.
2. **Invalid seed UUIDs.** Every hardcoded ID in `apps/api/prisma/seed.ts`
   (`...z001`, `...p001`, `...p002`, `...m001`, `...s001`, `...b001`) contained non-hex characters
   invalid for PostgreSQL's `uuid` type. Replaced with pure-hex, deterministic, distinct IDs
   (`...0001`, `...0101`, `...0102`, `...0201`, `...0301`, `...0401`). All natural-key-based upserts
   (phone numbers, category slugs, product SKUs) were already valid and untouched. Added
   `scripts/validate-seed-uuids.mjs` - a small, DB-free, fast check that regex-extracts every
   UUID-shaped literal from `seed.ts` and rejects any non-hex character; wired into CI as an early
   step, right after Prisma schema validation.
3. **CI's `.env`/`.env.test` accidentally shared one database.** The published workflow set
   `DATABASE_URL` to `dropzo_test` in `.env`, then created `.env.test` as a literal copy of `.env` -
   meaning both "development" and "test" contexts in CI pointed at the same `dropzo_test` database.
   Fixed: the Postgres service now only auto-creates `dropzo` (via `POSTGRES_DB`); a new step
   creates `dropzo_test` explicitly via `psql`; `.env` and `.env.test` are now written
   independently, each with its own correct `DATABASE_URL`/`APP_DATABASE_URL`. A new defence-in-depth
   check (`apps/api/test/helpers/clients.ts`) now refuses to run the integration suite at all unless
   its `DATABASE_URL` resolves to a database name ending in `_test`; CI also independently verifies
   this with its own explicit step before running the suite.
4. **Missing `prisma generate` step.** Not previously a dedicated CI step (relied on
   `@prisma/client`'s own postinstall hook). Found to be load-bearing: a forced local dependency
   reinstall (below) reproduced ten `implicitly has an 'any' type` TypeScript errors across the
   entire integration test suite until `prisma generate` was run explicitly - the generated
   client's types are what give those queries their real return types. Added as its own explicit
   CI step, before typecheck.
5. Migrations are now applied to **both** `dropzo` and `dropzo_test` in CI (previously only the
   test database), and the deterministic seed now runs **twice** in CI against the development
   database specifically, to verify idempotency as the task requires.

### How the dotenv fix and others were verified without a live database

A clean `npm ci` was attempted locally to mirror CI's install behavior exactly; it was interrupted
mid-run by an OS-level file lock (`EPERM` unlinking `esbuild.exe`, unrelated to this task - likely
antivirus or another process briefly holding the file), leaving `node_modules` partially deleted.
Recovered via `npm install` (811 packages reinstalled, dependency tree unchanged, same 45
`npm audit` findings as before - nothing regressed). This incident is exactly what reproduced the
missing-`prisma generate` defect above. After recovery, the fixed `prisma:validate` script was run
directly and succeeded; the full existing check suite (`format:check`, `lint`, `typecheck`, `test`,
`build`) was re-run and passed; `prisma format`/`validate` were re-run;
`scripts/validate-seed-uuids.mjs` was run and confirmed all 6 unique seed IDs are now valid.

### What remains genuinely unverified

The build machine's two live-database options are both still unavailable, unchanged from the
previous session: Docker Desktop's Linux engine cannot start because hardware virtualization is
not enabled in this machine's firmware (`wsl --status` confirms this precisely, re-checked during
this task); the separate native PostgreSQL 17 service (credentials now known: `postgres`/`postgres`
on `localhost:5432`) is still missing the PostGIS extension (`pg_available_extensions` has no
`postgis` row), so even that path cannot run the migration's very first statements. Attempting
`docker compose up` and `nx run-many -t dev` both hang (not a clean fast failure) rather than
erroring, consistent with a non-functional Docker backend; no orphaned processes were left behind
(verified). **Backup/restore and the full Nx dev-orchestration flow could not be executed for the
same reason and remain unverified** - this task's own instruction permits relying on CI for
container-level verification in this situation, and explicitly forbids claiming local runtime
verification that didn't happen, so none is claimed here.

### BC-004 completion decision

**Not marked Done.** Per this task's own acceptance criteria, BC-004 can only close once CI
actually passes on a real run. The defects that caused the first two failures are fixed and
locally re-verified as far as possible without a database connection, but **no run has yet
confirmed the fix against a real Postgres** - the next push's CI run is what will. TD-006 is left
open for the same reason. `BC-004` stays **In Review** in `TASK-TRACKER.md`.

### Git status

Nothing committed or pushed from this remediation pass, per this task's explicit instruction.
Changed files: `apps/api/package.json` (dotenv-cli invocation), `apps/api/prisma/seed.ts` (UUIDs),
`apps/api/test/helpers/clients.ts` (test-database guard), `.github/workflows/ci.yml` (full
rewrite), new `scripts/validate-seed-uuids.mjs`, and documentation
(`BC-004-IMPLEMENTATION-PLAN.md`, `DATABASE-DESIGN.md`, `README.md`, `DEVELOPMENT-SETUP.md`,
`TASK-TRACKER.md`, `ROADMAP.md`, `RISK-REGISTER.md`, `TECHNICAL-DEBT.md`, this entry).

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

## BC-004 — First real CI run against live PostgreSQL (`bdc07cb`, run #3)

**This is the first time any of BC-004's migration, seed, or integration tests actually ran
against a real database.** Result: run #3
(`https://github.com/siddiqbarbhuiya/dropzo/actions/runs/42362478400`) got all the way through
formatting, lint, typecheck, unit tests, Prisma validation, migrations against **both** `dropzo`
and `dropzo_test`, the `dropzo_app` role password, and two seed executions (idempotency confirmed:
identical `Seed complete` output both times) - every fix from the remediation pass worked. It
failed only at the integration test suite itself: **Test Suites: 1 failed, 4 passed, 5 total;
Tests: 3 failed, 18 passed, 21 total.**

`ledger.integration-spec.ts`, `schema-integrity.integration-spec.ts`,
`orders-payments.integration-spec.ts`, and `outbox-notifications.integration-spec.ts` **all passed
in full** - the deferred balance trigger, the platform-account partial unique index, the
`dropzo_app` UPDATE/DELETE revocation, scoped idempotency, webhook dedup, and `SKIP LOCKED`
claiming all behaved exactly as designed, against real PostgreSQL, for the first time.

The 3 failures were all in `inventory-concurrency.integration-spec.ts`, all the same root cause,
read from the actual Postgres error in the job log (not guessed): `new row for relation
"inventory" violates check constraint "chk_inventory_reserved_blocked_le_on_hand"`. This was a bug
in the test fixture, not the schema or the application logic it exercises -
`createStoreProduct()`'s helper created the parent `inventory` row with `on_hand_quantity: 0` and
then added `stock_batches` separately without ever topping up the parent row to match, exactly the
invariant `DATABASE-DESIGN.md`'s "Inventory and FEFO allocation" section requires
(`inventory.on_hand_quantity` must equal `SUM(stock_batches.on_hand_quantity)`). The moment
`reserveFefo()` incremented `inventory.reserved_quantity`, the CHECK correctly caught the
inconsistency. Fixed with a new `receiveBatch()` test helper that creates a batch and tops up the
parent inventory row in one transaction, mirroring `DATABASE-DESIGN.md`'s "Receiving stock"
procedure exactly; all three affected tests now use it. Re-verified locally (type-checks, full
check suite passes) - not yet re-confirmed by another live run as of this entry.

## BC-004 — Confirmed complete (CI run #4, commit `b80ce34`)

The fix above was pushed and re-run. CI run #4
(`https://github.com/siddiqbarbhuiya/dropzo/actions/runs/42363253263`, job
`128375838874`) shows **completed successfully**, confirmed by reading the actual job log (not the
badge alone): `Test Suites: 5 passed, 5 total`, `Tests: 21 passed, 21 total`. Both seed executions
logged a successful `Seed complete` with identical output. Migrations applied cleanly to both
`dropzo` and `dropzo_test`. The Postgres server log for that run shows a long list of `ERROR:` lines
(unbalanced-ledger rejection, permission-denied on the ledger tables, negative/over-reserved
inventory CHECK rejections, duplicate-key rejections for every unique/partial-unique constraint) -
every one of these is a test **deliberately** causing a rejection to prove a constraint works, not
a job failure; none of them appear as a `##[error]` annotation or a non-zero step exit.

**BC-004 is genuinely done** - not just implemented, but verified end-to-end against real
PostgreSQL + PostGIS in CI: all 41 tables, every custom SQL invariant (CHECK constraints, partial
unique indexes, the ledger balance trigger, the ledger immutability triggers, the `dropzo_app`
least-privilege role), the deterministic seed (twice, confirming idempotency), and the full
integration/concurrency suite (FEFO ordering, the last-unit concurrency race, scoped idempotency,
webhook dedup, `SKIP LOCKED` claiming, the worked settlement example). `TASK-TRACKER.md` updated to
**Done**; `TD-006` and `RISK-005`/`RISK-007` moved to Resolved in `TECHNICAL-DEBT.md`/
`RISK-REGISTER.md`; `ROADMAP.md`'s "BC-004 follow-up" item removed (nothing left to follow up on).
Local verification on the build machine itself (Docker needs firmware virtualization; the native
Postgres 17 service needs PostGIS) remains unavailable, but is no longer required - CI is the
environment that proves this work, and it now does, on every push.

## BC-005 — Authentication, session management, and authorization foundation

Phase 0 gate check (re-verified, not assumed): the latest CI run on the pushed `main` branch at the
time this task started was CI run #4 on `b80ce34` (see above), genuinely green against real
PostgreSQL+PostGIS. BC-005 proceeded on that basis.

**Built:** phone+OTP registration/login as one shared flow (`AuthService`,
`OtpService`), a new `otp_challenges` table (own forward-only migration, not FK'd to `users` - see
`DATABASE-DESIGN.md`), short-lived JWT access tokens and opaque SHA-256-hashed refresh tokens with
rotation and reuse detection (`TokenService`), deny-by-default global RBAC
(`JwtAuthGuard`+`RolesGuard` as global guards, `@Public()` for the handful of unauthenticated
routes), an audited admin role-assignment endpoint with a SUPER_ADMIN-only guard against granting
SUPER_ADMIN, and a merchant/store ownership authorization guard foundation
(`MerchantAccessGuard` - no routes of its own yet). Full design and the rationale behind every
token/security decision: [ADR-0013](../03-decisions/ADR-0013-phone-otp-auth-opaque-refresh-tokens.md)
and [`AUTHENTICATION-DESIGN.md`](../04-design/AUTHENTICATION-DESIGN.md).

**Bugs found and fixed by actually running the code, not assumed:**

- A genuine TOCTOU concurrency bug in `OtpService.verifyOtp`: the original implementation did a
  plain `findFirst` then a separate `update`, so two concurrent verification attempts for the same
  phone could both read the same still-valid, still-`PENDING` challenge and both pass the hash
  check before either write committed. Fixed by locking the candidate row
  (`SELECT ... FOR UPDATE`) inside one transaction before any check or write, mirroring the
  row-locking pattern `DATABASE-DESIGN.md` already establishes for inventory/FEFO.
- A real Jest/ts-jest-only module-resolution failure: `@nestjs/throttler@6.7.1`'s CommonJS build
  `require()`s the now ESM-only `@nestjs/common`. Real Node resolves this fine (verified directly
  with both `node -e "require(...)"` and a native `import()`), but Jest's module registry under
  `--experimental-vm-modules` crashes the whole test file the instant anything imports it. Not a
  defect in the real application - worked around in the integration suite only, by building a test
  module that mirrors `AuthModule` minus `ThrottlerModule`/`ThrottlerGuard` (documented in-file).
- A `libphonenumber-js` Jest-only metadata-resolution bug (bare and `/max` imports both fail under
  ts-jest's ESM transform specifically); fixed by importing `libphonenumber-js/core` plus its
  metadata JSON explicitly and passing it as an explicit argument.
- Several ESM-Jest-specific test-authoring bugs (`jest` not auto-injected into ESM module scope
  without `import { jest } from '@jest/globals'`; `jest.fn()` + chained `.mockResolvedValue()`
  inferring `never` parameter types) - all fixed by actually running the new unit tests, not by
  inspection alone.

**Verified, with each claim distinguished by how it was checked:**

- Typecheck (`tsc --noEmit`, both the main and `test/` tsconfigs): clean, 0 errors.
- Lint (`nx eslint:lint`, every workspace): clean, 0 errors.
- Unit tests: **37/37 passing**, 7 suites (`OtpService`, `TokenService`, phone normalization,
  `JwtAuthGuard`, `RolesGuard`, `MerchantAccessGuard`, plus the pre-existing `HealthController`).
- Build (`nest build`): succeeds.
- Prisma schema validation and the seed-UUID validator: both pass (DB-free checks).
- A new real-database integration suite
  (`apps/api/test/integration/auth.integration-spec.ts`) was written, covering registration, login,
  concurrent-registration safety, OTP replay/expiry/lockout/rate-limiting, refresh rotation/reuse
  detection, logout/logout-all, session listing/revocation, suspended-account rejection (both at
  refresh and at login), admin role grants and the SUPER_ADMIN-escalation guard, and merchant
  cross-tenant isolation. **It could not be run to completion locally** - the same Docker
  (firmware virtualization disabled) / native-PostGIS blocker documented for BC-004 - confirmed
  by the exact failure changing from a Jest/module-loading error (now fixed) to
  `PrismaClientInitializationError: ... database credentials for "dropzo_app" are not valid"` once
  the Jest issue was resolved, i.e. the suite itself now runs correctly up to the point of needing
  a real database that isn't available here. **This has not yet been confirmed by a CI run** - BC-005
  is not committed or pushed as of this entry, per the task's explicit instruction not to do so
  without authorization.

**Documentation updated:** `AUTHENTICATION-DESIGN.md` (new),
[ADR-0013](../03-decisions/ADR-0013-phone-otp-auth-opaque-refresh-tokens.md) (new),
`API-SPECIFICATION.md` (auth/admin endpoints moved from Planned to Implemented),
`DATABASE-DESIGN.md` (`otp_challenges` table spec + change log entry),
`FUNCTIONAL-REQUIREMENTS.md` (FR-AUTH-001/002/003 to Implemented), `SECURITY-STANDARDS.md`
(authentication/RBAC/OTP sections updated with what's actually implemented vs. still planned),
`TESTING-STRATEGY.md` (new test counts, the Jest/throttler limitation documented),
`DEVELOPMENT-SETUP.md` (new required env vars), `TASK-TRACKER.md`/`ROADMAP.md` (this entry),
`RISK-REGISTER.md`/`TECHNICAL-DEBT.md` (new entries for the honestly-deferred items - see those
files).

**Explicitly not done, by design (BC-005's own scope boundary):** no frontend, no merchant
onboarding/store CRUD, no production SMS provider, no Redis/microservices, no changes to BC-004's
applied migration history or approved architecture.

## BC-005 follow-up — post-commit automated security review, two TOCTOU races fixed

After the first BC-005 commit (`67a0d19`) was pushed, an automated security review flagged two
further concurrency issues in the new auth code, both genuine, both the same class of bug already
fixed once in this task (`OtpService.verifyOtp`'s race):

1. **`TokenService.rotateRefreshToken`** did a plain `findFirst` then a separate `update` - two
   concurrent refresh calls presenting the same still-valid token could both pass every check
   before either write committed, weakening reuse detection in exactly the scenario (an attacker
   racing a legitimate client) it exists to catch. Fixed by locking the matching row
   (`SELECT ... FOR UPDATE`) inside one transaction, the same pattern used elsewhere in this task.
   Verified with a new real-database integration test that races two concurrent rotations of the
   same token: outcomes are always exactly one `rotated` and one `invalid` (the loser's presented
   hash matches no row once the lock releases, since the winner's commit already moved the row's
   hash on) - never two successes.
2. **`OtpService.requestOtp`** read the cooldown/rate-limit state and then wrote its new challenge
   row as two separate steps - concurrent requests for the same phone could each observe "no recent
   challenge" before any of their inserts committed, bypassing both the cooldown and the hourly
   limits entirely ("SMS pumping"). Fixed by taking a per-phone Postgres advisory lock
   (`pg_advisory_xact_lock(hashtext(phone))`) inside the same transaction as the cooldown check,
   rate-limit counts, and insert, serializing all requests for one phone. Verified with a new
   real-database integration test that fires five concurrent requests for one fresh phone: exactly
   one reports `sent` and the other four report `cooldown`, with exactly one row ever created.
   **Accepted residual limitation, documented in code**: the per-IP count is not similarly
   serialized across _different_ phones sharing one IP - a burst from several phones behind one IP
   could overshoot `OTP_PER_IP_HOURLY_LIMIT` by a small margin; each individual phone number remains
   fully protected regardless.

Both fixes required rewriting their existing unit test mocks (`token.service.spec.ts`,
`otp.service.spec.ts`) to model `$transaction`/`$queryRaw`/`$executeRaw` instead of plain Prisma
calls, the same adjustment already made once for `otp.service.ts`'s first fix. Re-verified:
typecheck clean, lint clean, all 37 unit tests pass, build succeeds. The two new concurrency
integration tests could not be run locally (same database-unavailability blocker as the rest of the
integration suite) - pending the same CI run already needed to confirm the suite as a whole.

## BC-005 — first real CI run against live PostgreSQL (`070ef6c`, run #6): genuine bugs found and fixed

Pushing `070ef6c` triggered the first CI run with a live `dropzo_test` database available - the
local Docker/PostGIS blocker that prevented this throughout BC-005 doesn't apply in CI. Reading the
actual job log (not the badge) showed: unit tests, lint, typecheck, build, migrations, and seed all
passed; the pre-existing BC-004 integration suites (inventory, ledger, etc.) all still passed; the
new `auth.integration-spec.ts` failed 20 of 50 tests. All 20 failures traced to four distinct,
genuine bugs - three in the new test file, one in the application code itself:

1. **Real application bug**: `AuditService.record()` was called with `entityId: phone` (and, in one
   place, `entityId: 'redacted'`) for `AUTH_OTP_REQUESTED`, `AUTH_OTP_VERIFICATION_FAILED`, and
   `AUTH_REFRESH_TOKEN_REUSE_DETECTED`. `audit_logs.entity_id` is a UUID column (pre-existing BC-004
   schema) - a phone number or the literal string `'redacted'` is not a valid UUID, so every one of
   these audit writes failed with Prisma error P2023 at runtime (caught and logged, never breaking
   the request - but the audit trail for these events was silently never actually persisted).
   **Fixed** by having `OtpService.requestOtp`/`verifyOtp` and `TokenService.rotateRefreshToken`
   return the real `otp_challenges`/`user_sessions` row id alongside their outcome, so `AuthService`
   can reference the actual UUID entity each event concerns instead of inventing a non-UUID key. The
   one case with no real entity to reference (an OTP verification attempt against a phone with no
   live challenge at all) is now logged via the application logger instead, documented as a
   deliberate limitation of the entity-keyed audit schema, not a workaround.
2. **Test bug**: the integration suite's `freshPhone()` helper generated a bare 10-digit number
   (e.g. `"9876543210"`), but `AuthService` normalizes every phone to E.164 (e.g.
   `"+919876543210"`) before using it as the OTP/session key - so `DevOtpProvider.getLastCodeForTesting(phone)`,
   called with the un-normalized value, never found the code the (normalized-key) provider actually
   stored. This caused every test going through `AuthService` (registration, login, token
   lifecycle, logout, suspended accounts, admin role assignment) to fail with "DevOtpProvider did
   not record a code for this phone." **Fixed** by generating `freshPhone()` already in the exact
   E.164 form (`normalizePhoneNumber` is idempotent on it - already covered by an existing passing
   unit test), and the same root cause explains the one HTTP-level failure (a 400 from `verify-otp`
   being sent an `undefined` code).
3. **Test bug**: the per-phone-hourly-limit test inserted its 5 fixture challenges with
   `created_at` only 10 seconds in the past - within `OTP_RESEND_COOLDOWN_SECONDS` (30s), so
   `requestOtp` correctly returned `{outcome: 'cooldown'}` before ever reaching the rate-limit check
   the test meant to exercise. **Fixed** by backdating the fixtures to 45 seconds ago (past the
   cooldown, still within the 1-hour rate-limit window).
4. **Test bug**: a `prisma.merchantStaff.create()` call used a field name, `role_title`, that
   doesn't exist on the `MerchantStaff` model (the real column is `role`). **Fixed** by correcting
   the field name.

Re-verified after all four fixes: typecheck clean, lint clean, all 37 unit tests pass, build
succeeds. The corrected integration suite could not be re-run locally (same database-unavailability
blocker) - pending another CI run to confirm. This is the exact verification discipline the task
asked for throughout: read the real log, find the real cause, fix the real bug, never assume a fix
worked without re-running it.

## BC-005 — second real CI run (`f532b83`, run #7): down to 2 failures, one more test bug fixed

Pushing `f532b83` cut the integration failures from 20 to 2 (unit tests, lint, typecheck, build,
and every other integration suite - inventory, ledger, schema-integrity, orders-payments,
outbox-notifications - all passed). Both remaining failures were the same root cause, read from the
actual log: `verifyViaService("logs an existing user in on a second verification...")` and
`verifyViaService("rejects login itself for a suspended account")` each call the test's
`verifyViaService(phone)` helper twice in a row for the same phone (registration, then a second
login; or registration, then a second attempt after suspension). The second call fell inside
`OTP_RESEND_COOLDOWN_SECONDS` (30s), so `requestOtp` correctly returned `{outcome: 'cooldown'}`
without creating a new challenge - and the test then reused the _first_ call's already-consumed
code, which `verifyOtp` correctly rejected as `not_found` (reported as `'invalid'` to the caller).
**Test bug, not an application bug** - the helper's job is "get this phone to a verified session,"
not exercise the resend cooldown (already covered directly in the "OTP security" tests). **Fixed**
by having `verifyViaService` backdate any existing challenge for the phone past the cooldown window
before requesting, so a second call for the same phone always gets a fresh, verifiable OTP instead
of hitting cooldown.

Re-verified: typecheck clean, lint clean, all 37 unit tests pass, build succeeds, formatting clean.
Pushed as a new commit; pending the next CI run to confirm 0 failures.

## BC-005 — CI run #8 (`0a1849d`) confirmed: 0 failures

Read the actual job log, not the badge: `Test Suites: 7 passed, 7 total` / `Tests: 37 passed, 37
total` (unit), then `Test Suites: 6 passed, 6 total` / `Tests: 50 passed, 50 total` (integration,
including `auth.integration-spec.ts` in full, alongside every pre-existing BC-004 integration
suite). **BC-005's integration suite has now had a genuine, confirmed-clean CI run against real
PostgreSQL+PostGIS**, the same bar BC-004 was held to.

## BC-005 — final security review (post-CI-pass, before first commit's follow-up)

A focused, adversarial re-read of the authentication implementation (not a redesign) was performed
against ADR-0013, `AUTHENTICATION-DESIGN.md`, and the project's security standards, specifically
re-deriving each concurrency/security claim rather than trusting its own prior documentation. Full
detail, classification, and verification results are in the review's own final report (delivered to
the project owner alongside this entry); summarized here for the historical record:

**Two genuine defects found and fixed** (uncommitted as of this entry, per the review's explicit
instruction not to commit or push):

1. **Documentation overclaimed a security property the code doesn't have.** ADR-0013 and
   `token.service.ts`'s own doc comment stated that presenting a refresh token which doesn't match
   the current stored hash "revokes the session outright" - re-deriving the actual
   `rotateRefreshToken` logic shows this is false: a stale (already-rotated-away) token matches no
   row at all (there's no hash history to find it in) and is simply rejected as `'invalid'`, with no
   side effect - the session it used to belong to is **not** revoked, and keeps working under its
   new hash. The genuinely-detected `'reused'` case is narrower: presenting a token for a session
   already revoked through another path (logout, logout-all, suspension). **No unauthorized access
   is possible either way** (a stale token can never be used to authenticate), but the false claim
   matters: it overstates the system's theft-detection story. Fixed by correcting ADR-0013,
   `AUTHENTICATION-DESIGN.md`, and the code's own doc comments to state the real, narrower behavior,
   and by renaming/rewriting the integration test whose name made the same false claim.
2. **Revoking a role didn't invalidate the target user's existing sessions.** Access tokens embed
   roles at issue time and are otherwise valid until they naturally expire
   (`ACCESS_TOKEN_TTL_SECONDS`, default 15 minutes) regardless of later role changes - an accepted
   tradeoff for an ordinary logout/suspension (see ADR-0013), but revoking `ADMIN` (or any role)
   left an already-issued access token usable with the privilege that was just taken away, for up to
   that same window. Fixed: `AdminRolesController.updateRole` now calls
   `TokenService.revokeAllSessionsForUser` on every `REVOKE` action (not `GRANT` - an upgraded
   user's old token simply not yet carrying the new role is not a security problem). Added an
   integration test proving a revoked role forces every session dead immediately, and a companion
   test proving a grant does not.

**One hardening change with no corresponding vulnerability** (defence-in-depth, not a fix for a
reachable bug): `TokenService` now pins `algorithm: 'HS256'` / `algorithms: ['HS256']` explicitly on
sign/verify, rather than relying on the JWT library's own default - this service only ever uses one
symmetric secret, so there was no actual algorithm-confusion attack surface either way.

**Everything else reviewed came back confirmed-correct**, re-derived rather than assumed: OTP
single-use enforcement and the max-attempts lockout math, the per-phone advisory-lock serialization
closing the OTP request race, `MerchantAccessGuard`'s server-side-only ownership resolution,
`RolesGuard`/`JwtAuthGuard`'s deny-by-default wiring, the `SUPER_ADMIN`-only escalation guard, the
migration's forward-only status, and that no audit call anywhere still passes a non-UUID value as
`entity_id`.

**Verified** (all against the exact repository scripts, nothing newly invented): formatting, lint,
typecheck (both the main and `test/` tsconfigs), all 37 unit tests, Prisma schema validation, seed
UUID validation, and the production build - all passed. The integration suite could not be
re-executed locally (same Docker/PostGIS environment limitation as every prior entry in this
document) - confirmed once, not retried repeatedly, per the review's own instruction. **These two
fixes are not yet committed or pushed**, so they have not yet had their own CI run - `RISK-010` and
`TD-009` are updated to reflect that CI run #8 passed for the code as of `0a1849d`, but remain open
until a follow-up CI run confirms these additional changes.

## BC-006 — Merchant onboarding and store management

Built directly on BC-005 (accepted as complete per the task brief - not re-reviewed here). Inspected
the actual `merchants`/`stores`/`service_zones` schema first: most of what BC-006 needed already
existed (`merchants.verification_status`, `store_status` enum, `stores.opening_hours` JSONB,
`stores.supports_pickup`/`supports_delivery`), but several genuine gaps remained - no structured
address fields, no application-review audit trail, no `UNIQUE` stopping a user from submitting two
applications, no `CHECK` constraining `verification_status` to real values, and
`DATABASE-DESIGN.md`'s own delivery-eligibility rule referenced "the store's `service_zones`
membership" which the schema never actually implemented (`stores` had no `service_zone_id` at all).

**Migration** (`20261107180000_bc006_merchant_store_onboarding`, forward-only, generated via the
same DB-connection-free `prisma migrate diff` technique BC-005 used for `otp_challenges`): extends
`merchants` (business type, contact person, email, structured city/district/state/postal_code,
business description, `submitted_at`/`reviewed_at`/`reviewed_by_user_id`/`rejection_reason`,
`UNIQUE` on `owner_user_id`, a `CHECK` on `verification_status`, a second `CHECK` that reviewed
fields are set together or not at all) and `stores` (contact phone/email, locality, structured
state, timezone, `service_zone_id` FK to `service_zones`). No new tables; no change to any
BC-004/BC-005 migration.

**Built**: `MerchantApplicationService` (submit/resubmit-after-rejection/update/dashboard, plus
admin list/get/approve/reject/suspend/reinstate) and `StoreService` (create/list/get/update/hours/
availability/status, plus admin list-by-merchant/status), both under a new `MerchantModule`.
Ownership is resolved from the authenticated user (`req.user.id`), never a client-supplied merchant
or store id - the merchant-facing routes live under `/merchants/me` and `/merchants/me/stores`
specifically so there is no id to trust in the first place. Admin routes
(`/admin/merchants`, `/admin/stores`) take real ids, since that is the whole point of being admin,
and are `@Roles('ADMIN', 'SUPER_ADMIN')`-gated. Every application/store decision is audited with a
real UUID `entityId` (the `merchants`/`stores` row itself - see BC-005's own audit-UUID fix for why
this matters), never a phone number or other non-UUID value.

**Role assignment**: approving an application grants the owner `MERCHANT_OWNER` (idempotent
`userRole.upsert`), because `SECURITY-STANDARDS.md` requires every protected endpoint to check both
role and resource ownership - the merchant-facing store routes are `@Roles('MERCHANT_OWNER')`-gated,
so without the grant an approved merchant could never reach them. No other role is granted
automatically.

**Concurrency**: application decisions (approve/reject/suspend/reinstate) and store status
transitions both use the same compare-and-swap shape - an `updateMany` scoped to the row's id _and_
its expected current status, never a plain read-then-write - so two admins racing to approve and
reject the same application, or two requests racing to change one store's status, can never both
succeed. This mirrors the exact pattern BC-005 used for refresh-token rotation and OTP verification.
Verified with real-database integration tests that race both scenarios with `Promise.allSettled`.

**Store lifecycle** (full transition table in `MERCHANT-STORE-DESIGN.md`): a store starts `PENDING`
and is not publicly discoverable until an admin approves it into `ACTIVE` - the literal mechanism
behind "admin approval is required before a merchant/store becomes publicly discoverable." A
suspended merchant cannot create a store or reactivate a `PAUSED` one (checked explicitly, not
inferred); a merchant can self-service pause/reopen/close an already-`ACTIVE` store, but can never
self-service out of `SUSPENDED` (admin-only reinstatement) or straight from `PENDING` into `ACTIVE`
(admin approval is not a self-service action).

**Verified, with each claim distinguished by how it was checked**:

- Typecheck (`tsc --noEmit`, both the main and `test/` tsconfigs): clean.
- Lint (`nx eslint:lint`, all workspaces): clean.
- Unit tests: **59/59 passing** (9 suites - the 7 pre-existing plus `merchant-application.service
.spec.ts` and `store.service.spec.ts`, 22 new tests between them).
- Build (`nest build`): succeeds.
- Prisma schema validation, `prisma format` (no-op), and the seed-UUID validator: all pass.
- A new real-database integration suite (`apps/api/test/integration/merchant.integration-spec.ts`,
  23 tests) covers: application submission/resubmission/duplicate-rejection, the concurrent-
  approval race, role grant on approval, store creation gated on approval, suspended-merchant
  denial, reinstatement, cross-merchant store access denial, store listing scoping, the full
  PENDING→ACTIVE→PAUSED→ACTIVE admin/merchant handoff, merchant-cannot-activate-from-PENDING,
  admin suspend + merchant-cannot-self-reinstate, the concurrent store-status race, operating-hours
  validation, availability updates, and five HTTP-level wiring checks (401/403 paths, a real
  submission and a real store creation over HTTP). **It could not be run to completion locally** -
  confirmed once (not retried repeatedly, per this task's own instruction): the native Postgres
  service that became reachable during this session's earlier BC-005 review still lacks the
  PostGIS extension (`extension "postgis" is not available` - a fresh, concrete error, not an
  assumption), the same documented local-environment limitation as every integration suite in this
  project since BC-004. The half-applied failed migration this attempt left in `dropzo_test` was
  cleanly resolved (`prisma migrate resolve --rolled-back`) rather than left dangling.

**Documentation updated**: `MERCHANT-STORE-DESIGN.md` (new), `DATABASE-DESIGN.md` (new
`merchants`/`stores` fields, change log entry), `API-SPECIFICATION.md` (new endpoint table rows),
`FUNCTIONAL-REQUIREMENTS.md` (FR-MER-001/003/004/005, FR-ADM-001 to Implemented), `TESTING-STRATEGY
.md` (new test counts), `TASK-TRACKER.md`/`ROADMAP.md` (this entry).

**Explicitly not done, by design (BC-006's own scope boundary)**: no product catalogue, inventory,
cart, checkout, orders, payments, or delivery-partner management (BC-007+); no public store-
discovery API; no `MerchantStaff`-delegated store management; no cascading of merchant suspension
onto a merchant's existing stores (documented as a deliberate, narrower scope in
`MERCHANT-STORE-DESIGN.md`); no real `DRAFT`-save-and-resume flow (the state exists in the `CHECK`
constraint, reserved for later; no endpoint produces it); no frontend; no production file/image
uploads; no Redis/microservices.

**Not committed or pushed**, per the task's explicit instruction.

## BC-005 — CI run #9 (`b66295b`) failed on formatting, not a real defect

While starting BC-006, the project owner's own commit closing out the BC-005 security review
(`b66295b`, "BC-005 — Finish Final Adversarial Review and Prepare for CI") turned out to have
triggered CI run #9, which **failed in 58 seconds at the "Formatting" step** - confirmed from the
real job log (`jobs[0].steps` showing only `"Formatting"` as `failure`), not assumed from the
badge. Reproduced locally by stashing this session's own BC-006 work and running
`npx prettier --check .` against `b66295b` alone: several of the review's own documentation edits
(`FUNCTIONAL-REQUIREMENTS.md`, `API-SPECIFICATION.md`, `DATABASE-DESIGN.md`, `TESTING-STRATEGY.md`,
`PROGRESS.md`, `ROADMAP.md`, `TASK-TRACKER.md`, `RISK-REGISTER.md`, `TECHNICAL-DEBT.md`,
`src/app.module.ts`) were never run through `prettier --write` before being committed - a
formatting oversight, not a logic defect; typecheck/lint-the-code/unit tests were all still
genuinely clean in that commit, only whitespace/line-wrap formatting was off. Fixed by running
`prettier --write` and merging the result into this session's working tree (restored the stash
afterward). One unrelated discovery while doing this: `.claude/launch.json` - a local Claude Code
tool file this project has repeatedly been instructed to never stage or commit - was nonetheless
included in `b66295b`. It is now part of the repository's history; this session did not re-format
or otherwise touch it beyond reverting its own accidental reformat back to the committed version,
consistent with "preserve it, don't modify it" even though it is technically tracked now.

## BC-007 — Product catalogue and inventory management

Built on BC-005 and BC-006 (accepted as complete per the task brief - not re-reviewed here).
Inspected the actual schema first: `categories`, `products`, `product_variants`, `store_products`,
`inventory`, `stock_batches`, and `stock_movements` were **all already fully modeled by BC-004's own
init migration**, including the relevant non-negative/consistency `CHECK` constraints. This task
was almost entirely an application-layer (NestJS services/controllers/DTOs) build, not a schema
build - the one genuine gap found was `stock_movements.movement_type`, an unconstrained
`VARCHAR(30)` with no `CHECK`, the same class of gap BC-006 found and fixed for
`merchants.verification_status`.

**Migration** (`20261109060000_bc007_stock_movement_type_check`, forward-only, additive, no new
tables): adds `chk_stock_movements_movement_type`, constraining the column to the seven documented
values (`RECEIVED`, `RESERVED`, `RELEASED`, `SOLD`, `DAMAGED`, `EXPIRED`, `ADJUSTED`). No change to
any BC-004/005/006 migration; no `schema.prisma` model changes (the column stays a plain `String`).

**Built**: `CatalogueModule` (`CategoryService`, `ProductService`, public read routes plus
`@Roles('ADMIN', 'SUPER_ADMIN')`-gated admin write routes) and `InventoryModule`
(`StoreProductService` for merchant-owned listings, `InventoryService` for stock receiving/
adjustment/removal, both `@Roles('MERCHANT_OWNER')`-gated under `/merchants/me/stores/:storeId`).
Every listing/inventory lookup is scoped through `StoreService.getOwnStore` and
`MerchantApplicationService.getMerchantForOwner` (reusing BC-006's own services directly, not new
guards), so a `storeId`/`listingId` is never trusted alone and a suspended merchant is blocked from
every mutation. Every stock mutation and listing create/update is audited with a real UUID
`entityId`, never a non-UUID value - the same convention BC-005's own audit-UUID fix established.

**Variant modeling**: the same real-world product in multiple pack sizes (e.g. rice in 1 kg/5 kg/
10 kg) is one `Product` with several `ProductVariant` rows, never separate unrelated products -
`ProductService.create` creates a product and its initial variants in one transaction; `addVariant`
maps a duplicate SKU to a `409`, never a raw DB error. `Product.attributes` stays a single open
`Json` column, deliberately not a dedicated attribute-type/value framework, per the task's own
instruction to avoid unnecessary complexity.

**Store listings**: `@@unique([store_id, variant_id])` makes "one listing per store per variant" a
database guarantee; `createListing` maps the violation to a `409`. The same variant may be listed
by many different stores, each with independent price/availability. `usesBatchTracking` and
`variantId` cannot be changed after creation (switching tracking mode after stock exists would
desync `on_hand_quantity` from any `stock_batches` rows). Every listing's paired `Inventory` row is
created in the same transaction, so a listing can never exist without one.

**Inventory and FEFO**: merchants can never change `on_hand_quantity` through the generic listing
update endpoint - only through `receive`/`adjustments`/`removals`. Adjustments and removals require
a mandatory reason (`@Length(3, 2000)`); every mutation locks the inventory row (and any batch rows
it touches) with `SELECT ... FOR UPDATE` inside one transaction, then writes a `stock_movements`
row recording the actor and reason. FEFO batch selection (`InventoryService.consumeFefo`) reuses the
exact lock order BC-004's own test helper (`test/helpers/reservation.ts`) already proved
deadlock-free: inventory locked first, then candidate batches in `expiry_date ASC NULLS LAST, id
ASC` order, consumed greedily until the requested quantity is covered. Two allocation filters cover
the task's two distinct rules: `AVAILABLE` (adjustments, `DAMAGED` removal) excludes already-expired
batches and never allocates more than `on_hand_quantity - reserved_quantity` per batch (no expired-
batch allocation, no reservation bypass); `EXPIRED_ONLY` (`EXPIRED` removal) is the inverse -
only genuinely expired batches, rejecting an attempt to mark a non-expired batch `EXPIRED` with a
clean `409`. For non-batch-tracked (aggregate) listings, the same `on_hand_quantity -
reserved_quantity` check runs directly against the locked inventory row before any decrease, so a
negative-stock attempt surfaces as a clean `409 Conflict` rather than the database's own `CHECK`
constraint violation reaching the client as an unhandled `500`.

**`stock_movements.quantity` sign convention** (not dictated by the schema, so fixed here and in
`INVENTORY-MANAGEMENT-DESIGN.md`): `RECEIVED`/`DAMAGED`/`EXPIRED` store a positive magnitude
(direction implied by `movement_type`); `ADJUSTED` stores the signed delta, since one movement type
covers both stocktake increases and decreases.

**Verified, with each claim distinguished by how it was checked**:

- Typecheck (`tsc --noEmit`, both the main and `test/` tsconfigs): clean.
- Lint (`nx eslint:lint`, all workspaces): clean.
- Format (`prettier --check .`): clean, after `prettier --write` on the new files.
- Unit tests: **92/92 passing** (13 suites - the 9 pre-existing plus `category.service.spec.ts`,
  `product.service.spec.ts`, `store-product.service.spec.ts`, and `inventory.service.spec.ts`, 25
  new tests between them). Covers category/product/variant CRUD and duplicate-slug/SKU rejection,
  listing creation/ownership/duplicate-prevention/suspension-blocking, aggregate and batch-tracked
  receive/adjust/remove, FEFO allocation order across batches, the reservation-respecting available-
  quantity guard (both aggregate and batch-tracked paths), the EXPIRED-removal-only-on-genuinely-
  expired-batches check, and cross-store/unauthorized listing access denial.
- Build (`nest build`): succeeds.
- Prisma schema validation (`prisma validate`): passes.
- A new real-database integration suite
  (`apps/api/test/integration/catalogue-inventory.integration-spec.ts`, 20 tests) covers: category/
  product/variant creation and duplicate rejection, cross-product variant-id scoping, listing
  creation/duplicate-prevention/multi-store independence/cross-merchant denial, aggregate and
  batch-tracked receiving, mandatory-reason adjustments with movement-history verification,
  negative-stock prevention (aggregate), FEFO allocation across batches on a decrease, the
  reservation-compatibility guard (a batch with its full quantity already reserved refuses a further
  decrease), the EXPIRED-removal genuineness check (both the rejection and the success path),
  DAMAGED removal, suspended-merchant denial, non-owning-merchant denial, and a concurrent-
  adjustment race. **It could not be run to completion locally** - confirmed by reproducing the
  identical `PrismaClientInitializationError: Authentication failed against database server ...
dropzo_app` failure against the already-CI-passing `merchant.integration-spec.ts` run in the same
  session, proving this is the same documented local-environment limitation as every integration
  suite in this project since BC-004, not a defect in this suite's own code.

**Documentation updated**: `PRODUCT-CATALOGUE-DESIGN.md` (new), `INVENTORY-MANAGEMENT-DESIGN.md`
(new), `DATABASE-DESIGN.md` (new `chk_stock_movements_movement_type` constraint, change-log entry),
`FUNCTIONAL-REQUIREMENTS.md` (FR-CAT-001..003, FR-INV-001, FR-INV-003 to Implemented; FR-INV-002
left Planned, deferred to the cart/checkout milestone), `TASK-TRACKER.md`/`ROADMAP.md` (this entry),
`TESTING-STRATEGY.md` (new test counts), `RISK-REGISTER.md`/`TECHNICAL-DEBT.md` (see those files for
the specific items this task adds).

**Explicitly not done, by design (BC-007's own scope boundary)**: no cart, checkout, orders,
payments, delivery-partner management, multi-store checkout, loyalty, recommendations, AI features,
advanced analytics, Redis/Kafka/microservices, or customer-facing shopping frontend - all deferred
to later milestones, per the task's explicit exclusions. No public "reserve stock" endpoint either:
FEFO is implemented as the internal batch-selection mechanism for `adjustments`/`removals`, not as a
reservation API, since `carts`/`stock_reservations` remain out of scope; a future cart/checkout
feature reuses the exact lock order documented here.

**Not committed or pushed**, per the task's explicit instruction.

## BC-008 — Customer cart, checkout, stock reservation, and COD order creation

Built on BC-005/BC-006/BC-007 (accepted as complete per the task brief - not re-reviewed here; all
three are now committed, pushed, and CI-verified - see their `TASK-TRACKER.md`/`ROADMAP.md` rows,
updated in this task for accuracy). Inspected the actual schema first: `carts`, `cart_items`,
`stock_reservations`, `stock_reservation_items`, `orders`, `order_items`, `order_status_history`,
`payments`, and `idempotency_records` were **all already fully modeled by BC-004's own init
migration**. The only genuine gaps: three documented-but-unconstrained `VARCHAR` status columns
(`carts.status`, `stock_reservations.status`, `idempotency_records.status`) and a missing
one-active-cart-per-user guarantee - the same class of gap BC-006/BC-007 found and fixed for
`merchants.verification_status`/`stock_movements.movement_type`.

**Migration** (`20261109120000_bc008_cart_checkout_order_checks`, forward-only, additive, no new
tables): three `CHECK` constraints restricting each status column to its documented values, and
`uq_carts_active_per_user` (a partial unique index, `ON carts (user_id) WHERE status = 'ACTIVE'`),
mirroring the init migration's own `uq_stock_reservations_active_cart`/`_active_order` pattern.

**Built**: `CartModule` (`CartPricingService` - the single, authoritative source of cart
pricing/validation, reused by both the cart-summary endpoint and checkout; `CartService` - cart
CRUD, cross-store rejection via `409`, duplicate-add increments quantity, last-item removal deletes
the now-meaningless empty cart), `CheckoutModule` (`FulfilmentValidationService` - pickup/delivery
eligibility via the documented `ST_DWithin` radius rule; `CheckoutService` - read-only preview plus
the one mutating, fully transactional order-creation operation), a new `ReservationService` added to
the existing `InventoryModule` (stock reservation - deliberately separate from BC-007's
`InventoryService`, which only ever touches `on_hand_quantity`; this only ever touches
`reserved_quantity`), `OrdersModule` (customer-facing retrieval only), and a new
`IdempotencyService`/`IdempotencyModule` under `common/` (generic, reusable by any future
idempotent-sensitive endpoint, not cart/checkout-specific).

**Reservation design decision**: BC-008 reserves stock **only at order-creation time, directly
order-held** (`cart_id` left `NULL`, `order_id` set immediately) - there is no cart-side "hold while
browsing" reservation in this implementation, a deliberate scope choice documented in
`CART-CHECKOUT-DESIGN.md`'s "Reservation lifecycle - what BC-008 actually does". `
ReservationService.reserveForOrder` locks every inventory row an order touches **first**, in
ascending `id` order across the whole order (not just within one listing) - extending BC-007's own
single-inventory lock-order rule to cover an order with several different listings at once, so two
concurrent orders can never request these locks in opposite orders.

**Idempotency**: `IdempotencyService` implements `DATABASE-DESIGN.md`'s three-state
(`IN_PROGRESS`/`COMPLETED`/`FAILED`) request-handling protocol exactly, scoped to
`(scope, user_id, idempotency_key)`. The `IN_PROGRESS` insert happens before, and the
`COMPLETED`/`FAILED` write happens after, the main order-creation transaction - deliberately outside
it, so a rolled-back order-creation transaction never also rolls back the `FAILED` marker that needs
to survive it. `orders.idempotency_key` (`UNIQUE (customer_id, idempotency_key)`) is written
alongside it as the documented last-resort database guarantee, not relied on alone.

**Never trust the client's prices**: `expectedTotalAmount` on the create-order request is never
used to compute the charge - the server always recomputes the authoritative total itself, and
`expectedTotalAmount` is compared only to detect a stale cart (a price/availability change since the
last checkout-preview call), surfaced as a clear `409` rather than silently charging the new total.

**Price and content snapshots**: `order_items`/`orders` copy product name, variant, SKU, unit price,
store name/address, and (for delivery) recipient/address details at creation time - never
recomputed or re-joined from the live rows afterward. Verified directly: the integration suite
changes a listing's `selling_price` after order creation and confirms the order's own
`order_items.unit_price` is untouched.

**Reservation expiry**: no merchant accept/reject flow exists yet in this milestone, so an order's
reservation simply holds stock for 24 hours; `ReservationService.releaseExpiredOrderReservations()`
releases each expired reservation in its own transaction and, only if the order is still `CREATED`
(a compare-and-swap), transitions it to `CANCELLED` with a status-history row. Operated via
`npm run release-expired-reservations` (apps/api) - compiled into `dist/jobs/` and run exactly like
the application itself, since running NestJS-decorated code through the `ts-node/esm` loader
`prisma/seed.ts` uses does not work (a real, reproduced failure - `ts-node/esm` cannot resolve one of
`@nestjs/config`'s own CommonJS dependencies, a `.js.js` double-extension resolution bug specific to
that loader). No new scheduler or infrastructure dependency - meant to be invoked periodically by
whatever the deployment environment already has for cron-like tasks.

**Verified, with each claim distinguished by how it was checked**:

- Typecheck (`tsc --noEmit`, both the main and `test/` tsconfigs): clean.
- Lint (`nx eslint:lint`, all workspaces): clean.
- Format (`prettier --check .`): clean, after `prettier --write` on the new files.
- Unit tests: **143/143 passing** (20 suites - the 94 pre-existing plus `idempotency.service.spec
.ts`, `cart-pricing.service.spec.ts`, `cart.service.spec.ts`, `reservation.service.spec.ts`,
  `fulfilment-validation.service.spec.ts`, `checkout.service.spec.ts`, and `orders.service.spec.ts`,
  49 new tests between them). Covers idempotency replay/conflict/reset, cart pricing error codes
  (including expired-batch exclusion), cross-store rejection, FEFO reservation allocation and
  insufficient-stock rejection, aggregate/batch-tracked release and its double-release no-op,
  expired-reservation release with order cancellation, pickup/delivery eligibility (zone inactive,
  no radius configured, out of range), and checkout's full success/conflict/idempotency-replay
  matrix.
- Build (`nest build`): succeeds, including the new `src/jobs/release-expired-reservations.ts`
  compiling into `dist/jobs/`.
- Prisma schema validation (`prisma validate`): passes.
- A new real-database integration suite
  (`apps/api/test/integration/cart-checkout-orders.integration-spec.ts`, 18 tests) covers: cart
  creation/duplicate-increment/absolute-update, cross-store rejection, empty-cart-frees-the-store-
  lock, COD order creation with reservation and cart transition, stale-cart price-change rejection,
  insufficient-stock rejection with inventory left untouched and no partial order, the price-
  snapshot-survives-a-later-price-change check, idempotent replay, idempotency-key-reuse-with-
  different-body rejection, concurrent-duplicate-request dedup (exactly one order), cross-customer
  cart/order access denial, checkout blocked once a store is suspended, pickup/delivery validated
  independently, two-customers-racing-for-the-final-unit (exactly one succeeds), FEFO allocation
  excluding an expired batch, reservation expiry releasing stock and cancelling the order (and a
  safe no-op on a second run), and cart cleanup never damaging order history. **It could not be run
  to completion locally** - confirmed by reproducing the identical
  `PrismaClientInitializationError: Authentication failed ... dropzo_app` failure already documented
  for every prior milestone's suite, not a defect in this suite's own code.

**Documentation updated**: `CART-CHECKOUT-DESIGN.md` (new), `ORDER-MANAGEMENT-DESIGN.md` (new),
`DATABASE-DESIGN.md` (new `CHECK` constraints and partial unique index, change-log entry),
`API-SPECIFICATION.md` (new endpoint rows), `FUNCTIONAL-REQUIREMENTS.md` (FR-CART-001, FR-ORD-001/
002, FR-INV-002, FR-PAY-001 to Implemented; FR-ORD-003 stays Planned - no cancellation endpoint this
milestone), `TASK-TRACKER.md`/`ROADMAP.md` (this entry, plus correcting BC-005/006/007's now-stale
"not yet pushed"/"pending CI" notes to reflect that all three were in fact committed, pushed, and
CI-verified earlier in this same working session), `RISK-REGISTER.md`/`TECHNICAL-DEBT.md` (see those
files for the specific items this task adds).

**Explicitly not done, by design (BC-008's own scope boundary)**: no online payment gateway
integration or webhooks, no delivery-partner onboarding or assignment, no route optimization, no
merchant order-fulfilment dashboard, no coupons/loyalty/subscriptions, no multi-store checkout, no
AI recommendations, no advanced analytics, no Redis/Kafka/microservices - all deferred to later
milestones, per the task's explicit exclusions. No cart-side ("while browsing") stock reservation
either - a deliberate scope choice, not a gap (see "Reservation design decision" above). No
customer-initiated order cancellation endpoint (FR-ORD-003 stays Planned) - only the automatic
reservation-expiry cancellation path exists this milestone.

**Committed as `aa825c8` and pushed.**

## BC-008 follow-up — CI run #16 failures (real bugs, root-caused and fixed) and a security review

CI run #16 on `aa825c8` **failed at the "Database integration and concurrency tests" step** -
confirmed from the actual job log (`total_count: 1` job, step 21 `conclusion: "failure"`), not
assumed from the badge. Lint, typecheck, unit tests, migrations, and seed all passed; 4 of 113
integration tests failed, across 2 suites:

1. **Real production bug, found and fixed**: `InventoryService.receiveStock` passed
   `dto.manufactureDate`/`dto.expiryDate` straight through to Prisma as raw strings.
   `ReceiveStockDto`'s own `@IsDateString()` validation (and its Swagger example, `'2027-05-09'`)
   accepts a bare ISO date, but Prisma's `DateTime` fields require a full date-time string and
   reject a bare date with `PrismaClientValidationError: ... premature end of input`. This is a
   genuine bug any real client sending the documented request shape would hit in production, not
   merely a test artifact - fixed with a `toDateOrUndefined` helper that parses the string into a
   real `Date` before it reaches Prisma. Surfaced by this task's own new "allocates a batch-tracked
   order via FEFO, excluding expired batches" integration test.
2. **Pre-existing BC-004 test bug, fixed**: `inventory-concurrency.integration-spec.ts`'s "never
   allows two concurrent requests to both reserve the last unit" test created two carts for the
   _same_ user (`ownerUserId` twice) despite its own comment claiming "two different customers" -
   this silently worked before BC-008's own migration existed, and started failing
   (`Unique constraint failed on the fields: (user_id)`) once `uq_carts_active_per_user` correctly
   enforced the rule the test's comment always claimed to test. Fixed by creating two genuinely
   different customers, matching the test's own stated intent - not by weakening the new
   constraint, which is correct.
3. **Test-authoring bugs in this task's own new suite, fixed**: `makeStoreWithListing()` created a
   category named literally `'Rice & Pulses'` on every call; two tests call it twice (once per
   store) within the same test, colliding on `CategoryService`'s own unique-slug constraint - given
   each call its own random name. Separately, the same bare-date-string issue as (1) above was also
   present in the test's own `receive()` helper fixture before the real fix in (1) made it
   unnecessary there.

All four fixed; re-ran the full local verification suite (lint/typecheck/format/build/143 unit
tests) clean, consistent with every check that doesn't require the local DB limitation already
passing in CI run #16 itself.

**Separately, an automated security review of the BC-008 commit** flagged unbounded cart-line
quantity (no practical ceiling) and COD inventory-hoarding risk (no rate limit specific to order
creation, no cap on open orders per customer). Addressed: `AddCartItemDto`/`UpdateCartItemDto` now
cap quantity at 1000; `POST /checkout` was given its own stricter `@Throttle` (5/min/IP) on top of
the app-wide 30/min/IP baseline. A genuine per-customer open-order cap is a product-policy decision
this task has no basis to invent - tracked as `RISK-014`/`TD-017` for a follow-up once real order
volume gives a basis for the number, documented in `ORDER-MANAGEMENT-DESIGN.md`'s new "Abuse
resistance: COD hoarding" section.

## BC-008 follow-up #2 — CI run #17 failure (a real @nestjs/throttler + Jest incompatibility, not a logic defect)

CI run #17 on `ca8eda6` **failed again at the same "Database integration and concurrency tests"
step** - confirmed from the actual job log, not the badge. This time every one of the new suite's
own tests failed with `ReferenceError: You are trying to import a file after the Jest environment
has been torn down`, with the real cause one level up: `Must use import to load ES Module:
.../@nestjs/common/index.js`, triggered by `CheckoutController`'s new `import { Throttle } from
'@nestjs/throttler'` from the previous follow-up. This is not a new bug - it is the _exact_
incompatibility `auth.integration-spec.ts`'s own `TestAuthAppModule` comment already documents:
`@nestjs/throttler` 6.7.1's CommonJS build `require()`s the now-ESM-only `@nestjs/common`, which
real Node resolves via CJS/ESM interop but Jest's `--experimental-vm-modules` worker cannot,
crashing the moment anything imports the package. BC-005 worked around this by excluding
`ThrottlerModule` from its own integration test wiring; this task's new per-route `@Throttle()`
decorator reintroduced the same import at the controller-file level, which every test that loads
`CheckoutController` (including ones unrelated to checkout, since Jest parses the whole import
graph) now transitively hit. **Reverted** - `CheckoutController` no longer imports `@nestjs/throttler`
at all; the app-wide `ThrottlerGuard` baseline (`AuthModule`, 30/min/IP) still applies to
`POST /checkout` regardless, since it is a global `APP_GUARD`. `RISK-014`/`TD-017`/
`ORDER-MANAGEMENT-DESIGN.md` updated to describe the reverted mitigation accurately. Re-verified
locally: lint/typecheck/format/build/143 unit tests clean, and the integration suite now fails only
on the documented local DB-credential limitation (confirmed by running it directly - the Jest
module-loading error is gone, replaced by the same `PrismaClientInitializationError` every other
suite in this project hits locally).

## BC-008 follow-up #3 — restoring the throttle properly, an open-order cap, a TOCTOU fix, and finally fixing local integration-test execution

Two more rounds of automated security review, both addressed directly rather than just acknowledged:

1. **The previous revert was correctly flagged as a regression, not a fix.** Restored
   `CheckoutController`'s stricter `@Throttle` by actually solving the Jest incompatibility instead
   of avoiding it: `@nestjs/throttler` is now mapped to a no-op mock
   (`apps/api/test/mocks/throttler.mock.ts`) via `moduleNameMapper` in both Jest configs, so
   production code uses the real package unmodified while tests treat it as absent - this is the
   fix class `auth.integration-spec.ts`'s own comment already anticipated, generalized so no future
   test file needs its own ad hoc exclusion. Also added
   `CheckoutService.MAX_OPEN_ORDERS_PER_CUSTOMER` (5, a documented placeholder, not tuned policy) -
   `doCreateOrder` now rejects a new order once a customer already has that many `CREATED` orders.
2. **A genuine TOCTOU race on that same open-order count**, flagged immediately after: two
   concurrent `createOrder` calls for the same customer (different idempotency keys) could both
   read the count before either committed. Fixed with `pg_advisory_xact_lock(hashtext(userId))`,
   acquired first inside the transaction - serializes every order-creation attempt for one customer
   without touching cross-customer concurrency.

**Separately, and far more significantly**: in response to the user directly asking why every push
keeps failing CI and why this isn't being caught beforehand, investigated the actual root cause
rather than repeating "the documented local-environment limitation." Confirmed directly that this
machine's native Windows PostgreSQL 17 (bound to port 5432, not the project's own Docker setup) has
**no PostGIS extension installed at all** (`Could not open extension control file ".../postgis
.control"`) and a **permanently failed `init` migration** from some earlier attempt - meaning no
integration test has ever been able to run past its first database connection on this machine, for
any BC-004 through BC-007 milestone either, not just this one. With the user's explicit approval,
started Docker Desktop and ran the project's own `docker-compose` Postgres+PostGIS container
(`postgis/postgis:16-3.4`) on an alternate port, **5433**, to avoid the port conflict with the
native install, then applied all 5 migrations to both `dropzo` and `dropzo_test`, seeded, and ran
the full integration suite for real.

**First real local run immediately caught a genuine bug this exact session's own advisory-lock fix
had introduced**: `pg_advisory_xact_lock()` returns `void`, which `$queryRaw` cannot deserialize
("Failed to deserialize column of type 'void'") - every other pre-existing suite (8/8) passed
untouched, isolating the bug precisely to the one new line. Fixed by using `$executeRaw` instead of
`$queryRaw` for that statement. Re-ran the full suite: **all 9 integration suites, 114/114 tests,
pass - including every pre-existing BC-004 through BC-007 suite, now genuinely verified locally for
the first time, not just assumed consistent with a CI badge.** `npm run verify` (all 13 checks) now
passes completely end to end on this machine. `RISK-013`/`TD-014` updated to reflect this.

**BC-008's remaining commits were then pushed and the milestone closed out**: `aa825c8` (initial
implementation) -> `ca8eda6` (CI run #16 fixes) -> `ecc7ec7` (throttle revert) -> `688ea4b` (the
permanent throttle-mock fix + open-order cap) -> `01171eb` (the `pg_advisory_xact_lock` fix found
above). `origin/main` is confirmed at `01171eb` - BC-008 is **Done**, not merely "In Review"; the
task tracker and roadmap previously lagged the actual repository state and have been corrected to
match (no CI run number is claimed for `01171eb` specifically beyond what the commit history and
the owner's own confirmation establish - this session did not independently re-query the GitHub
Actions API for it).

## BC-009 — Merchant order processing and customer pickup (first end-to-end workflow)

Implements the full lifecycle a BC-008 order now goes through after creation: merchant acceptance/
rejection/preparation/ready, a one-time hash-only pickup code, and verified-pickup COD collection
with ledger posting. Design: `ORDER-FULFILMENT-DESIGN.md`, `PICKUP-WORKFLOW-DESIGN.md`. New
migration `20261111090000_bc009_pickup_workflow_checks` (one additive `CHECK` constraint on
`payment_status_history.source`, adding `MERCHANT`) - every table, enum value, and column this
milestone needed (`order_status`'s full lifecycle including `REJECTED`, `pickup_verifications`,
`Merchant.commission_percent`) already existed from BC-004's init migration; confirmed by direct
schema inspection before writing any code, per the task's explicit "never invent a new enum value"
instruction.

**New services**: `LedgerService` (`postCodCollection` - the first application code anywhere in the
repository to write to `ledger_transactions`/`ledger_entries`/`financial_accounts`; find-or-creates
platform/merchant accounts rather than depending on `seed.ts`, which never runs against the
integration-test database), `OutboxService` (the first application code to write to
`outbox_events` - a transactional write only, no dispatch worker yet, see `PICKUP-WORKFLOW-DESIGN.md`'s
"Notifications" section), `PickupVerificationService` (mirrors `OtpService`'s exact cryptographic
pattern: `randomInt` generation, HMAC-SHA256 hashing with a new, dedicated `PICKUP_CODE_HASH_SECRET`,
`timingSafeEqual` comparison, a `SELECT ... FOR UPDATE` row lock before verifying), and
`MerchantOrdersService` (the order-status compare-and-swap machine, reusing the exact
`updateMany({where: {id, status: expected}})` pattern BC-005/006/008 established).

**Reservation-lifecycle fix**: `ReservationService.releaseExpiredOrderReservations`'s query gained
an `order: {status: 'CREATED'}` join filter - without it, an `ACCEPTED` order whose reservation's
`expires_at` had passed (a merchant can take longer than 24 hours to act) would have had its stock
silently released out from under it by the same job that correctly cancels an abandoned, never-
accepted order. Proven directly in `fulfilment.integration-spec.ts`: force-expire an accepted
order's reservation, run the real expiry job, assert nothing was released.

**A real design tension, resolved and documented rather than silently dropped**: hash-only pickup-
code storage is irreversible, but the task also requires a customer be able to view their own code
more than once. Resolved with a process-local, in-memory plaintext cache
(`PickupVerificationService.plaintextCache`, keyed by order id, evicted at the code's own expiry) -
the durable record stays hash-only always; the cache is a documented, accepted single-instance-MVP
limitation (not a security compromise), covered in `PICKUP-WORKFLOW-DESIGN.md`'s "Code retrieval
after the first view" and tracked for a Redis-backed fix in `TECHNICAL-DEBT.md` if this project
ever scales beyond one instance.

**Testing**: 32 new unit tests (`ledger.service.spec.ts` 4, `pickup-verification.service.spec.ts`
11, `reservation.service.spec.ts` +5 new, `merchant-orders.service.spec.ts` 17) plus an 18-test
real-database integration suite (`fulfilment.integration-spec.ts`) covering merchant/customer
ownership isolation both directions, the full accept/reject/prepare/ready/complete lifecycle and
its compare-and-swap concurrency safety (two simultaneous accepts, two simultaneous pickup
verifications - exactly one wins each time), the reservation-expiry-vs-acceptance race described
above, pickup-code hash-only storage and retrieval, COD payment capture atomicity with order
completion, balanced ledger postings, and platform-account reuse across separate orders. Full local
verification run against the Docker PostgreSQL+PostGIS environment set up in BC-008's follow-up:
lint, typecheck, build, all 23 unit suites (181 tests), and all 10 integration suites (132 tests,
including the 18 new ones) pass. The new migration was applied to both `dropzo` and `dropzo_test`,
and the deterministic seed re-run cleanly afterward.

Not yet committed or pushed, per the task's explicit instruction - the working tree is left for the
owner's review and authorization.

## BC-010 — Home delivery management

Implements the full home-delivery lifecycle BC-009 deliberately excluded: admin-controlled manual
assignment (ADR-0010), delivery-partner onboarding/activation, the partner's own
accept/reject/collect/out-for-delivery/verify/fail workflow, hash-only one-time delivery
verification codes, the delivery-fee ledger leg `DATABASE-DESIGN.md` had left open, and COD
cash-handover reconciliation. Design: `DELIVERY-MANAGEMENT-DESIGN.md`, `DELIVERY-PARTNER-DESIGN.md`,
`COD-DELIVERY-RECONCILIATION-DESIGN.md`.

**No table-creation migration needed for the core tables.** `delivery_partners`,
`delivery_assignments`, `delivery_events`, `service_zones`, and the `order_status` enum values this
milestone needed (`ASSIGNED`, `PICKED_UP`, `OUT_FOR_DELIVERY`, `DELIVERED`, `DELIVERY_FAILED`) were
all already modeled by BC-004 and left completely unused until now - confirmed by direct schema
inspection before writing any code, same discipline BC-009 followed. Three small, additive
migrations: `20261111115032_bc010_delivery_workflow` (new columns on `delivery_assignments` for the
full lifecycle/COD tracking, two new tables - `delivery_verifications`, `delivery_cod_handovers` -
a `CHECK` constraint on `delivery_status`, and a partial unique index enforcing one active
assignment per partner), `20261111120500_bc010_delivery_payment_source_check` (adds
`'DELIVERY_PARTNER'` to `payment_status_history.source`, the same kind of gap BC-009 found for
`'MERCHANT'`), and `20261111120600_bc010_delivery_grants` (see "Two real bugs found" below).

**New services** (`apps/api/src/delivery/`): `DeliveryPartnerService` (onboarding/activation,
reuses `is_approved` as the single active flag rather than a separate KYC pipeline),
`DeliveryAssignmentService` (admin eligible-queue/assign/reassign/cancel - one `DeliveryAssignment`
row per order, reused across reassignments; a partner's one-active-assignment limit is DB-enforced
via a partial unique index, not just application logic), `DeliveryWorkflowService` (the partner's
own compare-and-swap state machine, reusing `MerchantOrdersService.transition()`'s exact pattern;
`completeDelivery` atomically verifies the code, consumes the reservation, captures COD, posts the
ledger, and transitions the order `OUT_FOR_DELIVERY -> DELIVERED -> COMPLETED` in one transaction -
mirrors `completePickup` precisely), `DeliveryVerificationService` (structurally mirrors
`PickupVerificationService` - same `randomInt`/HMAC-SHA256/`timingSafeEqual`/row-lock pattern - but
its own table, its own `DELIVERY_CODE_HASH_SECRET`, its own in-memory plaintext cache), and
`DeliveryCodService` (derives a partner's cash-in-custody balance from collection records, never a
stored counter; records handovers with duplicate/not-yet-collected/wrong-partner validation).
`LedgerService` gained `postDeliveryCodCollection` - the delivery partner always collects the cash
at the doorstep, so gross (including delivery fee) enters `COD_CASH_CLEARING` exactly like pickup
COD; the delivery fee itself is a separate `PLATFORM_DELIVERY_REVENUE` credit, never commissioned.

**Two real bugs found and fixed while building this task's own integration tests** (neither
previously discovered, since no earlier task's tests exercised these code paths):

1. `StoreService.createStore`'s raw SQL `INSERT` passed `serviceZoneId` without a `::uuid` cast -
   fails the instant any caller actually supplies a service zone (every pre-BC-010 test created
   stores with no service zone at all). One-line fix.
2. The restricted runtime role (`dropzo_app`, which `PrismaService` actually connects as) had no
   privileges on the two new tables - the init migration's blanket `GRANT ... ON ALL TABLES`
   covers only tables that existed at that migration's own run time, the exact situation BC-005
   found for `otp_challenges`. Fixed with an explicit `GRANT` migration, following that precedent.

**A third bug - a real IDOR - was caught by an automated post-implementation security review and
fixed in this same session**: `MerchantDeliveryController.getOne` (`GET .../orders/:orderId/delivery`)
ignored `storeId` entirely and called `DeliveryAssignmentService.getAssignment(orderId)` directly -
any authenticated `MERCHANT_OWNER` who knew or guessed another merchant's order id could view that
order's delivery assignment (partner name/phone, COD amounts, event history). Fixed by adding
`DeliveryAssignmentService.getOwnedByMerchant(userId, storeId, orderId)`, which resolves the order
scoped to `storeId` and checks `merchant.owner_user_id === userId` before ever touching the
assignment - the same ownership-check shape `confirmMerchantHandover` already used correctly on the
sibling endpoint. A new regression test ("never lets a different merchant view another merchant's
delivery assignment") was added to `delivery.integration-spec.ts` and passes; the full suite was
re-verified after the fix (22/22 integration tests in this file, 154/154 across the whole
integration suite, 184/184 unit tests, lint/typecheck/format/build all clean).

**Frontend**: first admin UI in the web app - `routes/admin/AdminDeliveryPartnersPage`,
`AdminDeliveryQueuePage`, `AdminCodHandoverPage`; a new `routes/delivery-partner/
DeliveryPartnerInboxPage` (a single screen suffices - a partner has at most one active assignment
at a time, DB-enforced); delivery sections added to the existing `MerchantOrderDetailPage` and
`CustomerOrderDetailPage`; `LandingRedirect` gained `ADMIN`/`DELIVERY_PARTNER` branches. A small
shared-primitives file (`routes/components/FormPrimitives.tsx`) was extracted from
`MerchantOrderDetailPage`'s original inline styled-components - the app's first shared UI
primitives, motivated directly by this task's ~8 new pages.

**Testing**: 7 new unit tests (`ledger.service.spec.ts`, covering the balanced delivery-fee leg,
never commissioning the delivery fee, and omitting the leg when there is no delivery fee) plus a
22-test real-database integration suite (`delivery.integration-spec.ts`) covering partner
onboarding/activation, pickup/delivery exclusivity, concurrency-safe assignment (two admins racing,
one partner double-booked), reassignment-with-preserved-history after a rejection, admin
cancellation, ownership isolation (a partner can't see or act on another partner's assignment, a
merchant can't view another merchant's assignment - the latter a genuine IDOR a post-implementation
security review caught and this session fixed, see below), the full
accept/collect/out-for-delivery/verify lifecycle, hash-only code storage, customer code-visibility
rules, concurrent double-verification safety, cross-partner verification rejection, failed-delivery
handling (no reservation release, no payment change, reassignable afterward), COD handover
reconciliation (balance reduction, duplicate-handover rejection, not-yet-collected rejection), and a
regression check that plain pickup-COD accounting is unchanged (still exactly 2 ledger legs, no
delivery-fee leg). Full local verification: format/lint/typecheck/build pass across every workspace
(API, web, both shared packages); the full existing suite (23 unit test files,
all pre-existing integration suites) was re-run and still passes with no regressions; the new
migrations were applied to both `dropzo` and `dropzo_test`.

FR-ADM-002 (admin-configurable commission/delivery-fee **rules**) stays out of scope - this task
implements the delivery-fee _accounting_ the design already specified, not a configuration screen
for the rates themselves; `ROADMAP.md`'s "next" item is updated to reflect that distinction rather
than silently expanding this task's scope to cover it.

Not committed or pushed, per the task's explicit instruction - the working tree is left for the
owner's review and authorization.

## BC-011 — Design system foundation and UI integration

Status: **In progress** (Stages 1–4 and 6 implemented; Stage 5 partially verified, see below).

### Stage 1 — Audit reconciliation

Corrected `docs/04-design/STITCH-DESIGN-AUDIT.md`, `docs/04-design/UI-SCREEN-COVERAGE.md` and
`docs/04-design/DESIGN-SYSTEM-EXTRACTION.md` against the real Stitch project (id
`3837531702173487386`) and the real `apps/api`/`apps/web` code, in place (no commits made, per
instruction):

- **Stitch screen count**: 38 raw canvas entries = 29 functional UI screens (15 mobile + 14
  desktop; Merchant POS Login has no desktop pair) + 1 Dribbble reference image + 8
  repo-doc-extract knowledge cards. The "30 functional vs 38 total" discrepancy was a header/count
  mismatch in the original audit, not 8 missing screens — the original table already listed every
  reference row.
- **Backend endpoints**: several claimed endpoints existed but at a different path/verb than
  documented (auth OTP, checkout, nested customer/merchant order routes, store `hours`, admin
  merchant approve/reject, inventory receive/adjustments/removals/movements, delivery routes) —
  corrected with the real controller file cited. A public customer-facing store/product-listing
  endpoint, a dedicated merchant-document endpoint, a dedicated bank-details endpoint, and any
  merchant-analytics endpoint were **not found in code** and are now flagged as such rather than
  marked "Active".
- **Coverage recalculated** from the real 29-screen inventory: 0/29 high-fidelity, ~21% (6/29)
  partial wireframe, ~79% (23/29) missing — replacing the prior overstated "100% backend
  readiness" line.

### Stage 2 — Theme

Added `apps/web/src/theme/`: `theme.ts` (typed `DropzoTheme` interface + the one approved
`dropzoTheme` instance, matching `DESIGN-SYSTEM-EXTRACTION.md` §2 exactly — colors, typography
scale, spacing, radii, shadows, plus breakpoints/z-index not in the original doc but needed for
implementation), `media.ts` (breakpoint helpers), `GlobalStyles.ts` (font loading, resets,
`:focus-visible` ring), `styled.d.ts` (typed `DefaultTheme`). Wired once via `<ThemeProvider>` +
`<GlobalStyles />` in `main.tsx`.

### Stage 3 — UI primitives and domain components

18 primitives in `apps/web/src/components/ui/` (`Button`, `IconButton`, `Input`, `OTPInput`,
`Select`, `Checkbox`, `Switch`, `Badge`, `Card`, `Modal`, `Toast`, `Skeleton`, `EmptyState`,
`ErrorState`, `LoadingState`, `QuantityStepper`, `SegmentedControl`, `PageHeader`,
`ResponsiveContainer`) and 6 domain components in `apps/web/src/components/domain/` (`StoreCard`,
`ProductCard`, `ProductQuantityControl`, `OrderStatusStepper`, `FulfillmentSelector`,
`PickupPinCard`). Full inventory and conventions: `docs/04-design/COMPONENT-LIBRARY.md`.
`StoreCard`/`ProductCard`/`FulfillmentSelector` are built but not wired into a route, since Stage 1
confirmed no public store/product-listing backend endpoint exists yet — wiring them to mock data
would have violated the task's "no hardcoded mock business data" constraint.

### Stage 4 — Screen migration

Migrated `AppShell.tsx`, `LoginPage.tsx`, `CustomerOrdersPage.tsx`, `CustomerOrderDetailPage.tsx`.
Refactored `routes/components/FormPrimitives.tsx` and `routes/components/OrderStatusBadge.tsx` to
delegate to the new themed `Button`/`Badge` instead of duplicating hardcoded hex colors — every
other screen that imports them (merchant, admin, delivery-partner pages, all from BC-009/BC-010)
now inherits the new button/badge look without being rewritten. All existing route behaviour, API
integration, auth state, and role-based access were preserved unchanged — only presentation
changed.

### Stage 5 — Visual verification

Started the Vite dev server (`apps/web`, port 5173) and checked `LoginPage` in the browser pane:
Plus Jakarta Sans font and `9999px` pill button radius confirmed via computed styles; desktop,
tablet (768×1024) and mobile (375×812) layouts all rendered without overflow; the primary button
correctly disables/enables based on input; `:focus-visible` shows the deep-blue ring on keyboard
focus; submitting without a running backend correctly rendered the new `ErrorState` component
("Could not sign in" / "Could not send the OTP"); navigating to `/orders` while logged out
correctly redirected to `/login` (`RequireAuth` unaffected by the restyle). **Not checked**:
authenticated order-list/order-detail/pickup-code visuals (backend + PostgreSQL were not running
this session — same pre-existing Docker/WSL2 blocker `docs/07-operations/DEVELOPMENT-SETUP.md`
already documents), and no Stitch screen screenshots were pulled for a pixel-level comparison this
round — `UI-SCREEN-COVERAGE.md`'s "Visual Match" column is explicitly left unchanged rather than
overstated.

### Stage 6 — Tests and documentation

Added 6 new frontend test files: `theme/theme.test.ts` (token values), `components/ui/Button.test.tsx`
(click/disabled/all 4 variants), `components/ui/QuantityStepper.test.tsx` (add/increment/decrement/max),
`components/ui/Modal.test.tsx` (open/closed, Escape, close button),
`components/ui/OTPInput.test.tsx` (digit labels, auto-advance focus, paste splitting),
`components/domain/OrderStatusStepper.test.tsx` (current-step marking, terminal-failure banner,
COMPLETED→Delivered mapping). Added `src/test/renderWithProviders.tsx` (`withTheme` helper) and used
it to fix 3 pre-existing tests (`App.test.tsx`, `AdminDeliveryQueuePage.test.tsx`,
`DeliveryPartnerInboxPage.test.tsx`) that started failing once `AppShell`/`LoginPage` required a
`ThemeProvider` ancestor. Frontend suite: 9 test files / 25 tests, all passing.

Documentation updated: `DESIGN-SYSTEM-EXTRACTION.md`, `UI-SCREEN-COVERAGE.md`,
`STITCH-DESIGN-AUDIT.md` (Stage 1 corrections), new `COMPONENT-LIBRARY.md`,
`TESTING-STRATEGY.md` (frontend test count), this file, and `TASK-TRACKER.md`.
`UI-UX-SPECIFICATION.md` was read but needed no correction.

### Verification performed (actual results)

| Check                              | Result                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------ |
| `nx run web:typecheck`               | Pass                                                                      |
| `nx run web:lint`                    | Pass                                                                      |
| `nx run web:test` (Vitest)           | Pass — 9 files / 25 tests                                                |
| Dev-server visual check (Login page) | Pass — desktop/tablet/mobile, font, radius, focus ring, error state       |
| Authenticated-screen visual check    | **Not checked** — backend/PostgreSQL not running this session            |
| Stitch screen pixel comparison       | **Not checked** — no Stitch screenshots pulled this round                |

### Remaining work / recommended next task

Merchant POS Terminal, Merchant Inventory/Settings/Analytics, Admin Merchant Approvals, Admin
Delivery Queue, and Delivery Partner Inbox screens are not yet migrated to the new design system —
they inherit the new `Button`/`Badge` look via the shared primitives but are not laid out per their
Stitch screens. The customer Home and Store Catalogue screens remain blocked on a public
store/product-listing backend endpoint, which does not exist yet (Stage 1 finding) — recommended
next task: design and implement that endpoint before building those two screens. Not committed or
pushed, per the task's explicit instruction.
