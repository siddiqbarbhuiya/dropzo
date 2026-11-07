#!/usr/bin/env node
// Sets the restricted `dropzo_app` role's password, out-of-band from the migration that creates
// it (see apps/api/prisma/migrations/20261107120000_init/migration.sql for why the migration
// itself never contains a credential). Run once per environment after that migration applies:
//   npm run prisma:set-app-password -w apps/api
//
// Reads the target password from APP_DATABASE_URL (so there is exactly one place the password is
// configured) and connects as the superuser via DATABASE_URL to set it. Uses @prisma/client
// (already a dependency of apps/api) rather than adding a new one just for this.
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
const appDatabaseUrl = process.env.APP_DATABASE_URL;

if (!databaseUrl) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
}
if (!appDatabaseUrl) {
    console.error('APP_DATABASE_URL is not set - nothing to set the role password to.');
    process.exit(1);
}

const appUrl = new URL(appDatabaseUrl);
const role = decodeURIComponent(appUrl.username);
const password = decodeURIComponent(appUrl.password);

if (!role || !password) {
    console.error('APP_DATABASE_URL must include a username and password.');
    process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

try {
    // Password values cannot be parameterized in ALTER ROLE - format()/quote_literal() build the
    // statement safely server-side instead of string-interpolating it into the SQL client-side.
    const [{ format: statement }] = await prisma.$queryRaw`
        SELECT format('ALTER ROLE %I PASSWORD %L', ${role}, ${password}) AS format
    `;
    await prisma.$executeRawUnsafe(statement);
    console.log(`Password set for role "${role}".`);
} finally {
    await prisma.$disconnect();
}
