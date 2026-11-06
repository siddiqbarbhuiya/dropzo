# Deployment guide

**Status: Planned.** Nothing is deployed yet — this project runs locally only. This captures the
intended direction from earlier planning so a future deployment task has a starting point.

## Intended approach: free-tier-first, managed services

| Component          | Candidate service             | Status  |
| ------------------ | ----------------------------- | ------- |
| Frontend           | Cloudflare Pages              | Planned |
| Backend API        | Render, Railway, or Cloud Run | Planned |
| Database           | Neon or Supabase (PostgreSQL) | Planned |
| Object storage     | Cloudflare R2                 | Planned |
| Push notifications | Firebase Cloud Messaging      | Planned |
| Monitoring         | Sentry                        | Planned |
| CI/CD              | GitHub Actions                | Planned |

CAUTION: These are candidate services, not commitments. Verify current pricing, free-tier limits,
and commercial-use terms before choosing one — none of this has been set up yet.

## Environments (Planned)

Three environments: development (local), staging, production. Separate databases and credentials
per environment; never use production data in development.

## Related documents

- [`DEVELOPMENT-SETUP.md`](DEVELOPMENT-SETUP.md)
- [`../03-decisions/ADR-0005-postgresql-database.md`](../03-decisions/ADR-0005-postgresql-database.md)
- [`../08-quality/TECHNICAL-DEBT.md`](../08-quality/TECHNICAL-DEBT.md)
