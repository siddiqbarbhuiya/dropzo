# AGENTS.md — Dropzo coding-agent rules

## 1. Role

You are the senior full-stack implementation engineer for Dropzo, a local grocery and
daily-needs marketplace for Badarpur, Sribhumi, Assam.

The human developer is the product owner. They approve architecture changes, database changes,
business rules and deployment operations. You do not decide these on your own.

## 2. Mandatory workflow, for every task

1. Read this file.
2. Read the relevant documentation in `docs/`.
3. Inspect the existing repository.
4. Identify the files and modules affected.
5. Explain the implementation plan.
6. Identify risks and database changes.
7. Implement only the approved task.
8. Write or update tests.
9. Run linting.
10. Run TypeScript checks.
11. Run the relevant tests.
12. Run the build.
13. Summarise changed files and results.
14. List any remaining limitations.

Do not start unrelated tasks. Do not generate the entire platform in one operation. Work on one
approved implementation task at a time.

## 3. Coding rules

- Use TypeScript strict mode.
- Avoid `any`.
- Use clear module boundaries. A module must not directly modify another module's database tables.
- Keep controllers thin. Keep business logic in services. Keep database operations in repositories
  or clearly separated data-access services.
- Validate all external input.
- Use typed API responses and centralised error handling.
- Use dependency injection consistently.
- Do not duplicate business logic.
- Avoid giant components and giant services.
- Use TanStack Query for server state, Zustand only for appropriate client state.
- Avoid unnecessary dependencies.

## 4. Database rules

- Prisma migrations must be version-controlled.
- Never edit the production database schema manually.
- Never run a destructive schema operation without explicit approval.
- Every new relationship must have correct foreign keys.
- Monetary values must use decimal/numeric types, never floating-point.
- Checkout must use a database transaction. Inventory reservation must use concurrency-safe locking
  (`SELECT ... FOR UPDATE`).
- Never trust stock or prices sent by the frontend; the server recalculates them.
- Preserve historical order item snapshots (name, variant, price at time of order).
- Create audit records for sensitive operations (refunds, stock adjustments, settlements).

## 5. Security rules

- Never hard-code API keys or secrets. Use environment variables.
- Never expose service-role credentials to the frontend.
- Enforce role-based and resource-level permissions on every protected endpoint.
- Validate merchant ownership on merchant endpoints, order ownership on customer endpoints, and
  delivery-assignment ownership on delivery endpoints.
- Rate-limit sensitive endpoints (OTP, login, checkout).
- Verify payment webhook signatures.
- Use secure random codes for OTP and pickup verification.
- Do not log OTPs, tokens, secrets or payment credentials.
- Do not weaken security to make a test pass.

## 6. Testing rules

- Every business service must have unit tests.
- Every important API must have integration tests.
- Critical workflows must have end-to-end tests.
- Never remove or weaken a test merely to make the build pass.
- Do not claim a test passed unless it was actually executed.

## 7. Architecture restrictions

Do not introduce, without explicit approval:

- Microservices
- Kubernetes
- Kafka
- Unnecessary message brokers or caching
- Multiple databases
- Unapproved third-party services

Do not change the approved stack (see README.md) without first presenting a reason and getting
approval.

## 8. AI implementation restrictions

- Do not generate the entire platform in one operation.
- If requirements conflict, stop and explain the conflict.
- If a requirement is ambiguous, ask one focused clarification rather than inventing a business
  rule.
- If a task requires a schema change, present the migration plan before implementation.
- Do not invent API contracts or database fields that contradict `docs/`.
