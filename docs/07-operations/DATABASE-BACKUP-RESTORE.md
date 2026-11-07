# Database backup and restore (local development)

**Status: Accepted.** Closes [`TECHNICAL-DEBT.md`](../08-quality/TECHNICAL-DEBT.md)'s TD-005 at the
local-development level only. Production backup/restore is a separate, later deployment-time
concern - see [`DEPLOYMENT-GUIDE.md`](DEPLOYMENT-GUIDE.md) - and is **not** what this page covers.
Nothing here is a disaster-recovery guarantee; it is a practical way to snapshot and restore your
own local Postgres container while developing.

## How it works

Both scripts shell out to the Postgres container's own `pg_dump`/`pg_restore` (via
`docker compose exec`), so the dump format always matches the exact server version that produced
it - no separate client-tool install needed.

## Backup

```bash
npm run db:backup
```

Writes a timestamped custom-format dump to `backups/<db>-<timestamp>.dump` (the `backups/`
directory is git-ignored except for a `.gitkeep`). To back up the test database, or choose the
output path explicitly:

```bash
node scripts/db-backup.mjs --db=dropzo_test
node scripts/db-backup.mjs --db=dropzo --out=backups/before-migration.dump
```

Requires `infrastructure:dev` to already be running (`nx run infrastructure:dev`).

## Restore

CAUTION: restoring **overwrites existing objects** in the target database
(`pg_restore --clean --if-exists`). It does not touch any other database, and it never runs
without `--confirm` - without that flag, the script only prints what it would do.

```bash
node scripts/db-restore.mjs --file=backups/dropzo-2026-11-07T12-00-00-000Z.dump --confirm
```

To restore into the test database instead of the dev one:

```bash
node scripts/db-restore.mjs --file=<path> --db=dropzo_test --confirm
```

## Database selection

- `--db` selects the target database by name (`dropzo` or `dropzo_test` in this project's default
  setup - see [`DEVELOPMENT-SETUP.md`](DEVELOPMENT-SETUP.md)). Both scripts default to `dropzo`.
- The Postgres user is read from the `POSTGRES_USER` environment variable (same default as
  [`infrastructure/docker/docker-compose.yml`](../../infrastructure/docker/docker-compose.yml)) if
  set, otherwise `postgres`.

## Validation after restore

Neither script verifies the restored data's correctness - after restoring, confirm it manually:

```bash
npm run prisma:migrate:status -w apps/api
```

and spot-check a few expected rows (e.g. via `npx prisma studio -w apps/api`, or `psql`) before
relying on the restored database for further work.

## Related documents

- [`DEVELOPMENT-SETUP.md`](DEVELOPMENT-SETUP.md)
- [`../08-quality/TECHNICAL-DEBT.md`](../08-quality/TECHNICAL-DEBT.md) (TD-005)
- [`DEPLOYMENT-GUIDE.md`](DEPLOYMENT-GUIDE.md) (production backup/restore - separate, later task)
