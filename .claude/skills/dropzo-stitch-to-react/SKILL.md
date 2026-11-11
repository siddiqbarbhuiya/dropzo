---
name: dropzo-stitch-to-react
description: Translate Google Stitch UI screen designs into React components with strict 1:1 visual fidelity, preventing layout destruction, unauthorized redesigns, or stripping of UI elements due to missing backend APIs.
when_to_use: "implement stitch screen", "build UI from stitch", "match stitch design", creating or modifying pages in apps/web
---

# Dropzo: Stitch-to-React 1:1 UI Translation

## Purpose

Enforce strict 1:1 visual fidelity when implementing or updating Dropzo React pages (`apps/web`) from approved Google Stitch designs (`projects/3837531702173487386`). This skill prevents AI assistants from hallucinating layouts, simplifying rich dashboards into generic form cards, or deleting UI sections simply because backend database fields do not yet exist.

See [`docs/04-design/STITCH-DESIGN-AUDIT.md`](../../../docs/04-design/STITCH-DESIGN-AUDIT.md), [`docs/04-design/UI-SCREEN-COVERAGE.md`](../../../docs/04-design/UI-SCREEN-COVERAGE.md), and [`docs/04-design/DESIGN-SYSTEM-EXTRACTION.md`](../../../docs/04-design/DESIGN-SYSTEM-EXTRACTION.md).

## When to use this skill

- Whenever creating, styling, or refactoring any page, route, or domain component in `apps/web`.
- Whenever given a Stitch Screen ID or prompt to implement a page from Stitch.
- During UI code reviews to verify whether a page matches its Stitch design.

## When NOT to use this skill

- For pure backend NestJS development (`apps/api`) with no frontend touchpoints.
- For shared utility packages (`packages/shared-types`, `packages/validation`) that contain no UI.

## Golden Rules of Stitch Fidelity

1. **Never delete visual sections because backend fields are missing**:
    - Stitch designs contain complete operational UI screens (e.g., POS top bars, KPI metric cards, loud audio alert toggles, regular shopper badges).
    - If a backend endpoint or database column does not yet exist for a visual element, **retain the visual element 100% in the React JSX** using static default props or disabled interactive state.
    - Mark the element with a clear comment: `// TODO: wire to API once backend endpoint is ready`.
    - **Never reduce a rich dashboard to a sparse form card.**

2. **Single Source of Truth: Inspect the actual Stitch HTML & Screenshot**:
    - Before writing any code, locate the screen in `audit/stitch-audit/screens-inventory.json`.
    - Inspect the exact exported HTML: `audit/stitch-audit/html/<screenId>.html`.
    - Inspect the visual screenshot: `audit/stitch-audit/screenshots/<screenId>.png`.
    - Replicate the exact DOM hierarchy, grid columns, section grouping, and typography weights.

3. **Use Approved Dropzo Theme Tokens**:
    - Use tokens from `apps/web/src/theme/` (Plus Jakarta Sans, Coral `#FF5733`, Forest `#006E2D`, Surface `#FBF8FF`).
    - Match exact corner radii (pills `9999px` for buttons/steppers, `16px` for cards, `12px` for inputs).

## Workflow

1. **Identify the Screen**:
   Find the matching Mobile and Desktop screen IDs in `docs/04-design/UI-SCREEN-COVERAGE.md`.
2. **Inspect Stitch Artifacts**:
   Read `audit/stitch-audit/html/<screenId>.html` to extract the full DOM structure and classes.
3. **Map Real APIs to Dynamic Props**:
   Wire all active backend endpoints via `@dropzo/api-client` (e.g. order details, pickup verification, inventory mutations).
4. **Preserve Static/Unwired UI**:
   Render the full chrome, stats, alert bars, and sidebars present in the Stitch template.
5. **Verify**:
   Compare the rendered DOM against `audit/stitch-audit/screenshots/<screenId>.png`. Ensure no visual sections are missing.

## What this skill does not guarantee

This skill ensures visual and structural fidelity to the approved Stitch design; it does not substitute for writing unit tests or running typecheck and lint verification.
