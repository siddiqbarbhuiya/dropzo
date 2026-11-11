# Implementation plan: BC-015 — Customer Cart & Fulfillment Checkout Screen (/checkout)

## Scope

- **In Scope**:
    - Extend `@dropzo/api-client` with typed cart and checkout methods (`getActiveCart`, `addCartItem`, `updateCartItem`, `removeCartItem`, `clearCart`, `prepareCheckout`, `createOrder`).
    - Implement 1:1 Stitch responsive `CheckoutPage.tsx` adhering to Mobile Screen #21 (`f0f05e05c68a43c89251ec6f567fa9a9`) and Desktop Screen #29 (`57e0783864824b8ab618af95a229d5d3`).
    - Single-store fulfillment enforcement with clear store context header.
    - Interactive fulfillment toggle: **Store Pickup** (Free, ready in 20 min) vs. **Home Delivery** (₹20, 30-45 min).
    - Badarpur address configuration with modal/inline edit support.
    - Cart item management: Quantity stepper adjustments, removal on qty 0, automatic sync with `useCartStore`.
    - Authoritative bill breakdown calculation (items total, pickup/delivery fee, packaging/tax, voucher discount, total payable).
    - Payment method selector: Cash on Delivery (COD) selected by default, Online Payment displayed as "Coming Soon".
    - Order submission with client-generated UUID `Idempotency-Key` header via `POST /checkout`.
    - Empty cart fallback state with CTA button back to Marketplace Home.
    - Wire route `/checkout` in `apps/web/src/App.tsx`.
    - Comprehensive component test suite `CheckoutPage.test.tsx`.
- **Out of Scope**:
    - Payment gateway integration (Razorpay/Stripe) — COD only in MVP per ADR-0010.
    - Multi-store split checkout — strictly forbidden in MVP.

## Files/modules affected

- `packages/api-client/src/index.ts`: Add checkout and cart API methods and type definitions.
- `apps/web/src/routes/customer/CheckoutPage.tsx`: Implement the 1:1 Stitch checkout screen.
- `apps/web/src/routes/customer/CheckoutPage.test.tsx`: Unit and component test suite.
- `apps/web/src/App.tsx`: Mount `/checkout` route.
- `apps/web/src/routes/LoginPage.tsx`: Support `?redirect=` query param on login completion.
- `docs/04-design/UI-SCREEN-COVERAGE.md`: Mark Screen #21 and Screen #29 as Migrated.
- `docs/06-delivery/TASK-TRACKER.md` & `PROGRESS.md`: Update task status.

## Steps

1. **Step 1: Extend `@dropzo/api-client`**:
    - Add types: `FulfilmentType`, `DeliveryAddress`, `PricedCartLine`, `PricedCartSummary`, `CheckoutSummary`, `PrepareCheckoutDto`, `CreateOrderDto`.
    - Add methods to `createApiClient`: `getActiveCart`, `addCartItem`, `updateCartItem`, `removeCartItem`, `clearCart`, `prepareCheckout`, `createOrder`.
    - Run `npm run build -w @dropzo/api-client`.
2. **Step 2: Implement `CheckoutPage.tsx` (TDD)**:
    - Implement empty cart state when `items.length === 0`.
    - Implement dedicated Checkout Header (back link to store, trust shield, encryption badge).
    - Implement single-merchant fulfillment alert banner.
    - Implement fulfillment switcher: Store Pickup vs Home Delivery radio pills with Badarpur location data.
    - Implement cart item list with thumbnail, product title, pack size, price, and `QuantityStepper`.
    - Implement promo/voucher code card (`DROPZO50 Applied / -₹50`).
    - Implement bill calculation breakdown with reactive totals.
    - Implement COD payment selector with "Online Payment (Coming Soon)".
    - Implement desktop sticky order summary card with "Confirm Order" button.
    - Implement mobile sticky bottom bar with total and "Confirm Order" CTA.
    - On order submission: generate UUID idempotency key, call `apiClient.createOrder()`, clear cart via `useCartStore.clearCart()`, and navigate to `/orders/${order.id}`.
3. **Step 3: Route Mounting & Login Redirect**:
    - Mount `<Route path="/checkout" element={<CheckoutPage />} />` in `apps/web/src/App.tsx`.
    - In `apps/web/src/routes/LoginPage.tsx`, redirect to `searchParams.get('redirect')` if present.
4. **Step 4: Automated Verification**:
    - Write tests in `CheckoutPage.test.tsx` verifying:
        - Empty cart state rendering.
        - Single-store banner and cart items rendering with prices.
        - Quantity stepper adjustments updating cart store.
        - Fulfillment switch toggling pickup (Free) and delivery (₹20 fee).
        - Order placement calling `apiClient.createOrder` with `Idempotency-Key` and redirecting to order receipt.
    - Run test suite: `npm run test -w @dropzo/web`.
    - Run typecheck: `npm run typecheck -w @dropzo/web`.
    - Run linter: `npm run lint -w @dropzo/web`.
    - Run build: `npm run build -w @dropzo/web`.
5. **Step 5: Documentation Synchronization**:
    - Update `UI-SCREEN-COVERAGE.md`, `TASK-TRACKER.md`, and `PROGRESS.md`.

## Risks / open questions

- _Risk_: Guest checkout without token.
  _Mitigation_: If `!isAuthenticated`, clicking "Confirm Order" prompts sign-in or redirects to `/login?redirect=/checkout`, preserving the cart in `localStorage`.
- _Risk_: Price drift between client and server.
  _Mitigation_: Server computes authoritative total in `createOrder` and rejects if stale.

## Database changes

- None. All tables (`orders`, `order_items`, `idempotency_records`) already exist from BC-004/BC-008.

## Test plan

- Unit tests in `CheckoutPage.test.tsx` using Vitest + React Testing Library.
- Full test pass across `@dropzo/web` and `@dropzo/api`.
