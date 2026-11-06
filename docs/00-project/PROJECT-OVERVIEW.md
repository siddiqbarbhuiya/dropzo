# Project overview

**Status: Accepted.**

## What Dropzo is

Dropzo is a local grocery and daily-needs marketplace. It connects customers with nearby
merchants (grocery shops, dairies, bakeries, fruit and vegetable vendors, stationery and book
shops) so customers can order everyday essentials for **pickup** or **home delivery**.

## Where it launches

**Badarpur, Sribhumi, Assam, India.**

The platform is built to expand to other Assam towns later without a rebuild, but the first
operational service zone is deliberately small and local.

## Why this exists

Large quick-commerce platforms (Blinkit, Swiggy Instamart) do not operate in Badarpur. Local
shops have no online ordering channel. Dropzo gives them one, without requiring every shop to
build its own app.

## Who is building it

A solo developer, using Claude Code and other AI coding assistants, on a Windows PC, with minimal
initial investment (free-tier infrastructure where practical, merchant-owned stock rather than a
warehouse).

## Business model, in one paragraph

Dropzo starts as a **hybrid marketplace**: local merchants list and fulfil their own products
under their own stock (merchant-owned inventory). The platform may stock its own fast-moving
products later (platform-owned inventory) once real demand data justifies it — the data model
supports this from day one, but it is not built in the MVP. See
[`03-decisions/ADR-0007-merchant-owned-inventory-launch.md`](../03-decisions/ADR-0007-merchant-owned-inventory-launch.md).

## Related documents

- [`PRODUCT-VISION.md`](PRODUCT-VISION.md) — the longer-term vision and differentiation
- [`SCOPE.md`](SCOPE.md) — what is and is not in the MVP
- [`GLOSSARY.md`](GLOSSARY.md) — terms used throughout these docs
- [`../01-requirements/`](../01-requirements/) — detailed requirements
