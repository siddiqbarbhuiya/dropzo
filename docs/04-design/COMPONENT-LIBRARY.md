# Dropzo Component Library

**Status: Implemented** (BC-011 Stage 2–3).
**Location in code:** `apps/web/src/theme/`, `apps/web/src/components/ui/`,
`apps/web/src/components/domain/`.
**Related documents:** [`DESIGN-SYSTEM-EXTRACTION.md`](./DESIGN-SYSTEM-EXTRACTION.md),
[`UI-SCREEN-COVERAGE.md`](./UI-SCREEN-COVERAGE.md).

## 1. Theme

`apps/web/src/theme/theme.ts` exports `DropzoTheme` (the typed theme interface) and `dropzoTheme`
(the one approved instance — colors, typography scale, spacing, radii, shadows, breakpoints,
z-index). `typeScale(token)` renders a token into a CSS block for use inside a styled-components
template literal. `media.ts` exports mobile-first breakpoint helpers (`media.tablet`,
`media.desktop`, `media.wide`). `GlobalStyles.ts` is a `createGlobalStyle` sheet that loads Plus
Jakarta Sans, applies resets, and defines the `:focus-visible` keyboard-only focus ring. `styled.d.ts`
extends styled-components' `DefaultTheme` so every styled component gets typed `theme` access
without casting. All of this is wired once, in `main.tsx`, via `<ThemeProvider theme={dropzoTheme}>`
wrapping `<GlobalStyles />` and the app.

Any component or test that renders a styled-components tree needs a `ThemeProvider` ancestor — for
tests, use `withTheme(ui)` from `apps/web/src/test/renderWithProviders.tsx`.

## 2. UI primitives (`components/ui/`)

Generic, presentation-only building blocks with no business meaning. Each is its own file; import
from the barrel `components/ui/index.ts`.

| Component           | Notes                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `Button`              | Variants `primary` / `secondary` / `danger` / `ghost`; sizes `sm` / `md`; `$fullWidth`.   |
| `IconButton`          | Square pill tap target for a single icon, with an `$active` state.                       |
| `Input`               | Labelled text input with optional helper/error text.                                      |
| `OTPInput`            | N-digit code entry with auto-advance, backspace-back, and paste-splitting.               |
| `Select`              | Labelled native `<select>`.                                                                |
| `Checkbox`            | Labelled checkbox using theme-accent color.                                               |
| `Switch`              | Binary toggle (e.g. merchant terminal's loud-alert switch).                               |
| `Badge`               | Tonal pill (`neutral`/`success`/`warning`/`error`/`info`/`brand`).                        |
| `Card`                | Base surface container; `$padded`, `$hoverable`.                                          |
| `Modal`               | Centered dialog; closes on Escape or overlay click.                                       |
| `Toast`               | Inline tonal alert banner (`success`/`error`/`warning`/`info`).                           |
| `Skeleton`            | Pulsing placeholder block for loading content.                                            |
| `EmptyState`          | "Nothing here yet" panel (built on the internal `StatusPanel`).                           |
| `ErrorState`          | Failure panel with an optional retry action (built on `StatusPanel`).                     |
| `LoadingState`        | Centered spinner.                                                                          |
| `QuantityStepper`     | Toggles between an "ADD +" pill and a −/count/+ stepper.                                  |
| `SegmentedControl`    | Generic 2+-option pill switcher (typed by a string union).                                 |
| `PageHeader`          | Standard screen title row, with optional back arrow and trailing action.                  |
| `ResponsiveContainer` | Page-width wrapper: mobile gutter, desktop margin, 1280px max width.                       |

`StatusPanel` is an internal layout shared by `EmptyState`/`ErrorState`/`LoadingState` — it is not
exported from the barrel and should not be used directly by screens.

## 3. Domain components (`components/domain/`)

Typed, presentation-only components that encode one specific Dropzo concept by composing the `ui/`
primitives. None of them fetch data or hold mock business data — screens pass in real values.

| Component                | Composes                         | Notes                                                                 |
| ------------------------- | --------------------------------- | ---------------------------------------------------------------------- |
| `StoreCard`                | `Card`, `Badge`                    | Customer home/discovery store tile.                                    |
| `ProductCard`              | `Card`, `ProductQuantityControl`   | Catalogue product tile.                                                 |
| `ProductQuantityControl`   | `QuantityStepper`                  | Binds a stepper to a product's stock ceiling.                          |
| `OrderStatusStepper`       | —                                   | Horizontal lifecycle progress; terminal failures render as a banner.   |
| `FulfillmentSelector`      | `SegmentedControl`                 | "Express Delivery" vs "Store Pickup".                                  |
| `PickupPinCard`            | —                                   | The 4-digit pickup/delivery handover code card.                        |

`StoreCard`, `ProductCard` and `FulfillmentSelector` are not yet wired into a route: there is no
public store/product-listing backend endpoint today (see `UI-SCREEN-COVERAGE.md`'s "Dropzo
Marketplace Home" and "Store Catalogue" rows), so they exist as library components ready for the
customer catalogue screens once that endpoint exists — not bound to any mock data.

## 4. Migrated screens (BC-011 Stage 4)

`AppShell.tsx`, `LoginPage.tsx`, `CustomerOrdersPage.tsx`, `CustomerOrderDetailPage.tsx`,
`routes/components/FormPrimitives.tsx` and `routes/components/OrderStatusBadge.tsx`. The last two
now delegate to the themed `Button`/`Badge` rather than duplicating styles, so every other screen
that imports them (merchant, admin, delivery-partner pages) already picks up the new button and
badge look without a full rewrite. Full screen-by-screen migration (merchant POS terminal, admin
queues, delivery partner inbox) is tracked as follow-up work — see `UI-SCREEN-COVERAGE.md`.

## 5. Conventions

- Boolean/variant styled-components props are prefixed `$` (transient props — never forwarded to
  the DOM), per styled-components v6 convention.
- Use `typeScale(theme.typography.<token>)` instead of hardcoding `font-size`/`font-weight`.
- Use `theme.spacing.*` / `theme.radii.*` / `theme.colors.*` instead of hardcoded values anywhere
  under `apps/web/src`.
- A component with more than one "look" (variant) is parameterized, not duplicated as a new
  component.
