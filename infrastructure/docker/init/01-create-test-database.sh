#!/bin/sh
# Runs once, only when the Postgres data volume is first initialized (official Postgres
# entrypoint behaviour) - creates the separate test database alongside the dev database
# created automatically from POSTGRES_DB. Sourced by the entrypoint, not executed directly,
# so no executable bit is required on any host OS (including a Windows bind mount).
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE "$POSTGRES_TEST_DB";
EOSQL
