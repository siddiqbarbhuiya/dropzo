# Stitch Design Audit — Dropzo Quick Commerce

**Status: Approved Audit.**  
**Stitch Project ID:** `3837531702173487386` (`projects/3837531702173487386`)  
**Project Title:** `Dropzo`  
**Audit Date:** 2026-11-11  
**Project Type:** `TEXT_TO_UI_PRO` | **Origin:** `WEB` | **Visibility:** `PUBLIC`  
**Total Canvas Elements Audited:** 38 items (29 Functional UI Screens, 1 Reference Image, 8 Document Knowledge Cards)

> **Audit correction (2026-11-11, BC-011 Stage 1):** Re-verified against a live `list_screens` call.
> The original count of "30 Functional UI Screens / 7 Document Knowledge Cards" undercounted the
> knowledge cards by one and overcounted functional screens by one (the table in section 2 already
> listed 9 reference rows, not 8 — this header just hadn't been reconciled with it). Corrected to
> 29 / 1 / 8 = 38. Of the 29 functional screens, only 28 form true mobile/desktop pairs (14 pairs);
> **Dropzo Merchant POS Login & OTP (`3356568780464f91b971a22c5a4a461a`) is mobile-only — it has no
> desktop counterpart in Stitch**, so "15 mobile, 15 desktop" below is wrong (actual: 15 mobile, 14
> desktop). See `UI-SCREEN-COVERAGE.md` for the corrected coverage statistics and backend-endpoint
> verification.

---

## 1. Executive Summary

This document records the evidence-based design audit of the Google Stitch MCP project created for Dropzo's hyperlocal marketplace in Badarpur, Assam. Every screen, component, and canvas artifact was queried via Stitch MCP tools (`list_screens`, `get_screen`, `download_file`), downloaded to local audit storage (`audit/stitch-audit/`), and inspected for structural compliance against the Dropzo platform architecture, functional requirements (FR-001 to FR-010), and the current React frontend implementation (`apps/web`).

### Key Audit Findings

1. **29 Complete Production UI Screens Available**:
    - Stitch contains 15 mobile screens (`390px` width) and 14 corresponding desktop screens
      (`1280px` width) — Merchant POS Login (mobile) has no desktop pair.
    - High fidelity visual layouts covering Customer Browsing, Customer Store Catalogue, Cart & Checkout, Pickup Order Tracking, Merchant Multi-Step KYC Onboarding, Merchant Regulatory (FSSAI/Trade License), Merchant Bank Settlement, Merchant Order POS Terminal, Merchant Inventory Management, Merchant Operations/Timings, Merchant Analytics, Platform Admin Approvals, and Shared Multi-Role OTP Login.
2. **9 Canvas Reference / Knowledge Elements**:
    - 1 Dribbble design reference asset (Screen #4, `5ec94c3c42724c37a6e5f2ba9bfec487`).
    - 8 Knowledge card text extracts from Dropzo repo documentation (`AGENTS.md`, `README.md`,
      `FUNCTIONAL-REQUIREMENTS.md`, `PROJECT-OVERVIEW.md`, `github.com/.../dropzo`, a Dribbble shot
      write-up, and two ChatGPT share-link transcripts — the table below already listed all 9 rows
      (#4, #14, #15, #16, #19, #23, #24, #28, #32); only this summary count was off by one.
3. **Critical Design Gap Identified (Delivery Partner)**:
    - Stitch currently contains **zero screens for the Delivery Partner role**.
    - While the backend and React frontend have initial delivery queues and inbox APIs (`BC-010`), the Stitch UI canvas has no mobile dispatch, order pickup verification, or COD cash collection interfaces.
4. **Implementation Disparity**:
    - `apps/web` currently features basic wireframes for order detail and login, and completely lacks Customer Marketplace Home, Store Catalogue, Cart/Checkout, Merchant Onboarding, Merchant Inventory, and Merchant Settings.

---

## 2. Complete 38-Screen Canvas Inventory

All 38 elements from project `3837531702173487386` are enumerated below with exact identifiers, dimensions, export status, and primary controls.

| #   | Screen ID                          | Screen Title                                               | Role / Scope | Form Factor | Dimensions (W×H) | HTML Status | Screenshot Status | Key UI Elements & Controls                                                                                                  |
| --- | ---------------------------------- | ---------------------------------------------------------- | ------------ | ----------- | ---------------- | ----------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | `5daffa168d524dfca9293602713df5df` | Platform Admin - Merchant Approvals - Mobile               | Admin        | Mobile      | 390 × 1531       | Downloaded  | Downloaded        | Pending/Resubmitted/Approved filter tabs, KYC match score, compliance checklist, Approve/Reject action bar                  |
| 2   | `4ea61046b65a4effa3ce7492fbc197b1` | Dropzo Marketplace Home - Desktop                          | Customer     | Desktop     | 1280 × 2419      | Downloaded  | Downloaded        | Badarpur town selector, search bar, Express Delivery / Store Pickup toggle, category capsules, store cards, banner carousel |
| 3   | `6591032fa8a4451bae3f9ee9e6e6db16` | Merchant Store Settings & Timings - Mobile                 | Merchant     | Mobile      | 390 × 1465       | Downloaded  | Downloaded        | Quick pause store toggle, operating hours weekly schedule, fulfillment mode toggles, SLA alerts                             |
| 4   | `5ec94c3c42724c37a6e5f2ba9bfec487` | Image from Dribbble Reference                              | Reference    | Unknown     | 512 × 384        | N/A (Image) | Downloaded        | External design reference image card from Dribbble                                                                          |
| 5   | `42930197a23845dbaf477bee152a59dd` | Merchant Store Settings & Operations - Desktop             | Merchant     | Desktop     | 1280 × 1351      | Downloaded  | Downloaded        | Store status switches (Live, Busy, Closed), audio volume toggle, weekly schedule matrix, prep time buffer controls          |
| 6   | `2efaa34bf1184438a276be85f774dcdb` | Merchant Onboarding & KYC Application - Mobile             | Merchant     | Mobile      | 390 × 1748       | Downloaded  | Downloaded        | Step 1 progress bar, PAN/Aadhaar document upload, photo selfie capture, store location picker                               |
| 7   | `129b076d685a4edeaf1945a394e8e644` | Merchant Analytics & Daily Metrics - Desktop               | Merchant     | Desktop     | 1280 × 1644      | Downloaded  | Downloaded        | Revenue cards, hourly sales velocity chart, fulfillment funnel speed, top-selling SKUs table                                |
| 8   | `9223b7ea9c6f4634a7c8b03a9b2d219e` | Merchant FSSAI & Trade License Registration - Mobile       | Merchant     | Mobile      | 390 × 1862       | Downloaded  | Downloaded        | FSSAI 14-digit registration number, FoSCoS certificate upload, municipal trade license number, expiry picker                |
| 9   | `6e8e53ec0dd94139be2dd1ea038a8dde` | Dropzo Login & OTP Verification - Mobile                   | Shared Auth  | Mobile      | 390 × 1091       | Downloaded  | Downloaded        | Customer/Merchant POS/Admin role toggle, 10-digit Indian mobile number input, 6-digit OTP fields, timer                     |
| 10  | `e7a900663c134b239399436c60b94820` | Dropzo Login & OTP Portal - Desktop                        | Shared Auth  | Desktop     | 1280 × 1252      | Downloaded  | Downloaded        | Badarpur brand illustration, role selector tabs, mobile input, split OTP input blocks, Resend SMS link                      |
| 11  | `2cb488d52d424bdbbcdfe08dc04eeadb` | Maa Tara Groceries Store Catalogue                         | Customer     | Mobile      | 390 × 1698       | Downloaded  | Downloaded        | Store banner, rating/prep time chips, category horizontal scroll, product cards with `ADD` stepper pill, sticky cart pill   |
| 12  | `3356568780464f91b971a22c5a4a461a` | Dropzo Merchant POS Login & OTP - Mobile                   | Shared Auth  | Mobile      | 390 × 1139       | Downloaded  | Downloaded        | Pre-selected Merchant POS role, dedicated store terminal disclaimer, PIN/OTP login                                          |
| 13  | `0f9149f6ef8f4b3d99077ad561339635` | Pickup Order Status & Verification                         | Customer     | Mobile      | 390 × 1873       | Downloaded  | Downloaded        | Order progress bar, 4-digit Pickup PIN card, store directions button, item breakdown, invoice download                      |
| 14  | `45343347cff148d99d2ee6754df6405e` | Extracted text from FUNCTIONAL-REQUIREMENTS.md             | Reference    | Unknown     | 600 × 600        | Downloaded  | N/A (Doc)         | Reference knowledge card embedded on canvas                                                                                 |
| 15  | `951b6cf627c94c3d8c342ac97fcaa7c1` | Extracted text from chatgpt.com/share                      | Reference    | Unknown     | 600 × 600        | Downloaded  | N/A (Doc)         | Reference knowledge card embedded on canvas                                                                                 |
| 16  | `0128b5e9f6614d6b966bb30e1e8d94cb` | Extracted text from github.com/siddiqbarbhuiya/dropzo      | Reference    | Unknown     | 600 × 600        | Downloaded  | N/A (Doc)         | Reference knowledge card embedded on canvas                                                                                 |
| 17  | `7dafe4578dda46dfb093cad7eab02188` | Dropzo Home Marketplace                                    | Customer     | Mobile      | 390 × 1724       | Downloaded  | Downloaded        | Badarpur location bar, fulfillment mode switcher (Delivery/Pickup), category grid, popular local stores, bottom nav         |
| 18  | `fb2ece82075f4fae9ea701ba62de9e32` | Merchant Order Management & Acceptance Dashboard - Desktop | Merchant     | Desktop     | 1280 × 1050      | Downloaded  | Downloaded        | Loud alert toggle (`LOUD ALERT ON`), incoming order sound, Accept/Reject buttons, Verify Pickup PIN modal                   |
| 19  | `881ea4970bfe4d1986ce563c21914075` | Extracted text from AGENTS.md                              | Reference    | Unknown     | 600 × 600        | Downloaded  | N/A (Doc)         | Reference knowledge card embedded on canvas                                                                                 |
| 20  | `512136086ddc45a78316317b58ef4332` | Merchant FSSAI & Trade License Registration - Desktop      | Merchant     | Desktop     | 1280 × 1657      | Downloaded  | Downloaded        | FSSAI FoSCoS live verify button, file upload dropzone, Badarpur municipal license verification                              |
| 21  | `f0f05e05c68a43c89251ec6f567fa9a9` | Cart & Fulfillment Checkout                                | Customer     | Mobile      | 390 × 1389       | Downloaded  | Downloaded        | Store pickup (Free) vs Home Delivery (₹20) segmented cards, item list with steppers, bill details, COD option               |
| 22  | `81cb16257cae4ad5b2d6e513b2ac538f` | Merchant Order Management & Acceptance - Mobile            | Merchant     | Mobile      | 390 × 1086       | Downloaded  | Downloaded        | Incoming order banner, item checklist, preparation timer, Mark Ready button, Pickup PIN entry pad                           |
| 23  | `49ae29b4944c497aa652ad2045f5368b` | Extracted text from README.md                              | Reference    | Unknown     | 600 × 600        | Downloaded  | N/A (Doc)         | Reference knowledge card embedded on canvas                                                                                 |
| 24  | `b9cbc8b6223e408689a1eb7b56b365ca` | Extracted text from chatgpt.com/share                      | Reference    | Unknown     | 600 × 600        | Downloaded  | N/A (Doc)         | Reference knowledge card embedded on canvas                                                                                 |
| 25  | `163bcf5a0ab944368c6bf51cc47b791e` | Merchant Inventory & Stock Management - Mobile             | Merchant     | Mobile      | 390 × 1457       | Downloaded  | Downloaded        | Search SKUs, In-Stock switch, quick price edit, low stock pill alerts, Add SKU button                                       |
| 26  | `2611e18bee8841dfb4409a8fac3a331d` | Merchant Analytics & Daily Metrics - Mobile                | Merchant     | Mobile      | 390 × 1743       | Downloaded  | Downloaded        | Total sales card, order count, average preparation SLA, rush hour graph, top category breakdown                             |
| 27  | `0692e238094a4181a8b2dd0e0c9f80e8` | Platform Admin - Merchant Approvals & Store Onboarding     | Admin        | Desktop     | 1280 × 2620      | Downloaded  | Downloaded        | Side navigation, merchant queue table, split document viewer, FSSAI FoSCoS validation status, Approve/Reject modal          |
| 28  | `e60e9d5eecd04818ad497c58c17e03d8` | Extracted text from Dribbble Smart Grocery                 | Reference    | Unknown     | 600 × 600        | Downloaded  | N/A (Doc)         | Reference knowledge card embedded on canvas                                                                                 |
| 29  | `57e0783864824b8ab618af95a229d5d3` | Cart & Fulfillment Checkout - Desktop                      | Customer     | Desktop     | 1280 × 1857      | Downloaded  | Downloaded        | Two-column checkout, delivery address selection with Badarpur landmarks, fulfillment radio cards, item summary              |
| 30  | `9b6c3d01c8bc43938a1534186b076266` | Merchant Inventory & Stock Management - Desktop            | Merchant     | Desktop     | 1280 × 1040      | Downloaded  | Downloaded        | Filterable inventory table, stock log drawer, bulk stock update, low stock alert badge, category filter                     |
| 31  | `e869ce0a516d40deb03a540d963d7e46` | Dropzo OTP Verification - Expired & Error State (Mobile)   | Shared Auth  | Mobile      | 390 × 1273       | Downloaded  | Downloaded        | Error banner "Invalid code. 2 attempts remaining", expired countdown, resend CTA                                            |
| 32  | `e57b044fc4fc4f408f6c252034cf0814` | Extracted text from PROJECT-OVERVIEW.md                    | Reference    | Unknown     | 600 × 600        | Downloaded  | N/A (Doc)         | Reference knowledge card embedded on canvas                                                                                 |
| 33  | `b283620466664737aa9f1405ae410d14` | Maa Tara Groceries Catalogue - Desktop                     | Customer     | Desktop     | 1280 × 2070      | Downloaded  | Downloaded        | Store header with Badarpur Station Road badge, category left sidebar, product grid, cart preview sidebar                    |
| 34  | `f7a2980a2519497994568581373c3e26` | Merchant Bank Settlement & GSTIN Configuration - Desktop   | Merchant     | Desktop     | 1280 × 2246      | Downloaded  | Downloaded        | Step 4 of 4 progress bar, IFSC lookup, account validation, GSTIN input with composition scheme toggle                       |
| 35  | `f155038c35f845d49433cce771e3cef3` | Merchant Onboarding & KYC Application - Desktop            | Merchant     | Desktop     | 1280 × 1832      | Downloaded  | Downloaded        | DigiLocker OTP verification button, PAN validation, store map geofence pin, owner photo upload                              |
| 36  | `541c94ebc309450eb7a022351d97375e` | Merchant Bank Settlement & GSTIN Configuration - Mobile    | Merchant     | Mobile      | 390 × 2030       | Downloaded  | Downloaded        | Current/Savings account radio, Account Number re-entry confirmation, IFSC code resolver, GSTIN exemption checkbox           |
| 37  | `7ef77919f0f64d24ae6d685267eb9e62` | Dropzo OTP Verification - Expired & Error State (Desktop)  | Shared Auth  | Desktop     | 1280 × 1441      | Downloaded  | Downloaded        | Error dialog alert, edit phone number button, resend cooldown timer, support contact                                        |
| 38  | `c4d5c1c9250f40daa239fbc738600724` | Pickup Order Status & Verification - Desktop               | Customer     | Desktop     | 1280 × 1862      | Downloaded  | Downloaded        | Order timeline card, prominent 4-digit pickup code display, store location & timing box, detailed tax invoice               |

---

## 3. Responsive Screen Pairing Matrix

Stitch was designed with a dual-viewport strategy for 14 of the 15 functional mobile screens, each
with an exact corresponding desktop screen. **Dropzo Merchant POS Login & OTP (`3356...461a`,
Screen #12) is the one exception: mobile-only, no desktop pair exists in Stitch.**

| Workflow / Feature           | Mobile Screen (390px)                           | Desktop Screen (1280px)                         | Functional Alignment                                                        |
| ---------------------------- | ----------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| **Marketplace Home**         | Screen #17 (`7dafe4578dda46dfb093cad7eab02188`) | Screen #2 (`4ea61046b65a4effa3ce7492fbc197b1`)  | 100% matched features; desktop expands category layout and sticky search    |
| **Store Catalogue**          | Screen #11 (`2cb488d52d424bdbbcdfe08dc04eeadb`) | Screen #33 (`b283620466664737aa9f1405ae410d14`) | 100% matched; desktop introduces vertical category navigation and cart rail |
| **Cart & Checkout**          | Screen #21 (`f0f05e05c68a43c89251ec6f567fa9a9`) | Screen #29 (`57e0783864824b8ab618af95a229d5d3`) | 100% matched; desktop utilizes two-column checkout layout                   |
| **Pickup Order Tracking**    | Screen #13 (`0f9149f6ef8f4b3d99077ad561339635`) | Screen #38 (`c4d5c1c9250f40daa239fbc738600724`) | 100% matched; PIN card and pickup verification steps aligned                |
| **Shared Auth (Login)**      | Screen #9 (`6e8e53ec0dd94139be2dd1ea038a8dde`)  | Screen #10 (`e7a900663c134b239399436c60b94820`) | 100% matched; desktop features brand panel and split input fields           |
| **Shared Auth (Error)**      | Screen #31 (`e869ce0a516d40deb03a540d963d7e46`) | Screen #37 (`7ef77919f0f64d24ae6d685267eb9e62`) | 100% matched; countdown timers and error banner states                      |
| **Merchant KYC (Step 1)**    | Screen #6 (`2efaa34bf1184438a276be85f774dcdb`)  | Screen #35 (`f155038c35f845d49433cce771e3cef3`) | 100% matched; DigiLocker integration and document upload dropzone           |
| **Merchant FSSAI (Step 2)**  | Screen #8 (`9223b7ea9c6f4634a7c8b03a9b2d219e`)  | Screen #20 (`512136086ddc45a78316317b58ef4332`) | 100% matched; FoSCoS live verification and license document upload          |
| **Merchant Bank (Step 3)**   | Screen #36 (`541c94ebc309450eb7a022351d97375e`) | Screen #34 (`f7a2980a2519497994568581373c3e26`) | 100% matched; IFSC lookup, penny-drop verification indicator, GSTIN form    |
| **Merchant Orders (POS)**    | Screen #22 (`81cb16257cae4ad5b2d6e513b2ac538f`) | Screen #18 (`fb2ece82075f4fae9ea701ba62de9e32`) | 100% matched; sound toggle, large touch targets, PIN keypad                 |
| **Merchant Inventory**       | Screen #25 (`163bcf5a0ab944368c6bf51cc47b791e`) | Screen #30 (`9b6c3d01c8bc43938a1534186b076266`) | 100% matched; desktop adds SKU audit log drawer and bulk edit               |
| **Merchant Settings**        | Screen #3 (`6591032fa8a4451bae3f9ee9e6e6db16`)  | Screen #5 (`42930197a23845dbaf477bee152a59dd`)  | 100% matched; store emergency pause and schedule controls                   |
| **Merchant Analytics**       | Screen #26 (`2611e18bee8841dfb4409a8fac3a331d`) | Screen #7 (`129b076d685a4edeaf1945a394e8e644`)  | 100% matched; hourly velocity and SLA metrics                               |
| **Platform Admin Approvals** | Screen #1 (`5daffa168d524dfca9293602713df5df`)  | Screen #27 (`0692e238094a4181a8b2dd0e0c9f80e8`) | 100% matched; document review and compliance checklist                      |

---

## 4. Local Audit Storage Verification

All downloaded source files have been verified in the audit folder:

- **HTML exports (37 files)**: Located at `audit/stitch-audit/html/<screen_id>.html`
- **Screenshots (30 files)**: Located at `audit/stitch-audit/screenshots/<screen_id>.png`
- **Full Inventory Data**: Located at `audit/stitch-audit/screens-inventory.json`
- **Project Canvas Metadata**: Located at `audit/stitch-audit/project-details.json`
