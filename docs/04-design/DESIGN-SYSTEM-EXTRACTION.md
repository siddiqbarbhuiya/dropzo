# Dropzo Design System & UI Token Extraction

**Status: Approved Specification.**  
**Document Reference:** `docs/04-design/DESIGN-SYSTEM-EXTRACTION.md`  
**Source Origin:** Google Stitch MCP Project `3837531702173487386`  
**Design Theme:** `Dropzo Quick Commerce` (Material 3 Adaptive + Custom Quick Commerce Tokens)

> **Audit correction (2026-11-11, BC-011 Stage 1):** Tokens, colors and typography below are
> unchanged (approved visual direction, not re-litigated). Note only: this document's mention of
> "DigiLocker/FSSAI" is a description of what the _Stitch visual design_ depicts, not a claim that
> DigiLocker or FSSAI/FoSCoS verification is implemented in the backend — it is not (see
> `UI-SCREEN-COVERAGE.md`'s corrected Backend API Status rows). Do not build those integrations
> without confirmed scope.

---

## 1. Brand Identity & Visual Language

Dropzo's visual identity balances high-velocity instant delivery aesthetics with regional warmth and trust for local grocery shopping in Badarpur, Assam.

- **Primary Visual Accent**: Vibrant Quick-Commerce Coral (`#FF5733`), evoking speed, energy, and instant freshness.
- **Secondary Visual Accent**: Farm Fresh Forest Green (`#006E2D` / `#16A34A`), signifying organic quality, local agriculture, and successful fulfillment states.
- **Tertiary Visual Accent**: Logistics Deep Blue (`#006398`), used for administrative badges, delivery partner badges, and digital document verification (DigiLocker/FSSAI).
- **Typography**: **Plus Jakarta Sans** across all headline, body, and label hierarchies, delivering geometric clarity and excellent legibility on mobile screens.
- **Corner Geometry**: Soft modern squircles with `16px` (`ROUND_EIGHT`) on cards and containers, transitioning to full pill geometry (`9999px`) on buttons, stepper controls, and status chips.

---

## 2. Design Tokens

### 2.1 Color Tokens

```json
{
    "colors": {
        "brand": {
            "coral": "#FF5733",
            "coral-dark": "#E04826",
            "coral-light": "#FFECE8",
            "rust": "#B72301",
            "forest": "#006E2D",
            "forest-light": "#DCFCE7",
            "deep-blue": "#006398",
            "sky-blue": "#3298DC"
        },
        "surface": {
            "base": "#FBF8FF",
            "dim": "#DAD9E3",
            "bright": "#FBF8FF",
            "container-lowest": "#FFFFFF",
            "container-low": "#F4F2FD",
            "container": "#EEEDF7",
            "container-high": "#E8E7F1",
            "container-highest": "#E3E1EC"
        },
        "text": {
            "primary": "#1A1B22",
            "secondary": "#5B403A",
            "muted": "#71717A",
            "inverse": "#F1EFFA",
            "on-primary": "#FFFFFF",
            "on-secondary": "#FFFFFF"
        },
        "border": {
            "outline": "#8F7069",
            "outline-variant": "#E4BEB6",
            "subtle": "#F1F5F9",
            "divider": "#E4E4E7"
        },
        "feedback": {
            "error": "#BA1A1A",
            "error-container": "#FFDAD6",
            "error-text": "#93000A",
            "success": "#006E2D",
            "success-container": "#7CF994",
            "warning": "#D97706",
            "warning-container": "#FEF3C7"
        }
    }
}
```

### 2.2 Typography Scale

| Token Name    | Font Family       | Size                 | Weight          | Line Height         | Letter Spacing | Primary Usage                               |
| ------------- | ----------------- | -------------------- | --------------- | ------------------- | -------------- | ------------------------------------------- |
| `headline-xl` | Plus Jakarta Sans | `32px` (`2rem`)      | 800 (Bold)      | `40px` (`2.5rem`)   | `-0.02em`      | Major screen titles, hero headers           |
| `headline-lg` | Plus Jakarta Sans | `24px` (`1.5rem`)    | 700 (Bold)      | `32px` (`2rem`)     | `-0.015em`     | Store names, modal headers                  |
| `headline-md` | Plus Jakarta Sans | `20px` (`1.25rem`)   | 700 (Bold)      | `28px` (`1.75rem`)  | `-0.01em`      | Section headers, product category titles    |
| `headline-sm` | Plus Jakarta Sans | `18px` (`1.125rem`)  | 600 (Semi-bold) | `24px` (`1.5rem`)   | Normal         | Card titles, order numbers                  |
| `body-lg`     | Plus Jakarta Sans | `16px` (`1rem`)      | 500 (Medium)    | `24px` (`1.5rem`)   | Normal         | Primary paragraph text, input values        |
| `body-md`     | Plus Jakarta Sans | `14px` (`0.875rem`)  | 400 (Regular)   | `20px` (`1.25rem`)  | Normal         | Secondary descriptions, item quantities     |
| `body-sm`     | Plus Jakarta Sans | `12px` (`0.75rem`)   | 400 (Regular)   | `18px` (`1.125rem`) | Normal         | Metadata, disclaimer notes, helper text     |
| `label-lg`    | Plus Jakarta Sans | `14px` (`0.875rem`)  | 600 (Semi-bold) | `20px` (`1.25rem`)  | `0.01em`       | Button text, interactive tab items          |
| `label-md`    | Plus Jakarta Sans | `12px` (`0.75rem`)   | 600 (Semi-bold) | `16px` (`1rem`)     | Normal         | Tag chips, badge text, table column headers |
| `label-sm`    | Plus Jakarta Sans | `11px` (`0.6875rem`) | 700 (Bold)      | `14px` (`0.875rem`) | `0.02em`       | Micro badges, stock alerts, discount tags   |

### 2.3 Radii & Elevation (Geometry)

```css
/* Border Radii */
--radius-sm: 0.25rem; /* 4px - Micro chips, tag indicators */
--radius-md: 0.5rem; /* 8px - Form elements, sub-cards */
--radius-lg: 0.75rem; /* 12px - Input fields */
--radius-xl: 1rem; /* 16px - Standard product cards, modals */
--radius-2xl: 1.5rem; /* 24px - Container banners, hero containers */
--radius-full: 9999px; /* Pill shape - Action buttons, steppers, toggles */

/* Elevation & Shadows */
--shadow-card: 0 2px 8px -2px rgba(26, 27, 34, 0.05);
--shadow-card-hover: 0 8px 16px -4px rgba(26, 27, 34, 0.08);
--shadow-modal: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
--shadow-cta-glow: 0 8px 16px -4px rgba(255, 87, 51, 0.35);
```

### 2.4 Spacing & Grid System

- **Base Unit**: `4px`
- **Layout Margins**:
    - Mobile (`< 768px`): `16px` (`1rem`) screen gutter
    - Desktop (`≥ 768px`): `24px` (`1.5rem`) page margin, max container width `1280px`
- **Spacing Scale**:
    - `space-xs`: `4px` (`0.25rem`)
    - `space-sm`: `8px` (`0.5rem`)
    - `space-md`: `12px` (`0.75rem`)
    - `space-lg`: `16px` (`1rem`)
    - `space-xl`: `24px` (`1.5rem`)
    - `space-2xl`: `32px` (`2rem`)

---

## 3. Core Component Anatomies

### 3.1 Primary Action Button (Pill CTA)

- **Background**: `#FF5733` (Coral)
- **Hover / Active**: `#E04826`
- **Text**: `#FFFFFF`, `14px` / `16px`, Plus Jakarta Sans 700 Bold
- **Border Radius**: `9999px` (Pill)
- **Padding**: `12px 24px`
- **Box Shadow**: `0 8px 16px -4px rgba(255, 87, 51, 0.35)`

### 3.2 Product Quantity Stepper Pill

- **Inactive State**:
    - Border: `1.5px solid #FF5733`
    - Background: `#FFFFFF`
    - Text & Icon: `#FF5733`, "ADD +"
    - Height: `32px`, Radius: `9999px`
- **Active State**:
    - Background: `#FF5733`
    - Text & Icons: `#FFFFFF`, `−` `[Quantity]` `+`
    - Height: `32px`, Radius: `9999px`

### 3.3 Fulfillment Segmented Switcher

- **Placement**: Top header of customer screens (Home, Store Catalogue, Checkout)
- **Segments**: `Express Delivery (30-45 min)` vs. `Store Pickup (Ready in 20 min • Free)`
- **Container**: Pill background `#EEEDF7`, `4px` inset padding
- **Active Item**: `#FFFFFF` card with soft shadow, active green text `#006E2D` for Pickup or coral `#FF5733` for Delivery

### 3.4 Pickup PIN Card

> **Correction (2026-11-11, BC-011 continuation):** The Stitch screen's own visual mockup shows
> four digit boxes, but the real backend (`VerifyPickupCodeDto`, `pickup-verification.service.ts`'s
> `CODE_LENGTH = 6`) generates and validates a **6-digit** code, not 4 — and so does the
> delivery-verification code (`delivery-verification.service.ts`, same `CODE_LENGTH = 6`). Both
> codes use the identical 6-digit mechanism; there is no 4-digit code anywhere in this system. The
> digit-box anatomy below is still correct and reusable — render **six** boxes, not four. The
> implemented `PickupPinCard` component (`apps/web/src/components/domain/PickupPinCard.tsx`)
> already renders however many digits the real code string contains, so it was not affected by this
> naming error — only this document's and some other docs' prose description of it was.

- **Background**: Inset `#F4F2FD` container surrounded by `#E3E1EC` border
- **PIN Display**: Six individual rounded square digit boxes (`48px × 56px`), centered bold digits `32px` with letter spacing `0.3em`
- **Security Helper**: "Share this 6-digit code at the store counter upon arrival to collect your order."

### 3.5 POS Terminal Audio & Alert Bar

- **Merchant Terminal Header**: Dark surface `#1A1B22` with bright neon status badges
- **Loud Alert Switch**: Green active state (`LOUD ALERT ON`) with speaker animation icon
- **Incoming Order Notification**: High-contrast flashing banner with sound trigger and prominent 1-click Accept / Reject controls

---

## 4. TypeScript Theme Interface for `apps/web`

```typescript
export interface DropzoTheme {
    colors: {
        primary: string;
        primaryDark: string;
        primaryLight: string;
        secondary: string;
        secondaryLight: string;
        tertiary: string;
        background: string;
        surface: string;
        surfaceContainerLowest: string;
        surfaceContainerLow: string;
        surfaceContainer: string;
        surfaceContainerHigh: string;
        textPrimary: string;
        textSecondary: string;
        textMuted: string;
        border: string;
        divider: string;
        error: string;
        errorContainer: string;
        success: string;
        successContainer: string;
    };
    typography: {
        fontFamily: string;
        headlineXl: string;
        headlineLg: string;
        headlineMd: string;
        headlineSm: string;
        bodyLg: string;
        bodyMd: string;
        bodySm: string;
        labelLg: string;
        labelMd: string;
        labelSm: string;
    };
    radii: {
        sm: string;
        md: string;
        lg: string;
        xl: string;
        full: string;
    };
    shadows: {
        card: string;
        cardHover: string;
        ctaGlow: string;
        modal: string;
    };
}
```
