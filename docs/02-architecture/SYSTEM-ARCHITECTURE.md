# System architecture

**Status:** Sections are individually labelled **Implemented** or **Proposed**. This document
covers backend and frontend architecture together — see
[`../05-engineering/DOCUMENTATION-STANDARDS.md`](../05-engineering/DOCUMENTATION-STANDARDS.md) for
why they are not split into separate files.

## Architectural principle: modular monolith first

**Accepted.** See [`../03-decisions/ADR-0001-modular-monolith.md`](../03-decisions/ADR-0001-modular-monolith.md).
One deployable backend, internally organised into independent modules. No microservices, Kafka,
Redis, or Kubernetes without a new ADR.

## System context (Proposed — target shape, most actors not built yet)

```mermaid
C4Context
    title Dropzo — System Context (proposed)

    Person(customer, "Customer", "Orders groceries for pickup or delivery")
    Person(merchant, "Merchant", "Manages their store, stock and orders")
    Person(admin, "Admin", "Operates the platform")
    Person(rider, "Delivery partner", "Delivers orders (planned)")

    System(dropzo, "Dropzo", "Local grocery and daily-needs marketplace")

    System_Ext(otp, "OTP provider", "Phone verification (planned)")
    System_Ext(payment, "Payment gateway", "Online payments (planned)")
    System_Ext(maps, "Maps/geocoding", "Location and distance (planned)")
    System_Ext(push, "Push notifications", "Firebase Cloud Messaging (planned)")

    Rel(customer, dropzo, "Browses, orders, tracks")
    Rel(merchant, dropzo, "Manages store and orders")
    Rel(admin, dropzo, "Operates and monitors")
    Rel(rider, dropzo, "Accepts and completes deliveries")
    Rel(dropzo, otp, "Verifies phone numbers")
    Rel(dropzo, payment, "Processes online payments")
    Rel(dropzo, maps, "Checks serviceability and distance")
    Rel(dropzo, push, "Sends notifications")
```

## Container view (mixed: frontend/backend Implemented, data stores Proposed)

```mermaid
flowchart TB
    subgraph Frontend["apps/web — Implemented shell, Planned business screens"]
        WEB["React + Vite PWA<br/>(customer/merchant/admin, route-separated)"]
    end

    subgraph Backend["apps/api — Implemented foundation"]
        API["NestJS modular monolith<br/>prefix: /api/v1"]
        SWAGGER["Swagger UI — /api/docs<br/>(non-production)"]
    end

    subgraph Data["Proposed — not yet implemented"]
        DB[("PostgreSQL + PostGIS")]
        CACHE[("Redis — only if justified later")]
    end

    WEB -->|"REST, JSON<br/>VITE_API_BASE_URL"| API
    API --> SWAGGER
    API -.->|planned| DB
    API -.->|planned, not yet needed| CACHE
```

## Backend module boundaries

```mermaid
flowchart LR
    subgraph Implemented
        AppModule --> ConfigModule
        AppModule --> HealthModule
    end
    subgraph Planned
        AppModule -.-> AuthModule
        AppModule -.-> UsersModule
        AppModule -.-> MerchantsModule
        AppModule -.-> StoresModule
        AppModule -.-> CatalogModule
        AppModule -.-> InventoryModule
        AppModule -.-> CartsModule
        AppModule -.-> CheckoutModule
        AppModule -.-> OrdersModule
        AppModule -.-> PaymentsModule
        AppModule -.-> PickupModule
        AppModule -.-> DeliveryModule
        AppModule -.-> SettlementsModule
        AppModule -.-> NotificationsModule
        AppModule -.-> AdminModule
    end
```

Rule: a module never directly modifies another module's database tables. Modules interact through
service interfaces. See
[`../05-engineering/CODING-STANDARDS.md`](../05-engineering/CODING-STANDARDS.md).

## Frontend application boundaries

```mermaid
flowchart LR
    subgraph Implemented
        Root["/"] --> HomePage
    end
    subgraph Planned
        Root -.-> CustomerRoutes["/ (customer)"]
        Root -.-> MerchantRoutes["/merchant/*"]
        Root -.-> AdminRoutes["/admin/*"]
    end
```

One frontend codebase, route-separated by role, each route enforcing its own authentication and
permission check once authentication exists.

## Technology choices

See [`../03-decisions/README.md`](../03-decisions/README.md) for the ADRs behind each of these.

| Layer            | Technology                          | Status                        |
| ---------------- | ----------------------------------- | ----------------------------- |
| Frontend         | React + TypeScript + Vite           | Implemented                   |
| Routing          | React Router                        | Implemented (one route today) |
| Server state     | TanStack Query                      | Implemented                   |
| Client state     | Zustand                             | Implemented                   |
| Styling          | styled-components                   | Implemented                   |
| Frontend testing | Vitest                              | Implemented                   |
| Backend          | Node.js + TypeScript + NestJS (ESM) | Implemented                   |
| API style        | REST + Swagger/OpenAPI              | Implemented                   |
| Backend testing  | Jest                                | Implemented                   |
| Monorepo         | npm workspaces + Nx                 | Implemented                   |
| Database         | PostgreSQL                          | Proposed, not implemented     |
| ORM              | Prisma                              | Planned, not implemented      |
| E2E testing      | Playwright                          | Planned, not introduced       |
| CI/CD            | GitHub Actions                      | Planned, not configured       |
| Diagrams         | Mermaid in Markdown                 | Implemented (this document)   |

## Related documents

- [`../03-decisions/`](../03-decisions/) — why each of these was chosen
- [`../04-design/DATABASE-DESIGN.md`](../04-design/DATABASE-DESIGN.md) — proposed data model
- [`../04-design/API-SPECIFICATION.md`](../04-design/API-SPECIFICATION.md)
