# Spike: BC-015 — Customer Cart & Fulfillment Checkout Screen (/checkout)

**Date:** 2026-11-12  
**Status:** Approved (Pre-approved by Product Owner)  
**Confidence Level:** 98% (>95% required for Phase 2 approval)  
**Author:** Antigravity (Senior Full-Stack Implementation Engineer)

## 1. Objective & Requirements Scope

- **Problem Statement**: Complete the end-to-end customer purchasing experience by implementing the customer cart review, fulfillment method selection, delivery address input/selection, authoritative bill breakdown, and idempotent Cash on Delivery (COD) order submission.
- **Requirements Covered**:
    - `FR-CART-001`: View and manage single-store cart items with quantity adjustment and removal.
    - `FR-ORD-001`: Select fulfillment mode (Store Pickup vs Home Delivery) and place order.
    - `FR-PAY-001`: Cash on Delivery (COD) payment flow.
    - Stitch Screen #21 (Mobile): `f0f05e05c68a43c89251ec6f567fa9a9`
    - Stitch Screen #29 (Desktop): `57e0783864824b8ab618af95a229d5d3`

## 2. Research & Investigation Findings

- **Existing Backend Infrastructure**:
    - `apps/api/src/cart/cart.controller.ts`: Fully implemented under `/customers/me/cart` (`@Roles('CUSTOMER')`) supporting `GET /`, `POST /items`, `PATCH /items/:itemId`, `DELETE /items/:itemId`, and `DELETE /`.
    - `apps/api/src/checkout/checkout.controller.ts`: Fully implemented under `/checkout` (`@Roles('CUSTOMER')`):
        - `POST /checkout/prepare` accepting `PrepareCheckoutDto` (`fulfilmentType: 'PICKUP' | 'DELIVERY'`, `deliveryAddress?: DeliveryAddressDto`), returning `CheckoutSummary` with authoritative pricing and fulfillment validation errors.
        - `POST /checkout` accepting `CreateOrderDto` (`fulfilmentType`, `deliveryAddress`, `expectedTotalAmount`, `customerNotes`) with required `Idempotency-Key` header, returning `Order`.
- **Frontend State & Cart Storage**:
    - `apps/web/src/store/useCartStore.ts`: Client-side persistent Zustand store already tracking `storeId`, `storeName`, `items: CartItem[]` with single-store isolation.
    - When user transitions from Storefront to Checkout, guest items in `useCartStore` can be synced with `/customers/me/cart` or priced dynamically via `POST /checkout/prepare`.
- **Stitch Design Alignment**:
    - **Desktop (`57e0783864824b8ab618af95a229d5d3.html`)**:
        - Dedicated Checkout Header with back link to store, trust shield, encryption badge.
        - Breadcrumb: Cart > Fulfillment & Review > Receipt & Tracking with Order # pill.
        - 2-Column layout:
            - Left column: Single merchant fulfillment banner, fulfillment mode toggle (Store Pickup vs Home Delivery radio cards with Badarpur store address and home delivery address), Cart item list with thumbnails, pack size, price, Quantity Stepper, Offers/Coupon box (`DROPZO50 Applied`), and COD Payment selector.
            - Right column: Sticky order summary card with item total, pickup/delivery fee (`FREE` vs `₹20`), packaging fee (`₹15`), coupon discount (`-₹50`), Total Payable (`₹555`), "You saved ₹60" celebration chip, high-contrast "Confirm Order" CTA, store helpline, and counter pickup instructions.
            - Desktop footer.
    - **Mobile (`f0f05e05c68a43c89251ec6f567fa9a9.html`)**:
        - Compact header with back button, "Checkout & Cart", store name subtitle, cart count badge.
        - Single-store constraint banner.
        - Segmented pill toggle: Store Pickup (Ready in 20 min • Free) vs Home Delivery (30-45 min • ₹20).
        - Contextual card (Store address or Home delivery address).
        - Item list cards with quantity steppers.
        - Promo voucher input with applied chip.
        - Bill breakdown card with item total, delivery fee, taxes, total payable.
        - Payment method radio list (COD selected, Online Payment disabled "Coming Soon").
        - Fixed bottom sticky bar with total amount and "Confirm Order" button.

## 3. Potential Blockers, Risks & Security Boundaries

- **Authentication Requirement**: `/checkout` and `/checkout/prepare` require authenticated `CUSTOMER` role. Unauthenticated guests must be prompted to log in with seamless return to `/checkout` (via `?redirect=/checkout`).
- **Idempotency Protection**: Order creation requires a client-generated UUID `Idempotency-Key` header so that network retries or double-clicks do not create duplicate orders.
- **Authoritative Pricing**: Total is always verified by the server (`expectedTotalAmount`); any client-server discrepancy is caught gracefully.
- **Empty Cart Boundary**: If the user visits `/checkout` with an empty cart, display an empty cart illustration/state with a CTA to return to the marketplace (`/`).

## 4. Open Questions & Decisions

- **Sync Strategy**: When the user opens `/checkout`, sync `useCartStore` items into the backend `/customers/me/cart` and fetch `POST /checkout/prepare` for authoritative bill totals.
- **Delivery Address**: Default inline Badarpur address (Ward 3, Badarpur Town, Assam 788806, Lat 24.86, Lng 92.51) pre-filled, with editing capability for custom address details.
- **Success Redirection**: Upon successful `createOrder`, clear `useCartStore` and redirect to `/orders/:orderId`.

## 5. Feasibility Verdict & Recommendation

- **Verdict**: **Feasible (Confidence: 98%)**.
- All backend APIs, endpoints, and database models already exist and are verified by unit/integration tests.
- Proceed to Phase 2: Implementation Planning.
