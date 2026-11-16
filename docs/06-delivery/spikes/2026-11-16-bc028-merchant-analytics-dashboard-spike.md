# Spike: BC-028 — Merchant Analytics & Daily Performance Dashboard

**Date:** 2026-11-16  
**Author:** Antigravity (Implementation Engineer)  
**Status:** Approved (Pre-authorized autonomous execution pipeline)  
**Confidence Level:** 99%  
**Task ID:** BC-028  
**Route:** `/merchant/analytics`  
**Stitch Designs:**
- Desktop (1400px Canvas): `129b076d685a4edeaf1945a394e8e644` (`audit/stitch-audit/html/129b076d685a4edeaf1945a394e8e644.html`, `audit/stitch-audit/screenshots/129b076d685a4edeaf1945a394e8e644.png`)
- Mobile (390px Canvas): `2611e18bee8841dfb4409a8fac3a331d` (`audit/stitch-audit/html/2611e18bee8841dfb4409a8fac3a331d.html`, `audit/stitch-audit/screenshots/2611e18bee8841dfb4409a8fac3a331d.png`)

---

## 1. Problem Statement & Scope

Dropzo merchants operating grocery and daily-needs counters in Badarpur (such as *Maa Tara Groceries • BDP-04*) require a comprehensive real-time analytics and daily performance dashboard. 

The dashboard provides glanceable operational intelligence across:
1. **Daily Gross Revenue & Volume Trends**: Total gross revenue (₹4,820), +14.2% daily comparison, order count (26 orders), channel split (65% Pickup vs 35% Delivery).
2. **Speed & SLA Benchmarks**: Fulfillment cycle time (10.8 mins average vs 15.0m target SLA), 98.4% on-time metric, order acknowledgement speed (42s average), and 100% counter PIN verification without lockouts.
3. **Hourly Influx & Commuter Rush Velocity**: Visual hourly bar chart comparing morning rush (8 AM–10 AM), afternoon lull (12 PM–3 PM), and peak commuter arrival rush (5:30 PM–7:00 PM) driven by Silchar-Badarpur train schedules.
4. **Fast-Moving SKUs Leaderboard**: Top products moved today (Fortune Sunlite Sunflower Oil 1L, India Gate Basmati Rice 1kg, Assam Valley CTC Tea 500g, Amul Butter 500g, Fresh Barak Kazi Nemu) with unit sales and category velocity.
5. **Settlement & Cash Reconciliation Card (FR-PAY-001)**: Physical drawer cash to collect (₹3,620), online UPI pre-paid settlement (₹1,200), Dropzo 0% Launch Partner promo deduction, scheduled bank settlement to SBI Badarpur Branch.
6. **Local Operational Insights Bento**: Urgent stock depletion warnings (Barak Kazi Nemu with restock trigger) and Commuter Peak Forecast alerts.
7. **Cross-Platform Responsive Shell**: Desktop navigation tabs (Orders, Inventory, Metrics, Store) with audio chime toggle, profile badge, print EOD action, and mobile bottom navigation bar with active Metrics highlight.

---

## 2. Technical Investigation & Architecture

### Backend API Status
- As documented in `docs/04-design/UI-SCREEN-COVERAGE.md`, dedicated aggregated metrics endpoints do not exist yet in `apps/api`.
- Store and live order queries (`apiClient.listOwnStores` and `apiClient.listMerchantOrders`) exist and provide real merchant store context (`Maa Tara Groceries`).
- In strict adherence to `AGENTS.md` and `GEMINI.md`:
  > "NEVER delete visual sections or simplify layouts because backend database columns/APIs are missing. Preserve all headers, stat cards, toggles, sidebars, and badges using static/default props with `// TODO: wire to API` comments."

### Styling & Theme Tokens
- Component built using `styled-components` conforming to Dropzo design system tokens (`theme.colors.primary`, `theme.colors.secondary`, `theme.colors.surface`, `theme.colors.surfaceContainer`, Plus Jakarta Sans, etc.).
- Complete 1:1 visual match with Stitch Desktop `129b076d685a4edeaf1945a394e8e644` and Mobile `2611e18bee8841dfb4409a8fac3a331d`.

### Route Setup
- Route path: `/merchant/analytics` protected by `<RequireAuth role="MERCHANT_OWNER">`.
- Registered in `apps/web/src/App.tsx`.

---

## 3. Risk Assessment & Mitigations

| Risk | Impact | Mitigation |
|:-----|:-------|:-----------|
| Complex visual bar chart layout | Layout jitter or responsiveness issues | Render cleanly using responsive styled bar flex tracks with hover tooltips and peak callout pills. |
| Inactive vs active date selector | User confusion on date range | Add functional interactive state toggles (`Today`, `Yesterday`, `Last 7 Days`, `This Month`) with active style switching. |
| Print report action | Browser blocking or style break | Wire `window.print()` with clean print media styles. |

---

## 4. Verification Strategy

1. **Unit & Integration Tests**: `apps/web/src/routes/merchant/MerchantAnalyticsPage.test.tsx` verifying:
   - Header, store brand (`Maa Tara Groceries`), date segment switcher, and print/export buttons.
   - Top 5 KPI metric cards (Gross Revenue, Channel Split, AOV, Avg SLA, PIN Verification Rate).
   - Hourly sales velocity bar chart and fulfillment funnel stages.
   - Top-selling SKUs table and settlement breakdown matrix.
   - Date range selector interactive switching.
2. **Typecheck & Linter**: 0 errors on `@dropzo/web`.
3. **Full Test Suite**: All 26 test files passing in `@dropzo/web`.
4. **Live Playwright**: Both Desktop (1280x800) and Mobile (390x844) screenshots captured.

---

## 5. Confidence Score

**99%** — All Stitch HTML/screenshots are in place, design tokens are standard, integration points are clearly mapped. Proceeding to Phase 2 (Implementation Plan).
