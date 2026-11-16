# Implementation Plan: BC-028 — Merchant Analytics & Daily Performance Dashboard

**Date:** 2026-11-16  
**Author:** Antigravity (Implementation Engineer)  
**Status:** Approved (Pre-authorized autonomous execution pipeline)  
**Task ID:** BC-028  
**Route:** `/merchant/analytics`  
**Stitch Designs:** Desktop `129b076d685a4edeaf1945a394e8e644` / Mobile `2611e18bee8841dfb4409a8fac3a331d`

---

## 1. Scope & Objective

Create a 1:1 responsive React page for **Dropzo Merchant Analytics & Daily Performance Dashboard** at `/merchant/analytics` in `apps/web`.

The dashboard features:
- **Top Merchant App Bar**: Store brand, Badarpur Hub live indicator, center navigation tabs (`Orders`, `Inventory`, `Metrics` [Active], `Store`), order sound chime toggle, notifications bell, and terminal profile chip (`Counter 01`).
- **Dashboard Header**: Title, fulfillment on-track pill (98.4%), date filter pill group (`Today`, `Yesterday`, `Last 7 Days`, `This Month`), active date pill, CSV export action, and print report action (`window.print()`).
- **Top 5 KPI Metrics Row**:
  1. Today's Gross Revenue (₹4,820, +14.2% vs yesterday, 26 orders).
  2. Channel Fulfillment Split (65% Pickup ₹3,140 vs 35% Delivery ₹1,680).
  3. Average Order Value (AOV: ₹185.38, +₹12.00 vs 7-day avg).
  4. Avg Fulfillment SLA (10.8 mins, 98.4% on-time, goal < 15 min).
  5. Counter PIN Verification Rate (100%, 0 Lockouts, FR-PICK-001 badge).
- **Hourly Sales & Order Traffic Velocity Bento**:
  - Hourly stacked bar chart from 7 AM to 7 PM highlighting Morning Surge (9 AM) and Evening Commuter Peak (6 PM–7 PM).
  - Hover tooltips and Peak ₹1,120 banner.
  - Badarpur Commuter Rush Insight callout (41% volume during 5:30–7:00 PM train arrivals).
- **Fulfillment Funnel Speed Card**:
  - Stage 1: Order Accepted (Avg 42 sec).
  - Stage 2: Packing & Bagging (Avg 6.4 mins).
  - Stage 3: Counter PIN Handoff (Avg 3.8 mins).
  - Total Cycle Time 10.8 mins benchmark.
- **Top Selling SKUs Velocity Leaderboard**:
  - Top 5 ranked items: Fortune Sunlite Sunflower Oil, India Gate Basmati Rice, Assam Valley CTC Tea, Amul Butter, Fresh Kazi Nemu.
  - Sales count, unit tags, revenue, and stock health indicators.
- **Settlement & Collections Matrix (FR-PAY-001)**:
  - Cash / Pay at Counter (COD): ₹3,620.
  - UPI Direct / Online Pre-paid: ₹1,200.
  - Dropzo Merchant Commission: ₹0.00 (0% Launch Partner Promo).
  - Total Daily Realized Earnings: ₹4,820.00 with automated transfer note to SBI Badarpur Branch.
- **Operational Insights Bento Cards**:
  - Urgent Stock Depletion alert for Barak Kazi Nemu with restock trigger button.
  - Silchar-Badarpur Commuter Peak Ahead alert with staging bin button.
- **Mobile Bottom Navigation Bar**: Fixed bottom navigation with active Metrics tab.

---

## 2. File Changes

### Files to Create:
1. `apps/web/src/routes/merchant/MerchantAnalyticsPage.tsx`
2. `apps/web/src/routes/merchant/MerchantAnalyticsPage.test.tsx`

### Files to Modify:
1. `apps/web/src/App.tsx` (add `/merchant/analytics` route)
2. `docs/06-delivery/TASK-TRACKER.md` (add BC-028 entry)
3. `docs/06-delivery/PROGRESS.md` (append BC-028 completion)

---

## 3. Detailed Component Architecture

### Styled Components Structure:
- `PageContainer`, `TopHeader`, `HeaderInner`, `BrandCluster`, `BrandIcon`, `BrandTextCluster`, `StoreNamePill`, `CenterNav`, `NavTabButton`, `HeaderActions`, `RoundActionButton`, `ProfileChip`
- `MainContainer`, `SubheaderSection`, `SubheaderTitle`, `SubheaderSubtitle`, `DateFilterGroup`, `DateFilterButton`, `DateDisplayPill`, `ActionButton`
- `KpiGrid`, `KpiCard`, `KpiTopRow`, `KpiLabel`, `KpiIconBadge`, `KpiValue`, `KpiFooter`, `ChannelSplitBar`, `ChannelLegend`
- `BentoSection`, `VelocityChartCard`, `ChartHeader`, `ChartLegend`, `BarGridContainer`, `HourlyBarTrack`, `BarPill`, `PeakCallout`, `InsightBanner`
- `FunnelCard`, `FunnelStageList`, `FunnelStageItem`, `ProgressBar`
- `LeaderboardGrid`, `SkuTableCard`, `SkuItemRow`, `RankBadge`, `SkuDetails`, `SkuStats`
- `SettlementCard`, `SettlementMatrix`, `SettlementRow`, `EarningsBanner`
- `AlertsGrid`, `InsightAlertCard`, `AlertIcon`, `AlertContent`, `AlertActions`
- `MobileBottomNav`, `MobileNavItem`

---

## 4. Test Specifications

File: `apps/web/src/routes/merchant/MerchantAnalyticsPage.test.tsx`
- **Test 1**: Renders merchant top header, store identity (`Maa Tara Groceries`), center nav, and performance title.
- **Test 2**: Renders all 5 KPI tiles (Gross Revenue, Channel Split, AOV, Avg SLA, PIN Verification Rate).
- **Test 3**: Renders hourly velocity chart, fulfillment funnel stages, top-selling SKUs, and settlement matrix.
- **Test 4**: Allows date range toggling (Today, Yesterday, Last 7 Days, This Month) and triggers export/print actions.

---

## 5. Execution Steps

1. Create `apps/web/src/routes/merchant/MerchantAnalyticsPage.tsx`.
2. Register `/merchant/analytics` in `apps/web/src/App.tsx`.
3. Create `apps/web/src/routes/merchant/MerchantAnalyticsPage.test.tsx`.
4. Run vitest for `MerchantAnalyticsPage`.
5. Run full typecheck, lint, and test suite.
6. Run live Playwright verification on desktop (1280x800) and mobile (390x844).
7. Sync documentation and commit.
