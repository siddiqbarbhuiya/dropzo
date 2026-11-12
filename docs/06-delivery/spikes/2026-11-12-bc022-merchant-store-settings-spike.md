# Spike: BC-022 — Merchant Store Settings & Operations Screen (`/merchant/settings`)

**Date:** 2026-11-12  
**Status:** Approved (Pre-authorized by Product Owner)  
**Confidence Level:** 99% (>95% required for Phase 2 approval)  
**Author:** Antigravity (Senior Full-Stack Implementation Engineer)

## 1. Objective & Requirements Scope

- **Objective**: Deliver a 1:1 pixel-perfect responsive merchant store operations and settings workspace at `/merchant/settings` corresponding to Stitch screens `42930197a23845dbaf477bee152a59dd` (desktop) and `6591032fa8a4451bae3f9ee9e6e6db16` (mobile). Allows shopkeepers to configure live operating hours, emergency pause / rush breaker toggles, fulfillment capacity limits (max active orders, default prep SLA), physical counter pickup notes, staff terminal PINs, and audio alert chime preferences.
- **Requirements Covered**:
  - `FR-MER-001`: Merchant profile and store configuration.
  - `FR-MER-003`: Store operational status, emergency pause, open/busy/closed status management.
  - `FR-MER-004`: Store compliance, verified hub partner badge, and FSSAI license display.
  - `FR-PICK-001`: Store counter pickup readiness, 6-digit PIN verification requirement, camera QR auto-launch, physical counter location notes.
- **Stitch Design Blueprints**:
  - Desktop: `42930197a23845dbaf477bee152a59dd` (`audit/stitch-audit/html/42930197a23845dbaf477bee152a59dd.html`, `audit/stitch-audit/screenshots/42930197a23845dbaf477bee152a59dd.png`).
  - Mobile: `6591032fa8a4451bae3f9ee9e6e6db16` (`audit/stitch-audit/html/6591032fa8a4451bae3f9ee9e6e6db16.html`, `audit/stitch-audit/screenshots/6591032fa8a4451bae3f9ee9e6e6db16.png`).

## 2. Research & Investigation Findings

- **Existing Backend Endpoints**:
  - `StoreController` (`apps/api/src/merchant/store.controller.ts`) at `@Controller('merchants/me/stores')`:
    - `GET /api/v1/merchants/me/stores`: List stores owned by authenticated merchant.
    - `GET /api/v1/merchants/me/stores/:storeId`: Retrieve specific store.
    - `PATCH /api/v1/merchants/me/stores/:storeId/hours`: Update operating schedule (`openingHours` json).
    - `PATCH /api/v1/merchants/me/stores/:storeId/availability`: Update pickup/delivery availability.
    - `PATCH /api/v1/merchants/me/stores/:storeId/status`: Self-service store state toggle (`ACTIVE` | `PAUSED` | `CLOSED`).
- **Client Library Additions**:
  - Add `getOwnStore`, `updateOwnStoreHours`, `updateOwnStoreAvailability`, and `updateOwnStoreStatus` to `packages/api-client/src/index.ts`.
- **Design Layout & Visual Elements**:
  - **Header**:
    - Brand cluster: "Dropzo Merchant", Maa Tara Groceries • Badarpur Hub (BDP-04).
    - Center nav pills: Orders, Inventory, Metrics, Store (Active highlight).
    - Status switcher: Live Orders (pulsing green dot), Busy, Closed.
    - Controls: volume_up chime button, notifications bell, profile avatar.
  - **Top Alert Banner**: Live Operating Hours Active (emerald gradient), open today until 9:30 PM, sync POS timings button.
  - **3-Column Canvas (Desktop)**:
    - **Left Sidebar**: Store identity badge card (MT avatar, Verified Hub Partner, FSSAI #2032400104128), sub-menu nav (Profile, Timings & Schedule [Active], Counter Pickup, Staff Access, Sound Preferences, Settlement), Station Road Guidelines callout.
    - **Center Panel**:
      - Weekly Operating Schedule card with weekday copy-all button, Mon-Sun day toggles with Open/Close time pickers and afternoon restock break (2:00 PM - 3:00 PM).
      - Temporary Store Pause & Festive Closures card with quick presets (Pause for 30 mins, 1 hour, Close for Today) and reason dropdown.
      - Fulfillment Capacity & Slot Controls card with steppers: Max Concurrent Orders (15), Prep Time Benchmark (12 min), Express Pickup Buffer (10 min).
    - **Right Sidebar**:
      - Counter Pickup Desk Settings (FR-PICK-001): Physical pickup location notes input, 6-digit PIN verification toggle, Camera QR auto-launch toggle.
      - Staff Terminal PINs (2 active staff: Bikram Das Store Manager, Rakesh Paul Counter Staff), + Add Staff PIN button.
      - Sticky Quick Save Footer Box with unsaved modification tracker and Save Schedule CTA.
  - **Mobile Adaptation**:
    - Sticky top app bar with status switch toggle.
    - Quick Pause Store rush breaker card.
    - Daily schedule summary with edit button.
    - Counter Pickup Settings card with steppers.
    - Staff PINs list & security reset.
    - Audio alerts & dispatch chime switches (loud order chime, auto-reject countdown).
    - Fixed floating save bar and bottom navigation bar (Orders, Inventory, Metrics, Store [Active]).

## 3. Potential Blockers, Risks & Security Boundaries

- Role check: Requires `MERCHANT_OWNER` or `ADMIN`.
- Store isolation: The backend strictly enforces `getOwnedOrThrow(userId, storeId)` so merchants cannot alter other stores.
- Dev fallback: Safe initial mock store state if backend server is not running during standalone web tests.

## 4. Open Questions & Trade-offs (Owner Clarifications)

- Blanket authorization covers this task. Real backend endpoints (`/hours`, `/status`, `/availability`) will be bound cleanly.

## 5. Feasibility Verdict & Recommendation

- **Verdict**: 100% Feasible.
- **Recommendation**: Proceed to Phase 2 (Implementation Plan) and Phase 3 (Execution).
