#!/usr/bin/env node
// Runs every check `.github/workflows/ci.yml` runs, in the same order, locally - so a failure is
// caught before pushing instead of burning GitHub Actions minutes on it. Cross-platform (plain
// Node.js, same approach as the other scripts/*.mjs files) - run with:
//   npm run verify            (everything, including the database-dependent steps)
//   npm run verify -- --skip-db   (only the steps that don't need Postgres running)
//
// Each step is the exact same npm script CI runs - never a different command - so a pass here
// means the same thing a passing CI run means. Stops at the first failure (matching CI: later
// steps depend on earlier ones succeeding), and tells you exactly which command to re-run once
// you've fixed it, instead of re-running everything from the top.
import { spawnSync } from 'node:child_process';

const skipDb = process.argv.includes('--skip-db');

const steps = [
    { name: 'Formatting', command: 'npm', args: ['run', 'format:check'] },
    { name: 'Lint', command: 'npm', args: ['run', 'lint'] },
    { name: 'Typecheck', command: 'npm', args: ['run', 'typecheck'] },
    { name: 'Unit tests (API, web, shared packages)', command: 'npm', args: ['run', 'test'] },
    {
        name: 'Prisma schema validation',
        command: 'npm',
        args: ['run', 'prisma:validate', '-w', 'apps/api'],
    },
    {
        name: 'Validate seed UUIDs',
        command: 'node',
        args: ['scripts/validate-seed-uuids.mjs'],
    },
    {
        name: 'Apply migrations to the development database',
        command: 'npm',
        args: ['run', 'prisma:migrate:deploy', '-w', 'apps/api'],
        db: true,
    },
    {
        name: 'Apply migrations to the test database',
        command: 'npm',
        args: ['run', 'prisma:migrate:deploy:test', '-w', 'apps/api'],
        db: true,
    },
    {
        name: "Set the dropzo_app role's password",
        command: 'npm',
        args: ['run', 'prisma:set-app-password', '-w', 'apps/api'],
        db: true,
    },
    {
        name: 'Run the deterministic seed (first execution)',
        command: 'npm',
        args: ['run', 'db:seed', '-w', 'apps/api'],
        db: true,
    },
    {
        name: 'Re-run the seed to verify idempotency',
        command: 'npm',
        args: ['run', 'db:seed', '-w', 'apps/api'],
        db: true,
    },
    {
        name: 'Database integration and concurrency tests',
        command: 'npm',
        args: ['run', 'test:integration', '-w', 'apps/api'],
        db: true,
    },
    { name: 'Production builds', command: 'npm', args: ['run', 'build'] },
];

const toRun = skipDb ? steps.filter((s) => !s.db) : steps;

console.log(
    `Running ${toRun.length} check(s)${skipDb ? ' (--skip-db: database steps skipped)' : ''}.\n`,
);

for (const [index, step] of toRun.entries()) {
    const label = `[${index + 1}/${toRun.length}] ${step.name}`;
    console.log(`\n${'='.repeat(label.length)}\n${label}\n${'='.repeat(label.length)}`);

    // Passed as one joined command string (not command + args array) with shell:true - Node
    // warns about escaping when those are combined; a single string has no such ambiguity, and
    // every argument here is a static, hardcoded literal, never external input.
    const result = spawnSync(`${step.command} ${step.args.join(' ')}`, {
        stdio: 'inherit',
        shell: true,
    });

    if (result.status !== 0) {
        console.error(`\nFAILED: ${step.name}`);
        console.error(`Re-run just this check with: ${step.command} ${step.args.join(' ')}`);
        process.exit(result.status ?? 1);
    }
}

console.log(`\nAll ${toRun.length} check(s) passed.`);
if (skipDb) {
    console.log('(Database-dependent steps were skipped - run without --skip-db before pushing.)');
}
