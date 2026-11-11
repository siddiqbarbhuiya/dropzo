# Dropzo Stitch Design Briefs — Items Missing from the Stitch Project

**Status: Owner action required.**
**Document Reference:** `docs/04-design/STITCH-DESIGN-BRIEFS.md`
**Related documents:** [`STITCH-DESIGN-AUDIT.md`](./STITCH-DESIGN-AUDIT.md),
[`UI-SCREEN-COVERAGE.md`](./UI-SCREEN-COVERAGE.md),
[`DESIGN-SYSTEM-EXTRACTION.md`](./DESIGN-SYSTEM-EXTRACTION.md),
[`COMPONENT-LIBRARY.md`](./COMPONENT-LIBRARY.md).

## Why this document exists

`UI-SCREEN-COVERAGE.md`'s Stage 1 audit (BC-011) found 29 functional screens in the Stitch project
(id `3837531702173487386`). Of those, 23 have no `apps/web` implementation yet, but a real Stitch
design already exists for every one of them — that is normal unimplemented-but-designed backlog,
tracked as follow-up implementation work in `ROADMAP.md`, not a design gap.

**This document covers the opposite case: items where no Stitch design exists at all**, identified
in `UI-SCREEN-COVERAGE.md` §3 ("Critical Design & Workflow Gaps") and the three screen rows marked
`_(None in Stitch)_`. For each one this document gives a complete design brief and a self-contained,
copy-paste-ready Stitch prompt, grounded in the real, already-implemented backend
endpoints/DTOs/enums in `apps/api/src` — not invented fields or workflows. Nothing here should be
built in `apps/web` before the owner creates (or confirms an existing) Stitch design for it and the
brief is checked against the result, per `AGENTS.md`'s "stop and ask" rule for anything that would
otherwise invent a UI/business requirement.

---

## Summary table

| Brief ID | Item                                                          | Role             | Gap type                        | Blocks                                             |
| -------- | -------------------------------------------------------------- | ----------------- | ---------------------------------- | ----------------------------------------------------- |
| DB-01    | Merchant POS Login — Desktop variant                          | Merchant         | Missing responsive variant        | Nothing functional (mobile covers the real use case); fills the audit's "no desktop pair" gap |
| DB-02    | Delivery Partner — Current Assignment (Offer / Accept-Reject) | Delivery Partner | Missing screen (whole role absent from Stitch) | `DeliveryPartnerInboxPage.tsx` restyle |
| DB-03    | Delivery Partner — Pickup Collection & COD Confirmation       | Delivery Partner | Missing screen                    | Same page, `collect` step |
| DB-04    | Delivery Partner — Out for Delivery & Customer Code Verification | Delivery Partner | Missing screen                 | Same page, `out-for-delivery`/`verify-delivery` steps |
| DB-05    | Delivery Partner — Delivery Failed / Reschedule                | Delivery Partner | Missing screen                    | Same page, `fail` step |
| DB-06    | Admin Delivery Queue & Dispatch                                | Admin            | Missing screen (`_(None in Stitch)_` row) | `AdminDeliveryQueuePage.tsx` restyle |
| DB-07    | Admin COD Handover & Cash Reconciliation                       | Admin            | Missing screen (`_(None in Stitch)_` row) | `AdminCodHandoverPage.tsx` restyle |
| DB-08    | Shared — Empty Cart Drawer                                      | Customer         | Missing shared state (Gap 4)      | Future Checkout screen |
| DB-09    | Shared — Store Closed / Outside Delivery Hours Banner           | Customer         | Missing shared state (Gap 4)      | Future Home/Catalogue screens |
| DB-10    | Shared — No Stores Found in Service Zone                        | Customer         | Missing shared state (Gap 4)      | Future Home screen |
| DB-11    | Shared — Network Offline Alert                                  | All roles        | Missing shared state (Gap 4)      | Every screen |

All brand tokens below are from the **approved** `DESIGN-SYSTEM-EXTRACTION.md`: Coral `#FF5733` /
`#E04826` dark / `#FFECE8` light, Forest Green `#006E2D`, Deep Blue `#006398`, Base Surface
`#FBF8FF`, font **Plus Jakarta Sans**, card radius `16px`, pill/CTA radius `9999px`, base spacing
unit `4px`. No brief below asks for a new token — reuse these exactly.

---

## DB-01 — Merchant POS Login, Desktop variant

### A. Identification
- Role: Merchant.
- Type: missing responsive variant — Stitch screen #12 (`3356568780464f91b971a22c5a4a461a`,
  "Dropzo Merchant POS Login & OTP — Mobile") has no desktop pair, confirmed in
  `STITCH-DESIGN-AUDIT.md`'s responsive pairing matrix (every other screen has one).
- Route: `/merchant/login` (not yet implemented — currently merchants share `/login`).
- Milestone: BC-011 design-system follow-up; backend already supports it (BC-005 `verify-otp`).

