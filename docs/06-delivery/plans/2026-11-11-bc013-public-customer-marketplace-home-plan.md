# Implementation Plan: BC-013 — Public Customer Marketplace Home Screen

## Scope

### What this task does:

1. **Public Root Routing**: Configures `apps/web/src/App.tsx` so route `/` renders `<HomePage />` publicly without requiring authentication or redirecting to `/login`.
2. **1:1 Responsive Stitch Implementation**: Replaces the placeholder `HomePage.tsx` with the complete visual design extracted from Stitch screens `7dafe4578dda46dfb093cad7eab02188` (Mobile) and `4ea61046b65a4effa3ce7492fbc197b1` (Desktop):
    - **Location Context**: "Delivering to Badarpur Main Town, Sribhumi" with 15-30 min badge.
    - **Header / User Greeting**: "Sign In" button for guests; avatar, name, and notification bell for authenticated users.
    - **Global Search**: Search bar with filter action and `Cmd+K` desktop shortcut.
    - **Fulfillment Switcher**: "Express Delivery" vs "Store Pickup" toggle.
    - **Category Rail**: Horizontal category carousel (Vegetables, Soft Fruits, Dairy & Bread, Groceries, Snacks).
    - **Featured Promo Banner**: Emerald gradient 100% Farm Fresh card.
    - **Popular Stores in Badarpur**: Dynamic store cards powered by `apiClient.listPublicStores()` showing store name, address, distance, rating, tags, and open/closed status.
    - **"You Might Need" Essentials**: Daily essentials grid with prices, strike-through MRP, savings badge, and quantity stepper.
    - **Community Assurance**: Local community guarantee banner.
    - **Mobile Bottom Navigation**: Floating pill navigation bar (Home, Stores, Orders, Cart, Profile).
    - **Desktop Header**: Sticky top navigation bar with full controls and category quick links.
3. **Guest Authentication Handoff**: Unauthenticated guests clicking "Orders", "Sign In", or "Proceed to Checkout" are redirected to `/login?redirect=...`.
4. **Storefront Linkage**: Clicking a store card navigates to `/stores/:storeId` (served by a clean placeholder until BC-014 Store Catalogue is built).
5. **Unit Tests (TDD)**: Comprehensive tests verifying guest rendering, API store card loading, search/toggle interactions, and auth state responsiveness.

### What this task does NOT do:

- No database schema migrations (all required public data is provided by BC-012).
- Does not modify backend API contracts or authorization guards.

---

## Files / Modules Affected

- **Modify**: `apps/web/src/App.tsx` (mount `/` directly to `HomePage`, register `/stores/:storeId`)
- **Modify**: `apps/web/src/routes/HomePage.tsx` (1:1 responsive Stitch implementation)
- **Create**: `apps/web/src/routes/HomePage.test.tsx` (unit test suite)
- **Create**: `apps/web/src/routes/customer/StorePlaceholderPage.tsx` (storefront route placeholder)
- **Modify**: `docs/04-design/UI-SCREEN-COVERAGE.md` (update Row 58 status to Implemented)
- **Modify**: `docs/06-delivery/TASK-TRACKER.md` (add BC-013 entry)
- **Modify**: `docs/06-delivery/PROGRESS.md` (record implementation and test results)

---

## Steps

### Step 1: Write Unit Tests First (`HomePage.test.tsx`) (TDD Red)

- Assert that `<HomePage />` renders without requiring authentication tokens.
- Assert that "Badarpur Main Town, Sribhumi" location is displayed.
- Assert that `apiClient.listPublicStores()` is called and renders real store cards ("Maa Tara Groceries", "Bismillah Daily Fresh").
- Assert that clicking "Sign In" navigates to `/login`.
- Assert that an authenticated user sees their user name and avatar.
- Run `npm run test -w @dropzo/web -- src/routes/HomePage.test.tsx` and observe failure.

### Step 2: Implement Storefront Placeholder (`StorePlaceholderPage.tsx`)

- Create minimal responsive storefront placeholder at `/stores/:storeId` with store details header and "Store Catalogue coming soon" badge.

### Step 3: Implement 1:1 Responsive `HomePage.tsx` (TDD Green)

- Replicate the exact DOM structure, Tailwind classes, and typography tokens from `audit/stitch-audit/html/7dafe4578dda46dfb093cad7eab02188.html` and `4ea61046b65a4effa3ce7492fbc197b1.html`.
- Wire `useQuery` hook with `apiClient.listPublicStores()` with fallback handling.
- Read user and tokens from `useAuthStore` to switch between Guest controls ("Sign In") and User profile.
- Support both mobile (max-w-md handheld container + floating bottom nav) and desktop (`hidden lg:flex` sticky top navigation bar + multi-column grid).
- Verify tests pass.

### Step 4: Update `App.tsx` Routing

- Update root route `<Route path="/" element={<HomePage />} />`.
- Add public route `<Route path="/stores/:storeId" element={<StorePlaceholderPage />} />`.

### Step 5: Full Verification Suite

- `npm run test -w @dropzo/web`
- `npm run typecheck -w @dropzo/web`
- `npm run lint -w @dropzo/web`
- `npm run build -w @dropzo/web`

### Step 6: Documentation Synchronization

- Update `docs/04-design/UI-SCREEN-COVERAGE.md`.
- Update `docs/06-delivery/TASK-TRACKER.md` and `docs/06-delivery/PROGRESS.md`.

---

## Risks / Open Questions

- **Resolved Question 1**: Guest users clicking "Orders" or "Checkout" will be redirected to `/login?redirect=...`.
- **Resolved Question 2**: Clicking a Store Card navigates to `/stores/:storeId`.
- **Risk Mitigation**: The layout strictly preserves all Stitch visual sections, material icons, and color tokens, avoiding any omission of design elements.

---

## Database Changes

**None.** Uses existing PostgreSQL tables and BC-012 public endpoints.

---

## Test Plan

- **Public Rendering**: Renders without crashing or redirecting when `tokens` is `null`.
- **Location Badge**: Displays Badarpur delivery zone pill (`15-30 min`).
- **Store Cards**: Renders stores fetched from `listPublicStores()`, showing ratings, distance, and tags.
- **Search & Toggles**: Interactive fulfillment toggle (Delivery vs Pickup).
- **Navigation Links**: Links store cards to `/stores/:id` and guest login to `/login`.

---

## Documentation to Update After Implementation

- `docs/04-design/UI-SCREEN-COVERAGE.md`: Update Row 58 (`7dafe4578dda46dfb093cad7eab02188` / `4ea61046b65a4effa3ce7492fbc197b1`).
- `docs/06-delivery/TASK-TRACKER.md`: Record BC-013.
- `docs/06-delivery/PROGRESS.md`: Record execution log and test outputs.
