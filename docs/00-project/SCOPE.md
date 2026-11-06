# Scope

**Status: Accepted** (MVP boundary) — this replaces the need for a separate SRS document; see
[`../05-engineering/DOCUMENTATION-STANDARDS.md`](../05-engineering/DOCUMENTATION-STANDARDS.md) for
why.

## Product categories (MVP)

- Groceries and staples (rice, pulses, flour, oil, spices)
- Dairy and refrigerated products
- Beverages
- Bakery and cakes
- Fruits and vegetables
- Packaged foods
- Household products
- Personal care
- Stationery and books

**Deferred**: meat and fish, until supplier, hygiene, and cold-chain requirements are validated.

## MVP functional scope, by role

### Customer

- Phone OTP authentication — **Planned**
- Profile and address management — **Planned**
- Store discovery (nearby, serviceable) — **Planned**
- Product catalogue and search — **Planned**
- Product variants and units (kg, ml, piece, pack) — **Planned**
- Shopping cart (one store per cart) — **Planned**
- Checkout: pickup or home delivery — **Planned**
- Cash on delivery (COD) — **Planned**
- Order history and order detail — **Planned**
- Cancellation requests — **Planned**
- Notifications and support/complaints — **Planned**

### Merchant

- Merchant onboarding and profile — **Planned**
- Store profile and operating hours — **Planned**
- Store open/pause toggle — **Planned**
- Product listings and pricing (store-specific, not global) — **Planned**
- Stock management — **Planned**
- Order acceptance/rejection — **Planned**
- Order preparation and "ready" status — **Planned**

### Admin

- Merchant and store approval/management — **Planned**
- Customer management — **Planned**
- Product and category management — **Planned**
- Order monitoring — **Planned**
- Manual delivery assignment — **Planned**
- Commission and delivery-fee configuration — **Planned**
- Cancellation/refund management — **Planned**
- Service-zone configuration — **Planned**
- Complaints and support queue — **Planned**
- Audit log — **Planned**

See [`../01-requirements/FUNCTIONAL-REQUIREMENTS.md`](../01-requirements/FUNCTIONAL-REQUIREMENTS.md)
for the requirement IDs behind each of these.

## What is implemented today

Only this, as of BC-003:

- `GET /api/v1/health` — backend health check (**Implemented**)
- Swagger/OpenAPI docs at `/api/docs` in non-production environments (**Implemented**)
- One frontend page showing the Dropzo name and a live backend health check (**Implemented**)

Everything else above is **Planned**, not built.

## Explicitly deferred (not MVP commitments)

- Multi-store checkout (one cart can only hold items from one store in the MVP)
- AI-based product recommendations
- Loyalty / points programmes
- Subscription plans
- Dynamic/surge delivery pricing
- Automated rider route optimisation (manual admin assignment at launch)
- Advanced analytics dashboards
- Microservices architecture
- Kubernetes
- Kafka or any message broker
- Native (Android/iOS) applications — PWA only for now
- Advanced warehouse management and automated procurement
- Online payments (COD only at launch; online payment is a later phase)

## Related documents

- [`../01-requirements/FUNCTIONAL-REQUIREMENTS.md`](../01-requirements/FUNCTIONAL-REQUIREMENTS.md)
- [`../01-requirements/NON-FUNCTIONAL-REQUIREMENTS.md`](../01-requirements/NON-FUNCTIONAL-REQUIREMENTS.md)
- [`../06-delivery/ROADMAP.md`](../06-delivery/ROADMAP.md)
