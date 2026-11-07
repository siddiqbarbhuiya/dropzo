#!/usr/bin/env node
// Local development database backup (BC-004, closes TD-005 at the local-development level only -
// see docs/08-quality/TECHNICAL-DEBT.md and docs/07-operations/DATABASE-BACKUP-RESTORE.md).
// Cross-platform (plain Node.js, no OS-specific commands) - run with:
//   node scripts/db-backup.mjs [--db=dropzo|dropzo_test] [--out=<file>]
//
// Dumps via the Postgres container's own pg_dump (matching the server's exact version), through
// `docker compose exec`, so the dump format is always compatible with the server that produced it.
import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..');
const composeDir = resolve(repoRoot, 'infrastructure', 'docker');
const backupsDir = resolve(repoRoot, 'backups');

const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
        const [key, value] = arg.replace(/^--/, '').split('=');
        return [key, value ?? true];
    }),
);

const db = args.db ?? 'dropzo';
const pgUser = process.env.POSTGRES_USER ?? 'postgres';

if (!existsSync(backupsDir)) {
    mkdirSync(backupsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outFile = args.out ?? resolve(backupsDir, `${db}-${timestamp}.dump`);

console.log(`Backing up database "${db}" (via docker compose, user "${pgUser}") to:`);
console.log(`  ${outFile}`);

const dump = spawnSync(
    'docker',
    ['compose', 'exec', '-T', 'postgres', 'pg_dump', '-U', pgUser, '-d', db, '-Fc'],
    { cwd: composeDir, stdio: ['ignore', 'pipe', 'inherit'] },
);

if (dump.error) {
    console.error('Failed to run docker compose - is Docker Desktop running?');
    console.error(dump.error.message);
    process.exit(1);
}
if (dump.status !== 0) {
    console.error(`pg_dump exited with code ${dump.status}.`);
    process.exit(dump.status ?? 1);
}

writeFileSync(outFile, dump.stdout);
console.log(`Backup complete: ${outFile} (${dump.stdout.length} bytes).`);
