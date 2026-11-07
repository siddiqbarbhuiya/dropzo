#!/usr/bin/env node
// Validates every hardcoded UUID literal in apps/api/prisma/seed.ts matches PostgreSQL's uuid
// format (8-4-4-4-12 hex digits). Catches the exact class of defect found in the published
// seed (literal characters like z/p/m/s outside 0-9a-f) before it reaches a real database.
// Cross-platform (plain Node.js) - run with: node scripts/validate-seed-uuids.mjs
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..');
const seedPath = resolve(repoRoot, 'apps', 'api', 'prisma', 'seed.ts');
const content = readFileSync(seedPath, 'utf8');

// Matches any single-quoted string shaped like a UUID (dash positions correct), valid or not -
// so an invalid one (e.g. containing "z") is still caught, not silently skipped.
const UUID_SHAPE =
    /'([0-9a-zA-Z]{8}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{12})'/g;
const VALID_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const found = [...content.matchAll(UUID_SHAPE)].map((m) => m[1]);
const invalid = found.filter((id) => !VALID_UUID.test(id));
const unique = new Set(found);

console.log(
    `Found ${found.length} UUID-shaped literal(s) in prisma/seed.ts (${unique.size} unique).`,
);

if (invalid.length > 0) {
    console.error(`${invalid.length} invalid (not pure hex 0-9a-f):`);
    for (const id of invalid) {
        console.error(`  ERROR: "${id}"`);
    }
    process.exit(1);
}

console.log('All seed UUIDs are valid.');
