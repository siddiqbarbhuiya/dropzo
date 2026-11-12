# Implementation plan: BC-022 — Merchant Store Settings & Operations Screen (`/merchant/settings`)

## Scope

This task delivers the 1:1 responsive Merchant Store Settings & Operations page at `/merchant/settings` corresponding to Stitch screens `42930197a23845dbaf477bee152a59dd` (desktop) and `6591032fa8a4451bae3f9ee9e6e6db16` (mobile).

**In Scope**:
- Extend `@dropzo/api-client` with merchant store methods: `getOwnStore`, `updateOwnStoreHours`, `updateOwnStoreAvailability`, and `updateOwnStoreStatus`.
- Implement `apps/web/src/routes/merchant/MerchantSettingsPage.tsx`:
  - Top Merchant Header with store selector (`Maa Tara Groceries`), Live/Busy/Closed status switcher, audio alert toggle, and center nav pills (Orders, Inventory, Metrics, Store).
  - Operating Hours Active banner with IST closing notice and manual sync button.
  - Desktop 3-Column Layout:
    - Left Sidebar: Verified Partner badge, FSSAI #2032400104128, Sub-navigation links, Station Road guidelines note.
    - Center Panel:
      - Weekly operating schedule table (Mon-Sun) with active toggle, Open/Close inputs, and afternoon break badge.
      - Temporary Store Pause & Festive Closures card with 30m / 1h / Today presets and reason dropdown.
      - Fulfillment Capacity & Slot Controls with steppers: Max Concurrent Orders, Prep SLA, and Express Pickup Buffer.
    - Right Sidebar:
      - Counter Pickup Desk (FR-PICK-001) notes, 6-digit PIN enforcement toggle, camera QR auto-launch toggle.
      - Staff Terminal PINs (Bikram Das, Rakesh Paul) and Add Staff PIN action.
      - Sticky Quick Save Box with unsaved modification tracker and Save Schedule action.
  - Mobile Responsiveness:
    - Quick Pause Rush Breaker card.
    - Operational Hours card.
    - Counter Pickup Settings with stepper pills.
    - Staff PINs & Audio alerts switches.
    - Fixed bottom save bar and BottomNavBar with Store tab highlighted.
- Register `/merchant/settings` in `apps/web/src/App.tsx`.
- Write unit and integration test suite in `apps/web/src/routes/merchant/MerchantSettingsPage.test.tsx`.
- Synchronize documentation (`TASK-TRACKER.md` and `PROGRESS.md`).

**Explicitly Out of Scope**:
- Database schema changes (all store fields, hours, and status columns are modeled).

## Files/modules affected

- `packages/api-client/src/index.ts`: Add `getOwnStore`, `updateOwnStoreHours`, `updateOwnStoreAvailability`, `updateOwnStoreStatus`.
- `apps/web/src/routes/merchant/MerchantSettingsPage.tsx`: New component.
- `apps/web/src/routes/merchant/MerchantSettingsPage.test.tsx`: New test suite.
- `apps/web/src/App.tsx`: Register `/merchant/settings` route.
- `docs/06-delivery/TASK-TRACKER.md` & `PROGRESS.md`: Update task status and test counts.

## Steps

1. **API Client Extension**: Add merchant store methods to `packages/api-client/src/index.ts`.
2. **Page Implementation**: Build `MerchantSettingsPage.tsx` adhering to Dropzo design tokens and Stitch DOM fidelity.
3. **App Routing**: Wire route `/merchant/settings` in `App.tsx`.
4. **Testing**: Write unit/integration tests in `MerchantSettingsPage.test.tsx` testing status switching, schedule saving, emergency pause, capacity steppers, and PIN settings.
5. **Verification**: Run `npm run test`, `npm run typecheck`, and `npm run lint`.
6. **Docs & Commit**: Update `TASK-TRACKER.md` and `PROGRESS.md`, commit with message `feat(web): implement 1:1 responsive merchant store settings and operations workspace (BC-022)`.

## Risks / open questions

- Store ID resolution: Reads from query param or fallback to first store from `listOwnStores()`.

## Test plan

- Test store header rendering, verified badge, and status pill.
- Test toggling store status between Live, Busy, and Closed.
- Test emergency rush breaker presets (30 min pause, etc.).
- Test adjusting capacity steppers (max concurrent orders, prep SLA).
- Test saving schedule calls `updateOwnStoreHours` and displays success feedback.
