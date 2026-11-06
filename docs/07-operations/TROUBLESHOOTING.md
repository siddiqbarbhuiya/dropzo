# Troubleshooting

**Status: Accepted** — these are real issues encountered and fixed during BC-002/BC-002.1, kept
here so they aren't rediscovered from scratch.

## `EBADENGINE` warnings during `npm install`

Expected on Node.js v25.7.0 — `@angular-devkit/*` and `@nestjs/schematics` state a narrower
supported Node range. This is a warning, not a failure; every check in this project passes on
v25.7.0. See [`DEVELOPMENT-SETUP.md`](DEVELOPMENT-SETUP.md).

## `ERESOLVE` dependency conflict mentioning a stale package version

If `npm install` reports a conflicting peer dependency referencing an unexpected old version
(e.g. `@dropzo/api@0.0.1` when the real version is `0.1.0`), the lockfile may be stale from an
interrupted install. Fix: delete `node_modules` and `package-lock.json`, then run `npm install`
again.

## A test that worked alone fails when run via `nx run-many`

This happened once in BC-002.1: installing an Nx plugin reshuffled npm's dependency hoisting and
broke `apps/web`'s Vitest run (`@testing-library/jest-dom` got hoisted without `vitest` next to
it). Fix: add the missing package as an explicit root `devDependency` so it hoists correctly, then
reinstall and re-run.

## NestJS fails with `Cannot use 'import.meta' outside a module` or similar ESM errors

NestJS 12+ ships as ESM-only. `apps/api` is already configured for this (`"type": "module"`,
`NodeNext` module resolution, `.js` extensions on relative imports, Jest run with
`NODE_OPTIONS=--experimental-vm-modules`). If a new file breaks this, check it uses a default
import for CJS packages (`import Joi from 'joi'`, not `import * as Joi from 'joi'`) and that
relative imports end in `.js`.

## `npm audit fix` reports no changes despite vulnerabilities existing

This is expected when every available fix requires a major-version upgrade (`isSemVerMajor: true`
in the audit JSON). `npm audit fix` (without `--force`) only applies non-breaking fixes. See
[`../08-quality/RISK-REGISTER.md`](../08-quality/RISK-REGISTER.md) for what's currently unresolved
and why.

## Related documents

- [`DEVELOPMENT-SETUP.md`](DEVELOPMENT-SETUP.md)
- [`../06-delivery/PROGRESS.md`](../06-delivery/PROGRESS.md)
