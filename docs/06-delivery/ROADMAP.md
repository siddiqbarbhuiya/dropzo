# Roadmap and implementation plan

**Status: Accepted** (direction) — specific dates are not commitments; see the caution in
[`../01-requirements/NON-FUNCTIONAL-REQUIREMENTS.md`](../01-requirements/NON-FUNCTIONAL-REQUIREMENTS.md).
This merges what might otherwise be a separate `IMPLEMENTATION-PLAN.md` — for a solo developer,
the roadmap and the implementation plan are the same document; see
[`../05-engineering/DOCUMENTATION-STANDARDS.md`](../05-engineering/DOCUMENTATION-STANDARDS.md).

## Completed

| Task     | What it delivered                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| BC-001   | Repository foundation: monorepo structure, `README.md`, `AGENTS.md`, `.env.example`                                                  |
| BC-002   | Development tooling: TypeScript/ESLint/Prettier/Jest/Vitest, NestJS health endpoint + Swagger, React shell with a live backend check |
| BC-002.1 | Nx integration (task orchestration + local caching) and a full dependency security audit                                             |
| BC-003   | This documentation governance system                                                                                                 |

Full detail: [`PROGRESS.md`](PROGRESS.md).

## Next (recommended order, not yet started)

1. **Business validation** — confirm merchant and customer interest in Badarpur before more
   engineering (see [`../00-project/PRODUCT-VISION.md`](../00-project/PRODUCT-VISION.md)). This is
   a business task, not a coding task, and can run in parallel with the items below.
2. **Database and Prisma implementation** — introduce PostgreSQL, the proposed schema from
   [`../04-design/DATABASE-DESIGN.md`](../04-design/DATABASE-DESIGN.md), and Prisma migrations.
   Explicitly out of scope for BC-001 through BC-003.
3. **Authentication module** — phone OTP login, sessions, RBAC (FR-AUTH-001 through FR-AUTH-003).
4. **Merchant/store module** — onboarding, store profile, operating hours (FR-MER-001 onward).
5. **Catalogue and inventory modules** — products, variants, store listings, stock (FR-CAT-_,
   FR-INV-_).
6. **Cart, checkout, and orders** — the first real customer transaction (FR-CART-_, FR-ORD-_).
7. **Pickup workflow** — the first complete end-to-end milestone: a customer orders, a merchant
   prepares, the customer collects with a verified code.
8. **Delivery, payments (COD), and admin controls** — extend the above to cover delivery and give
   an admin operational control.
9. **Security remediation task** — resolve the `react-router-dom` production vulnerability and
   evaluate the Vite/Vitest major-version upgrade (see
   [`../08-quality/RISK-REGISTER.md`](../08-quality/RISK-REGISTER.md)). This can run independently
   of the above, whenever convenient.

Each numbered item above should become its own task in
[`TASK-TRACKER.md`](TASK-TRACKER.md) with requirement references, rather than being executed as
one large undifferentiated effort — see the mandatory workflow in [`AGENTS.md`](../../AGENTS.md).

## Related documents

- [`TASK-TRACKER.md`](TASK-TRACKER.md)
- [`PROGRESS.md`](PROGRESS.md)
- [`../08-quality/RISK-REGISTER.md`](../08-quality/RISK-REGISTER.md)