### B. Business purpose and context
A merchant staff member signs in on a shop's own desktop/tablet POS terminal at store open. They
land here before the POS Terminal screen (#18/#22 — already designed). After sign-in they go
straight to the Merchant Order POS Terminal for their store.

### C. Functional requirements
- Phone number input (reuses the OTP input already approved for shared login #9/#10).
- Pre-selected "Merchant POS" role badge (no role-toggle — this terminal is merchant-only, unlike
  the shared login's role tabs).
- "Dedicated store terminal" disclaimer text (as on the mobile screen).
- 6-digit OTP input, resend-cooldown timer, inline error banner (reuse OTP error state #31/#37).
- No "PIN pad fallback" unless the owner confirms a PIN-login backend endpoint exists — today only
  phone+OTP (`POST /api/v1/auth/send-otp`, `/verify-otp`) is implemented; **do not design a PIN pad
  that has nothing to call.**

### D. Data and business rules
- Same `auth/verify-otp` flow as customer login — no separate merchant credential store exists.
- No store-selection step belongs on this screen: store scoping happens after login, in the
  existing `/merchant/stores/:storeId/...` routes.

### E. Visual and responsive requirements
- Desktop viewport (1280px canvas, matching every other desktop pair in the audit).
- Reuse the shared Login/OTP desktop layout (#10) almost exactly — split-panel brand illustration
  left, form right — but swap the role-toggle tabs for the static "Merchant POS" badge.
- Reference screens: #10 (`e7a900663c134b239399436c60b94820`) for layout, #12
  (`3356568780464f91b971a22c5a4a461a`) for the POS-specific copy/badge.

### F. Stitch-ready prompt

> Design a **desktop (1280px wide)** login screen for "Dropzo", a local grocery marketplace
> launching in Badarpur, Sribhumi, Assam. This is the **Merchant POS Login** screen — the desktop
> companion to an existing mobile screen, reusing the same split-panel layout as the existing
> "Dropzo Login & OTP Portal — Desktop" screen (brand illustration panel on the left, form on the
> right). Unlike the shared customer/admin login, this screen has **no role-selector tabs** — show
> a fixed "Merchant POS" badge instead, plus a one-line disclaimer: "Dedicated store terminal —
> sign in with your registered merchant phone number." Below that: a phone-number input (10-digit
> Indian mobile number), then after submit a 6-digit OTP input (6 individual boxes), a resend-OTP
> link with a cooldown timer, and a primary pill-shaped Send/Verify button. Use these exact design
> tokens: primary color Coral `#FF5733` (hover/active `#E04826`), base surface `#FBF8FF`, font
> "Plus Jakarta Sans", card radius `16px`, button radius `9999px` (full pill), base spacing unit
> `4px`. Do not add a PIN pad, biometric login, or any other authentication method — phone+OTP is
> the only supported method. Do not invent a merchant/store name or any sample data on this screen.

---

## DB-02 — Delivery Partner: Current Assignment (Offer / Accept-Reject)

### A. Identification
- Role: Delivery Partner.
- Type: missing screen — `STITCH-DESIGN-AUDIT.md` Gap 1: "the Stitch canvas has complete screens
  for Customer, Merchant, and Admin, but completely omitted the fourth core user type: Delivery
  Partner." No Stitch screen ID exists for any delivery-partner view.
- Existing route: `/delivery/inbox` (`DeliveryPartnerInboxPage.tsx`, functional wireframe, BC-010).
- Backend: `GET /api/v1/delivery-partners/me/assignments/current`
  (`delivery-partner.controller.ts` → `DeliveryWorkflowService.getOwnCurrentAssignment`).

### B. Business purpose and context
A delivery partner opens the app and sees their **one current assignment** — not a browsable list
of multiple offers. The backend query is explicitly scoped to a single assignment whose
`delivery_status` is one of `ASSIGNED`/`ACCEPTED`/`PICKED_UP`/`OUT_FOR_DELIVERY`; a partner is never
shown more than one at a time. **Do not design a multi-order inbox/list UI** — that is a workflow
the backend does not support (see "Design Gap" note on the `/delivery/inbox` row of
`UI-SCREEN-COVERAGE.md`). After `accept`, the partner proceeds to DB-03 (pickup collection); after
`reject`, they return to a "waiting for next assignment" empty state.

### C. Functional requirements
- When an assignment exists in `ASSIGNED` status (admin just assigned it, not yet accepted): show
  the order number, the store's pickup address (`Order.store_name_snapshot`/
  `store_address_snapshot`), the customer's delivery address (`Order.delivery_address_snapshot`),
  the delivery fee (`Order.delivery_fee`) and COD amount due (`DeliveryAssignment.cod_amount_due`
  — may be zero for a prepaid/non-COD order), and two large touch-target buttons: **Accept** /
  **Reject** (reject requires a reason — `ReasonDto{reason}`, free text).
- When no assignment exists: an empty/waiting state ("Waiting for your next delivery").
- No distance/map/ETA field — the backend does not expose one; **do not invent a map view or a
  distance estimate.**

### D. Data and business rules
- One active assignment per partner at a time, enforced by the backend (BC-010's partial unique
  index) — the UI should never need to render more than one assignment card.
- COD amount may be ₹0 — the button/label copy must not assume every order is COD.
- Reject requires a reason; it is a `PATCH .../reject` with `{reason}` in the body, not a one-tap
  action.

### E. Visual and responsive requirements
- Mobile-only (no desktop delivery-partner surface is planned — this is a courier's phone app).
- Large touch targets (delivery partners are often one-handed, outdoors, time-pressured) — reuse
  the same "large touch target" principle already applied to the Merchant POS Terminal screens
  (#18/#22).
- Use the Deep Blue `#006398` tertiary color for delivery-partner-specific badges/accents, per
  `DESIGN-SYSTEM-EXTRACTION.md` §1 ("used for... delivery partner badges").

### F. Stitch-ready prompt

> Design a **mobile (390px wide)** "Current Delivery Assignment" screen for "Dropzo", a grocery
> marketplace in Badarpur, Sribhumi, Assam, for the **Delivery Partner** role — this role has no
> existing Stitch screens yet, so establish its visual language using Deep Blue `#006398` as the
> role-accent color alongside the shared Coral `#FF5733` primary, Base Surface `#FBF8FF`, Plus
> Jakarta Sans font, `16px` card radius, `9999px` pill buttons. Show **one single assignment card**
> (never a list — a delivery partner only ever has one active assignment at a time): order number
> at the top, a "Pickup from" section with the store name and address, a "Deliver to" section with
> the customer's address, a delivery-fee amount, and a "Cash to collect: ₹{amount}" line (this line
> must be clearly omittable/hidden when the amount is zero — not every order is cash-on-delivery).
> Below the card, two large, thumb-friendly buttons side by side: a Coral "Accept" pill button and a
> neutral-outline "Reject" pill button (tapping Reject should imply a reason-entry step, shown as a
> small text field below the button on tap). Also design the empty/waiting state for when there is
> no current assignment: a simple icon and the text "Waiting for your next delivery". Do not add a
> map, distance estimate, or ETA — none of that data exists in this system. Do not show more than
> one assignment at a time.

---

## DB-03 — Delivery Partner: Pickup Collection & COD Confirmation

### A. Identification
- Role: Delivery Partner.
- Type: missing screen (Gap 1).
- Existing route: `/delivery/inbox` (same page, next step after Accept).
- Backend: `PATCH /api/v1/delivery-partners/me/assignments/:orderId/collect`
  (no request body — `delivery-workflow.controller.ts`).

### B. Business purpose and context
After accepting, the partner travels to the store, collects the packed order (and cash, for COD
orders), and taps "Collected" to advance `delivery_status` from `ACCEPTED` to `PICKED_UP`. This
mirrors the merchant-side "Mark Ready"/pickup-PIN flow already designed (#18/#22) from the other
side of the same handover.

### C. Functional requirements
- Shows the same order/store/customer summary as DB-02 (now read-only — accept/reject no longer
  apply).
- A single primary action: "Confirm pickup" / "Collected", calling `collect` (no body, no PIN entry
  required by the backend at this step — collection is merchant-side verified via the pickup code
  flow already designed, not a second code here).
- If the order is COD, a visible reminder of the cash amount to collect
  (`DeliveryAssignment.cod_amount_due`) at this step, before confirming.

### D. Data and business rules
- `collect` takes no request body — **do not design a confirmation code/PIN field at this
  specific step**; the code-entry step belongs to DB-04 (delivery, not pickup).
- This action transitions `delivery_status` to `PICKED_UP`, separate from the order's own `status`
  (which the merchant-side pickup/ready flow controls).

### E. Visual and responsive requirements
- Mobile-only, same visual language as DB-02 (Deep Blue accent, large single CTA).

### F. Stitch-ready prompt

> Design a **mobile (390px wide)** "Confirm Pickup" screen for the Dropzo **Delivery Partner**
> role (Deep Blue `#006398` accent, Coral `#FF5733` primary, Base Surface `#FBF8FF`, Plus Jakarta
> Sans, `16px` card radius, `9999px` pill buttons) — the step after accepting a delivery, once the
> partner has arrived at the store. Show the store pickup address and a reminder card: "Cash to
> collect: ₹{amount}" (only shown when the order is cash-on-delivery; otherwise omit this card
> entirely — some orders are already paid). One single large primary button at the bottom: "Confirm
> Pickup". Do **not** include a PIN/code entry field on this screen — pickup verification at the
> store is the merchant's responsibility on their own terminal, not the delivery partner's; this
> screen is a simple one-tap confirmation once goods are physically collected.

---

## DB-04 — Delivery Partner: Out for Delivery & Customer Code Verification

### A. Identification
- Role: Delivery Partner.
- Type: missing screen (Gap 1).
- Existing route: `/delivery/inbox` (same page, final delivery step).
- Backend: `PATCH .../out-for-delivery` (no body — generates the delivery verification code) then
  `POST .../verify-delivery` (`VerifyDeliveryCodeDto{code}`).

### B. Business purpose and context
Once collected, the partner starts travelling (`out-for-delivery`), then at the customer's door
asks for the customer's code and submits it to confirm handover, completing the delivery.

### C. Functional requirements
- "Start delivery" action (`out-for-delivery`, no body) — this is what generates the code the
  customer sees on their own order-detail screen (the already-designed/implemented `PickupPinCard`
  pattern, reused for delivery).
- A **6-digit** code-entry field at the door — **not 4 digits**: `VerifyDeliveryCodeDto` validates
  a 6-digit code, unlike the customer-facing 4-digit *pickup* PIN used for in-store collection.
  Do not reuse the 4-digit pickup-PIN visual exactly; adapt it to 6 boxes.
  Submitting calls `verify-delivery`; a wrong code should show an inline error with attempts
  remaining (the backend enforces `max_attempts`, exact number not surfaced via API — show a
  generic "incorrect code, try again" message, not a specific remaining-attempts count unless
  that number is confirmed to be returned by the API response).
- On success: a confirmation/success state ("Delivered!") before returning to the waiting state.

### D. Data and business rules
- Code is hash-only server-side, 48-hour TTL, shown to the customer once — the delivery partner
  never sees the code itself, only enters what the customer tells them.
- This is a distinct code from the customer's *pickup* code (in-store collection) — same mechanism
  (`CODE_TTL_MS` 48h, hash-only) but a separate secret/table, and a different digit count (6 vs 4).

### E. Visual and responsive requirements
- Mobile-only, same visual language as DB-02/DB-03.
- The 6-digit entry should visually echo the existing `OTPInput`/pickup-PIN component pattern
  (individual boxed digits) already implemented in `components/ui/OTPInput.tsx`, just sized for 6
  boxes instead of 4.

### F. Stitch-ready prompt

> Design two connected **mobile (390px wide)** screens for the Dropzo **Delivery Partner** role
> (Deep Blue `#006398` accent, Coral `#FF5733` primary, Base Surface `#FBF8FF`, Plus Jakarta Sans,
> `16px` card radius, `9999px` pill buttons): (1) an "Out for Delivery" screen showing the
> customer's delivery address and a single "Start Delivery" button, and (2) a "Verify Delivery"
> screen shown once the partner has arrived, with the text "Ask the customer for their 6-digit
> delivery code" and **six individual boxed digit inputs** (not four — this code is longer than the
> in-store pickup PIN used elsewhere in this app), a "Confirm Delivery" button, and an inline error
> state for a wrong code ("Incorrect code — please try again"). On success, show a simple "Delivered
> successfully" confirmation state with a checkmark. Do not show the plaintext code anywhere on the
> delivery partner's own screen — they only receive it verbally from the customer and type it in.

---

## DB-05 — Delivery Partner: Delivery Failed / Reschedule

### A. Identification
- Role: Delivery Partner.
- Type: missing screen (Gap 1).
- Existing route: `/delivery/inbox` (same page, failure branch).
- Backend: `PATCH /api/v1/delivery-partners/me/assignments/:orderId/fail` (`ReasonDto{reason}`).

### B. Business purpose and context
The partner cannot complete a delivery (customer unreachable, wrong address, refused, etc.) and
needs an explicit, reasoned way to mark it failed rather than abandoning the app mid-task.

### C. Functional requirements
- A "Can't complete this delivery?" link/button available from the Out-for-Delivery screen (DB-04),
  leading to a reason-selection step: a short list of common reasons (e.g. "Customer not
  reachable", "Wrong address", "Customer refused") plus a free-text field, since `ReasonDto` is
  just `{reason: string}` — **the backend has no enumerated reason codes**, so any preset list is a
  front-end-only convenience that still submits as free text, not a selector bound to a fixed enum.
- Confirmation step before submitting (this is a terminal, hard-to-reverse action for the order).
- After submission: returns to the waiting-for-next-assignment state (DB-02's empty state) — a
  failed delivery does not get reassigned to the same partner automatically.

### D. Data and business rules
- `delivery_status` becomes `FAILED`; this does not auto-release the reservation or change payment
  — handled entirely server-side, matching BC-010's documented failed-delivery behavior.
- No reassignment UI belongs here — reassignment is an **admin** action (see DB-06).

### E. Visual and responsive requirements
- Mobile-only. Use the warning/error tone already in the design system for the confirmation step
  (not the primary Coral — this is a negative-outcome action).

### F. Stitch-ready prompt

> Design a **mobile (390px wide)** "Delivery Failed" flow for the Dropzo **Delivery Partner** role
> (Deep Blue `#006398` accent, error tone `#BA1A1A` / error-container `#FFDAD6`, Base Surface
> `#FBF8FF`, Plus Jakarta Sans, `16px` card radius, `9999px` pill buttons): a screen reached from a
> "Can't complete this delivery?" text link, showing a short list of common reason chips ("Customer
> not reachable", "Wrong address", "Customer refused", "Other") plus a free-text field below them,
> and a confirmation dialog ("Are you sure? This will mark the delivery as failed.") before a final
> red "Confirm Failed Delivery" button. After confirming, show a simple return-to-waiting state. Do
> not design a reassignment control here — reassigning a failed delivery to another partner is an
> admin action, not something the delivery partner does themselves.

---

## DB-06 — Admin Delivery Queue & Dispatch

### A. Identification
- Role: Admin.
- Type: missing screen — `UI-SCREEN-COVERAGE.md` row "Admin Delivery Queue & Dispatch" is marked
  `_(None in Stitch)_`.
- Existing route: `/admin/delivery-queue` (`AdminDeliveryQueuePage.tsx`, functional wireframe,
  BC-010).
- Backend: `GET /api/v1/admin/delivery-assignments/eligible-orders`,
  `GET .../:orderId`, `POST .../:orderId/assign`, `PATCH .../:orderId/cancel`
  (`admin-delivery-assignment.controller.ts`).

### B. Business purpose and context
An admin (today, manual dispatch per ADR-0010 — no auto-assignment algorithm exists) reviews orders
ready for delivery and assigns each to an available delivery partner.

### C. Functional requirements
- A table/list of eligible orders — `fulfilment_type: DELIVERY`, `status` in `READY` or
  `DELIVERY_FAILED`, ordered by `placed_at` ascending (oldest first). Columns: order number,
  placed-at time, status, (optionally a client-computed "waiting for Xm" badge — **the backend
  returns only `placed_at`, no SLA/age field**, so any countdown must be computed in the frontend
  from that timestamp, not assumed to come from the API).
- A per-row "Assign" action opening a partner-selection control (`AssignDeliveryDto` only takes
  `deliveryPartnerId` — no notes/reason field exists for assignment itself).
- A per-row "Cancel" action requiring a reason (`ReasonDto{reason}`) for `DELIVERY_FAILED` orders
  that should stop being retried.
- No live map/geolocation of partners — no such data is exposed by any endpoint; **do not design a
  dispatch map.**

### D. Data and business rules
- One active assignment per partner — the partner-picker should reflect real availability, but the
  exact "available partners" list endpoint was not in scope of this research; confirm its shape
  before building the picker, rather than assuming partner status fields not verified here.
- Assignment and cancellation are the only two admin actions on this queue — no bulk-assign.

### E. Visual and responsive requirements
- Desktop-first (admin back-office tool) — reuse the general admin-table visual language that the
  Platform Admin Merchant Approvals screens (#1/#27) already establish for consistency.
- A mobile/tablet-responsive fallback is lower priority but should not break.

### F. Stitch-ready prompt

> Design a **desktop (1280px wide)** "Delivery Queue & Dispatch" admin screen for "Dropzo", a
> grocery marketplace in Badarpur (Coral `#FF5733` primary, Base Surface `#FBF8FF`, Plus Jakarta
> Sans, `16px` card radius), reusing the same admin back-office visual language (side navigation,
> table layout, modal patterns) as the existing "Platform Admin — Merchant Approvals & Store
> Onboarding — Desktop" screen for consistency. Show a table of orders awaiting delivery dispatch
> with columns: Order Number, Placed At (time), Status (a "Ready" or "Delivery Failed" badge), and
> a computed "Waiting {X} min" indicator calculated from the placed-at time (note: this is
> calculated on the client — there is no separate SLA field from the server). Each row has an
> "Assign" button opening a simple dropdown/modal to pick an available delivery partner by name,
> and a "Cancel" button (for Delivery Failed rows) that opens a reason text field before confirming.
> Do not design a live map or partner-location tracking view — this system has no geolocation data
> to show. Do not show any delivery-partner contact details beyond their name in this table.

---

## DB-07 — Admin COD Handover & Cash Reconciliation

### A. Identification
- Role: Admin.
- Type: missing screen — `UI-SCREEN-COVERAGE.md` row "Admin COD Handover & Cash Reconciliation" is
  marked `_(None in Stitch)_`.
- Existing route: `/admin/delivery-partners/:id/cod` (`AdminCodHandoverPage.tsx`, functional
  wireframe, BC-010).
- Backend: `GET /api/v1/admin/delivery-partners/:id/cod-summary`,
  `GET .../cod-handovers`, `POST /api/v1/admin/delivery-assignments/cod-handovers`
  (`admin-delivery-partner.controller.ts`, `admin-delivery-assignment.controller.ts`).

### B. Business purpose and context
A delivery partner collects cash from customers across several COD deliveries during the day; an
admin periodically reconciles — recording that a specific set of already-collected cash amounts
have been physically handed over to the business.

### C. Functional requirements
- A summary panel per partner: `outstandingBalance` (total cash still owed to the business) and a
  list of `uncollectedAssignments`, each with `{ orderId, amount, collectedAt }` — **no denomination
  breakdown field exists anywhere in the API** (confirmed) — do not design a ₹2000/₹500/₹100-note
  counting grid; this is a simple amount-per-order reconciliation, not a cash-drawer till count.
- A multi-select list of the uncollected assignments (checkboxes), an optional notes field
  (`notes`, ≤2000 chars), and a "Record Handover" action that submits the selected `orderIds` plus
  the `deliveryPartnerId` (`RecordHandoverDto`).
- A history view of past handovers (`GET .../cod-handovers`).

### D. Data and business rules
- `orderIds` must be a non-empty, unique set of the assignments actually being reconciled in this
  handover — the UI must prevent selecting zero items or submitting duplicates.
- No partial-amount handover exists — an assignment is either included (its full
  `cod_collected_amount` counted) or not; **do not design a partial/split-amount input.**

### E. Visual and responsive requirements
- Desktop-first admin tool, consistent with DB-06's admin visual language.

### F. Stitch-ready prompt

> Design a **desktop (1280px wide)** "COD Handover & Reconciliation" admin screen for "Dropzo"
> (Coral `#FF5733` primary, Forest Green `#006E2D` for positive/reconciled states, Base Surface
> `#FBF8FF`, Plus Jakarta Sans, `16px` card radius), reusing the same admin back-office visual
> language as the existing Platform Admin Merchant Approvals screen. Show, per selected delivery
> partner: a summary card with "Outstanding Balance: ₹{amount}", then a checkbox list of
> uncollected cash amounts (each row: order number, amount, collected date/time), a text field for
> optional notes, and a primary "Record Handover" button that is disabled until at least one row is
> checked. Below that, a simple history table of past handovers (date, amount, notes). Do **not**
> design a cash-denomination counting grid (no ₹2000/₹500/₹100 note breakdown) — the system
> reconciles by order amount only, not physical note counts. Do not allow a partial amount to be
> entered for a single order — each listed amount is all-or-nothing.

---

## DB-08 — Shared state: Empty Cart Drawer

### A. Identification
- Role: Customer.
- Type: missing shared state (`UI-SCREEN-COVERAGE.md` Gap 4).
- Related route: future `/checkout` and the cart drawer on Home/Catalogue (none implemented yet).

### B. Business purpose and context
Shown when a customer opens the cart drawer/sheet with zero items — the very first state every
customer sees before adding anything, and the state they return to after checkout completes.

### C. Functional requirements
- Illustration or icon, "Your cart is empty" headline, one line of supporting copy, and a single
  primary CTA "Browse stores" that closes the drawer and returns to Home.
- No price/line-item area rendered in this state.
- Must work inside both a bottom-sheet (mobile) and a sidebar drawer (desktop — see Store
  Catalogue desktop screen #33, which has a "cart preview sidebar").

### D. Data and business rules
- No cart line items; no totals; no fulfillment-method selector. Do not pre-fill mock products.

### E. Visual and responsive requirements
- Use the project's standard empty-state pattern (icon + headline + description + action) already
  implemented in code as `components/ui/EmptyState` — the Stitch design should match that
  anatomy so the two stay visually consistent.
- Mobile: full-width bottom sheet. Desktop: right-hand sidebar panel width matching screen #33.

### F. Stitch-ready prompt

> Design an **empty-cart state** for "Dropzo", a Badarpur grocery marketplace, matching the
> existing approved design system (Coral `#FF5733` primary, Base Surface `#FBF8FF`, Plus Jakarta
> Sans, `16px` card radius, `9999px` pill buttons). Show it in two variants: (1) a mobile bottom
> sheet, (2) a desktop sidebar panel matching the "Maa Tara Groceries Catalogue — Desktop" screen's
> cart-preview sidebar. Content: a simple cart/basket icon, headline "Your cart is empty", one line
> of supporting text ("Add items from a store to get started"), and a single Coral pill button
> "Browse stores". Do not show any price, item list, or fulfillment-method control in this state —
> it is the zero-items case only. Do not invent sample products to fill the space.

---

## DB-09 — Shared state: Store Closed / Outside Delivery Hours Banner

### A. Identification
- Role: Customer.
- Type: missing shared state (Gap 4).
- Related routes: future Home (`/`) and Store Catalogue (`/stores/:storeId`).

### B. Business purpose and context
A store exists and is browsable, but is currently closed (owner-toggled) or outside its configured
operating hours (`PATCH .../hours` from BC-010's Store Settings screen). The customer should see
this clearly before trying to add items, not discover it only at checkout.

### C. Functional requirements
- An inline banner (not a full-page takeover) at the top of the Store Catalogue screen and on each
  closed store's card on Home: "Closed now" or "Opens at {time}" label, in a muted/neutral tone
  (not an error color — this is normal, expected state, not a failure).
- Product cards still render, but their `QuantityStepper`/add controls are disabled, consistent
  with the already-implemented stock-based disabling.
- "Outside delivery hours" is distinct copy from "Closed" and should be visually distinguishable if
  the owner wants that nuance confirmed with real `hours` data before this is built.

### D. Data and business rules
- Backed by the real store `status`/`hours` fields already exposed via
  `PATCH /api/v1/merchants/me/stores/:storeId/status` and `.../hours` (BC-010, confirmed in code).
  **Do not invent a different closed/open computation** — use whatever the store-hours schema
  actually returns once the public store-listing endpoint (Stage 1 blocker) exists.

### E. Visual and responsive requirements
- Reuse the `Badge`/banner visual language already in the design system (neutral tone, `label-lg`
  typography). Mobile and desktop both need it — same banner, full-width on mobile, inline on the
  desktop store header.

### F. Stitch-ready prompt

> Design a **"store closed" inline banner** state for "Dropzo", a Badarpur grocery marketplace
> (Coral `#FF5733` primary, Base Surface `#FBF8FF`, Plus Jakarta Sans, `16px` card radius). Show it
> in two places: (1) as a small badge on a store card on the customer Home screen (reuse the
> existing "Dropzo Home Marketplace" screen's store-card layout, add a neutral-gray "Closed now" or
> "Opens at 9:00 AM" pill in the card's corner), and (2) as a full-width banner at the top of the
> Store Catalogue screen (reuse the existing "Maa Tara Groceries Store Catalogue" screen's layout,
> insert the banner directly under the store header) with the product grid still visible but every
> product's quantity-stepper control shown in a disabled/grayed-out state. Use a neutral gray tone
> for this banner, not red/error — being closed is an expected, non-error state. Do not invent a
> specific closing time or store name; leave the time as a placeholder like "{opens_at}".

---

## DB-10 — Shared state: No Stores Found in Service Zone

### A. Identification
- Role: Customer.
- Type: missing shared state (Gap 4).
- Related route: future Home (`/`).

### B. Business purpose and context
Dropzo launches in a single service zone (Badarpur). A customer whose detected/selected location
falls outside that zone, or whose zone currently has zero active stores, needs an honest
"not available here yet" message instead of a blank or broken-looking grid.

### C. Functional requirements
- Full-section empty state (not a toast): icon/illustration, headline "Dropzo isn't in your area
  yet", supporting copy naming Badarpur as the current launch area, and (optionally) a "Notify me"
  action only if a real notify-signup endpoint is confirmed to exist — **do not design a capture
  form against an endpoint that doesn't exist; if none exists, omit the action entirely.**

### D. Data and business rules
- Depends on the same not-yet-built public store-listing endpoint as DB-08/Home itself — this
  state is what that endpoint returns zero stores for the resolved `service_zone`.

### E. Visual and responsive requirements
- Centered, full-viewport-height section replacing the store grid. Mobile and desktop both need a
  version; desktop can be narrower/centered rather than full-bleed.

### F. Stitch-ready prompt

> Design a **"no stores in your area" empty state** for "Dropzo", a grocery marketplace currently
> launching only in Badarpur, Sribhumi, Assam (Coral `#FF5733` primary, Base Surface `#FBF8FF`,
> Plus Jakarta Sans). This replaces the entire store grid on the customer Home screen when no
> stores are available for the customer's location. Content: a simple map-pin or location icon,
> headline "Dropzo isn't in your area yet", supporting text "We're currently serving Badarpur,
> Sribhumi — more areas are coming soon." Do not include a notify-me email/phone capture form — no
> such backend feature is confirmed to exist. Mobile: full-height centered section. Desktop: the
> same content centered in a narrower column, keeping the top location bar and category rail
> visible above it exactly as in the existing "Dropzo Marketplace Home — Desktop" screen.

---

## DB-11 — Shared state: Network Offline Alert

### A. Identification
- Role: All (Customer, Merchant, Admin, Delivery Partner).
- Type: missing shared state (Gap 4).
- Related routes: every screen — this is a global, cross-cutting component.

### B. Business purpose and context
Badarpur is a connectivity-variable area; any screen can lose network mid-session. The user needs
a clear, non-blocking signal and a manual retry, rather than a silent hang or a confusing empty
list that looks like "no data" instead of "no connection".

### C. Functional requirements
- A persistent top banner (not a modal) that appears when a request fails due to network loss, with
  the text "You're offline — check your connection" and a "Retry" button.
- Must not replace in-place content — existing cached data (e.g. a previously loaded order list)
  stays visible underneath the banner.
- Dismisses automatically once a retried request succeeds.

### D. Data and business rules
- Purely a client-side network-state concern — no backend endpoint involved. Must not be confused
  with the existing `ErrorState`/`ApiError` component, which represents a real server error with
  connectivity present; this state applies specifically to network loss.

### E. Visual and responsive requirements
- Full-width banner pinned to the top of the viewport, below any existing page header, in a warning
  tone (not error-red — matches the "warning" badge/toast tone already in the design system).
  Same banner on mobile and desktop; only the width changes.

### F. Stitch-ready prompt

> Design a **network-offline banner** for "Dropzo", a grocery marketplace app (Coral `#FF5733`
> primary, warning tone `#FEF3C7` background / `#854D0E` text, Plus Jakarta Sans, base spacing unit
> `4px`). It is a thin, full-width banner pinned under the page's top navigation/header, showing a
> small wifi-off icon, the text "You're offline — check your connection", and a small text-button
> "Retry" aligned to the right. Show it overlaid on top of an existing screen with content still
> visible underneath (use the customer Order Status screen as the background context, to show it
> does not block or replace existing content). Mobile and desktop versions — same component, full
> width in both. Do not add a dismiss/close icon — it should only disappear once connectivity is
> confirmed restored.

---

## Consolidated owner handoff report

### 1. Verified implementation inventory through BC-010

- Backend (`apps/api`): auth (OTP login, RBAC), merchant application lifecycle, store CRUD/status/
  hours, product catalogue, store listings, inventory (receive/adjust/remove/movements), cart,
  checkout, stock reservation, order creation and retrieval, merchant order
  accept/reject/preparing/ready, hash-only pickup codes, COD ledger posting, delivery-partner
  onboarding/activation, admin manual delivery assignment, the full delivery
  accept/reject/collect/out-for-delivery/verify/fail workflow, hash-only delivery codes, and COD
  cash-handover reconciliation. No public customer-facing store/product-listing endpoint exists.
- Frontend (`apps/web`): Login, customer order list/detail, merchant order detail, admin delivery
  queue, admin COD handover, delivery-partner inbox — all now on the BC-011 theme/component system
  (`COMPONENT-LIBRARY.md`); customer Home/Catalogue/Checkout and all merchant onboarding/inventory/
  settings/analytics screens, and the Admin Merchant Approvals screen, are not yet built.

### 2. Actual counts

- 29 functional Stitch screens (15 mobile, 14 desktop), + 1 reference image + 8 doc-extract cards =
  38 raw Stitch canvas entries.
- `apps/web`: 14 route files; 1 shared layout (`AppShell`); 18 `components/ui/` primitives + 6
  `components/domain/` components (new in BC-011); 4 user roles (Customer, Merchant, Admin,
  Delivery Partner).
- Frontend test suite: 9 files / 25 tests (BC-011).

### 3. Existing pages matched to Stitch screen IDs

See `UI-SCREEN-COVERAGE.md` §1 (the full traceability matrix) — every screen with a Stitch Screen
ID column populated already has an approved design; this document does not repeat that matrix.

### 4. Existing pages ready for redesign (design exists in Stitch, not yet restyled in `apps/web`)

Customer Home (`/`), Store Catalogue (`/stores/:storeId`), Cart & Checkout (`/checkout`), Merchant
Onboarding KYC/Regulatory/Banking (`/merchant/onboarding/*` — 6 screens, **blocked**: the
`merchants/me` DTO has no PAN/FSSAI/bank/GSTIN fields at all, confirmed by this session's own code
read — build only as far as `legalName`/`displayName`/`businessType`/`contactPersonName`/
`contactPhone`/`businessEmail`/`businessAddress`/`city`/`district`/`state`/`postalCode`/
`businessDescription` actually support, or raise a backend task first), Merchant Inventory
(`/merchant/inventory`), Merchant Store Settings (`/merchant/settings`), Platform Admin Merchant
Approvals (`/admin/merchant-approvals`). Merchant Analytics (`/merchant/analytics`) has a Stitch
design but **no backing data at all** — do not implement against fabricated numbers; either leave
it or commission a backend analytics task first.

### 5. Pages or components missing from Stitch (this document's subject — DB-01 through DB-11 above)

The entire Delivery Partner role (DB-02–DB-05), Admin Delivery Queue (DB-06), Admin COD Handover
(DB-07), the Merchant POS Login desktop variant (DB-01), and four shared states (DB-08–DB-11).

### 6. Designed screens that have no implementation

The same list as item 4 above — these need no new Stitch work, only `apps/web` build-out once their
data dependencies (noted per-screen) are resolved.

### 7. Unresolved business/technical requirements

- No public store/product-listing endpoint — blocks Customer Home, Store Catalogue, and this
  document's DB-09/DB-10 shared states from ever being wired to real data.
- Merchant onboarding has no PAN/FSSAI/bank/GSTIN backend fields — the 6 already-designed
  onboarding screens cannot be built as designed without a backend scope decision.
- No merchant analytics data source exists at all.
- No "available delivery partners" listing endpoint was confirmed during this session's research —
  verify its shape before building DB-06's partner-picker control.
- The customer-facing *pickup* code is 4 digits; the delivery-partner-facing *delivery-verification*
  code is 6 digits — these are different mechanisms with different digit counts. Keep this
  distinction in any future design work; do not assume they share one component as-is.

### 8. Numbered list of required owner actions

1. Open Google Stitch project `3837531702173487386` and create the 11 items DB-01 through DB-11
   above, using the exact prompts in section F of each brief (copy-paste, one at a time).
2. Decide whether to commission a public store/product-listing backend endpoint (blocks Customer
   Home, Store Catalogue, DB-09, DB-10) — a new task, not covered by this document.
3. Decide whether to extend the `merchants/me` DTO with PAN/FSSAI/bank/GSTIN fields, or to scope
   down the 6 already-designed onboarding screens to match the current, smaller DTO.
4. Decide whether to commission a merchant-analytics backend feature, or leave
   `/merchant/analytics` unbuilt.
5. Once any of DB-01–DB-11 are created in Stitch, share the new screen IDs so they can be retrieved
   via the Stitch MCP, checked against this document's briefs, and queued for `apps/web`
   implementation.
6. Review and approve (or redirect) the "Recommended next task" ordering in `ROADMAP.md`'s "Next"
   section, which already reflects items 2–4 above.

### 9. Stitch prompts

All 11 prompts are given in full in section F of each brief above (DB-01 through DB-11), organized
by role: Merchant (DB-01), Delivery Partner (DB-02–DB-05), Admin (DB-06–DB-07), Customer/shared
(DB-08–DB-11). No prompt duplicates another — DB-02 through DB-05 are sequential steps of one
workflow, each a distinct screen state.

---

## Mandatory pause/resume process for this document

Per the task's "Additional Mandatory Phase" instruction: implementation of anything listed in
section 5/DB-01–DB-11 above is **paused** until the owner creates (or points to) the corresponding
Stitch design and it has been checked against its brief. All already-approved, already-designed
work (section 4 above, and anything in `ROADMAP.md`'s existing "Next" list) is **not** blocked by
this pause and may proceed independently. Once the owner supplies new Stitch screen IDs for any of
DB-01–DB-11, the next step is: retrieve the screen via the Stitch MCP, compare it against that
brief's requirements (A–E), update this document's summary table status, update
`UI-SCREEN-COVERAGE.md`'s matrix with the new screen ID, and only then begin `apps/web`
implementation.
