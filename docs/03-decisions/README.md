# Architecture Decision Records

An ADR captures one significant, genuinely-decided technical or business decision, and why it was
made. Use [`../_templates/ADR-TEMPLATE.md`](../_templates/ADR-TEMPLATE.md) to create a new one.

Only create an ADR for a decision that has actually been approved. A decision that merely appeared
in an old proposal is not automatically "Accepted" — verify it against the current repository
first.

## Index

| ADR                                                      | Title                                                                 | Status                            |
| -------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------- |
| [0001](ADR-0001-modular-monolith.md)                     | Modular monolith architecture                                         | Accepted                          |
| [0002](ADR-0002-npm-workspaces-nx.md)                    | npm workspaces with Nx orchestration                                  | Accepted                          |
| [0003](ADR-0003-react-vite-frontend.md)                  | React + Vite frontend                                                 | Accepted                          |
| [0004](ADR-0004-nestjs-rest-backend.md)                  | NestJS REST backend                                                   | Accepted                          |
| [0005](ADR-0005-postgresql-database.md)                  | PostgreSQL as the relational database                                 | Accepted                          |
| [0006](ADR-0006-prisma-orm-planned.md)                   | Prisma as the intended ORM                                            | Accepted (implementation planned) |
| [0007](ADR-0007-merchant-owned-inventory-launch.md)      | Merchant-owned inventory at launch                                    | Accepted                          |
| [0008](ADR-0008-one-store-per-order-mvp.md)              | One store per order for MVP                                           | Accepted                          |
| [0009](ADR-0009-cod-first-payments.md)                   | COD-first payment strategy                                            | Accepted                          |
| [0010](ADR-0010-pickup-manual-delivery.md)               | Pickup and manual delivery workflow                                   | Accepted                          |
| [0011](ADR-0011-docs-as-code-canonical-source.md)        | Repository documentation as canonical source of truth                 | Accepted                          |
| [0012](ADR-0012-pwa-first-strategy.md)                   | PWA-first product strategy                                            | Accepted                          |
| [0013](ADR-0013-phone-otp-auth-opaque-refresh-tokens.md) | Phone+OTP auth, stateless access tokens, opaque hashed refresh tokens | Accepted                          |

## Related documents

- [`../02-architecture/SYSTEM-ARCHITECTURE.md`](../02-architecture/SYSTEM-ARCHITECTURE.md)
