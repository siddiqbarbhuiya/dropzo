---
name: dropzo-stitch-to-react
description: Translate Google Stitch UI screen designs into React components with strict 1:1 visual fidelity, fetching live screen HTML and screenshots via Stitch MCP for both mobile and desktop views, and preventing unauthorized UI deletion or layout distortion.
when_to_use: "implement stitch screen", "build UI from stitch", "match stitch design", "fetch stitch screen", creating or modifying pages in apps/web
---

# Dropzo: Stitch-to-React 1:1 UI Translation

## Purpose

Enforce strict 1:1 visual fidelity when implementing or updating Dropzo React pages (`apps/web`) from approved Google Stitch designs (`projects/3837531702173487386`). This skill prevents AI assistants from hallucinating layouts, simplifying rich dashboards into generic form cards, or deleting UI sections simply because backend database fields do not yet exist.

It also instructs assistants to connect to the **Google Stitch MCP server** at runtime to fetch the **latest, live HTML exports and screenshots for both Mobile and Desktop views**, ensuring any recent design changes made by UI designers or product owners in Stitch are immediately captured.

See [`docs/04-design/STITCH-DESIGN-AUDIT.md`](../../../docs/04-design/STITCH-DESIGN-AUDIT.md), [`docs/04-design/UI-SCREEN-COVERAGE.md`](../../../docs/04-design/UI-SCREEN-COVERAGE.md), and [`docs/04-design/DESIGN-SYSTEM-EXTRACTION.md`](../../../docs/04-design/DESIGN-SYSTEM-EXTRACTION.md).

## When to use this skill

- Whenever creating, styling, or refactoring any page, route, or domain component in `apps/web`.
- Whenever given a Stitch Screen ID or prompt to implement a page from Stitch.
- Whenever you need to fetch the latest screen designs or verify changes made in Stitch.
- During UI code reviews to verify whether a page matches its Stitch design across both mobile and desktop viewports.

## When NOT to use this skill

- For pure backend NestJS development (`apps/api`) with no frontend touchpoints.
- For shared utility packages (`packages/shared-types`, `packages/validation`) that contain no UI.

## Golden Rules of Stitch Fidelity

1. **Always Fetch the Latest Stitch Artifacts via Stitch MCP (Mobile & Desktop)**:
    - **Do not rely solely on stale local files**: Designers and backend teams may update layouts, copy, or states in Stitch (`projects/3837531702173487386`) at any time.
    - **Fetch live on-demand**: Whenever working on a screen or if designs might have changed, use the Stitch MCP tools (or `node scripts/stitch.mjs`) to fetch the newest HTML and high-resolution screenshot image.
    - **Both Mobile & Desktop Viewports Required**:
        - Every customer, merchant, delivery, and admin flow has distinct or adaptive layouts for Mobile (`375×812`) and Desktop (`1280×800` / `1440×900`).
        - Always inspect **both** viewports before coding:
            - **Desktop**: Dense KPI ribbons, POS counters, wide tables, split-canvas brand panels, side navigation.
            - **Mobile**: Sticky bottom action sheets, drawer navigation, touch-friendly keypads, compact status chips.
        - Combine both viewports into a single responsive React component using media queries (`@media (min-width: 768px)` or `1024px`).
    - **Stitch MCP Commands & Tools**:
        - MCP tool `stitch.get_screen`: fetch screen metadata and download URLs for `<screenId>`.
        - MCP tool `stitch.download_file`: retrieve the raw HTML or PNG image.
        - MCP tool `stitch.list_screens`: list all screens in `projects/3837531702173487386`.
        - Repository CLI helpers:
            ```bash
            node scripts/stitch.mjs get-screen <screenId>
            node scripts/stitch.mjs download-html <screenId> audit/stitch-audit/html/<screenId>.html
            node scripts/stitch.mjs download-image <screenId> audit/stitch-audit/screenshots/<screenId>.png
            ```
        - Cache the fresh downloads into `audit/stitch-audit/html/` and `audit/stitch-audit/screenshots/`.

2. **Never delete visual sections because backend fields are missing**:
    - Stitch designs contain complete operational UI screens (e.g., POS top bars, KPI metric cards, loud audio alert toggles, regular shopper badges).
    - If a backend endpoint or database column does not yet exist for a visual element, **retain the visual element 100% in the React JSX** using static default props or disabled interactive state.
    - Mark the element with a clear comment: `// TODO: wire to API once backend endpoint is ready`.
    - **Never reduce a rich dashboard to a sparse form card.**

3. **Single Source of Truth: Inspect the Actual Stitch HTML & Screenshot**:
    - Before writing code, inspect the exact exported HTML: `audit/stitch-audit/html/<screenId>.html`.
    - Inspect the visual screenshot: `audit/stitch-audit/screenshots/<screenId>.png`.
    - Replicate the exact DOM hierarchy, grid columns, section grouping, and typography weights.

4. **Use Approved Dropzo Theme Tokens**:
    - Use tokens from `apps/web/src/theme/` (Plus Jakarta Sans, Coral `#FF5733`, Forest `#006E2D`, Surface `#FBF8FF`).
    - Match exact corner radii (pills `9999px` for buttons/steppers, `16px` for cards, `12px` for inputs).

## Workflow

1. **Identify the Screen Pair**:
   Find the matching Mobile and Desktop screen IDs in [`docs/04-design/UI-SCREEN-COVERAGE.md`](../../../docs/04-design/UI-SCREEN-COVERAGE.md).
2. **Fetch Latest Artifacts via Stitch MCP**:
   Use Stitch MCP or `node scripts/stitch.mjs` to fetch the newest HTML and screenshots for both viewports, saving them into `audit/stitch-audit/`.
3. **Inspect the Dual-Viewport Hierarchy**:
   Read the fresh HTML and inspect the screenshots to extract DOM structure, responsive layout changes, classes, and typography tokens.
4. **Map Real APIs to Dynamic Props**:
   Wire all active backend endpoints via `@dropzo/api-client` (e.g. order details, pickup verification, inventory mutations).
5. **Preserve Static / Unwired UI**:
   Render the full chrome, stats, alert bars, and sidebars present in the Stitch template with static defaults.
6. **Verify Across Viewports**:
   Compare the rendered DOM against both Mobile and Desktop Stitch screenshots. Ensure no visual sections are missing.

## What this skill does not guarantee

This skill ensures visual and structural fidelity to the approved Stitch design; it does not substitute for writing unit tests or running typecheck and lint verification.
