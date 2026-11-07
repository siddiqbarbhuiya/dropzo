#!/usr/bin/env node
// Local development database restore (BC-004). Cross-platform (plain Node.js) - run with:
//   node scripts/db-restore.mjs --file=backups/dropzo-2026-11-07.dump [--db=dropzo] --confirm
//
// CAUTION: this overwrites existing objects in the target database (via pg_restore --clean
// --if-exists). It does not touch any other database. Requires --confirm - without it, this
// script only prints what it WOULD do and makes no changes.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..');
const composeDir = resolve(repoRoot, 'infrastructure', 'docker');

const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
        const [key, value] = arg.replace(/^--/, '').split('=');
        return [key, value ?? true];
    }),
);

const db = args.db ?? 'dropzo';
const pgUser = process.env.POSTGRES_USER ?? 'postgres';

if (!args.file) {
    console.error(
        'Usage: node scripts/db-restore.mjs --file=<path-to-dump> [--db=dropzo] --confirm',
    );
    process.exit(1);
}

const dumpPath = resolve(repoRoot, String(args.file));
if (!existsSync(dumpPath)) {
    console.error(`Backup file not found: ${dumpPath}`);
    process.exit(1);
}

console.log('CAUTION: this will overwrite existing objects in the target database.');
console.log(`  Target database : ${db}`);
console.log(`  Backup file      : ${dumpPath}`);
console.log('  Method           : pg_restore --clean --if-exists (drops and recreates objects');
console.log('                     found in the dump; does not touch any other database).');

if (!args.confirm) {
    console.log('\nNo changes made - re-run with --confirm to actually restore.');
    process.exit(0);
}

const dumpContent = readFileSync(dumpPath);

const restore = spawnSync(
    'docker',
    [
        'compose',
        'exec',
        '-T',
        'postgres',
        'pg_restore',
        '-U',
        pgUser,
        '-d',
        db,
        '--clean',
        '--if-exists',
    ],
    { cwd: composeDir, input: dumpContent, stdio: ['pipe', 'inherit', 'inherit'] },
);

if (restore.error) {
    console.error('Failed to run docker compose - is Docker Desktop running?');
    console.error(restore.error.message);
    process.exit(1);
}
if (restore.status !== 0) {
    console.error(`pg_restore exited with code ${restore.status}.`);
    process.exit(restore.status ?? 1);
}

console.log('\nRestore complete. Validate by checking row counts or running the app against it -');
console.log('this script does not verify the restored data itself.');
