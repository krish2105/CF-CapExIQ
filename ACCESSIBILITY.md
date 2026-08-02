# CapExIQ — Accessibility Statement

This is an honest statement of what has and has not been implemented. It is **not** a certification of
WCAG 2.2 AA conformance. No formal audit — automated or manual, with or without assistive technology —
has been carried out against this application.

## What Is Implemented

1. **Semantic document structure.** `<html lang="en">` is set. The layout uses `<header>`, `<nav>` and
   `<main>` landmarks (`src/app/layout.tsx`, `src/components/layout/Header.tsx`,
   `src/components/layout/Sidebar.tsx`), and every page route begins with a single `<h1>`.

2. **Colour independence.** Financial status is never conveyed by colour alone. Decision states carry
   explicit text labels (`Approve`, `Reject`), risk alerts carry a written severity
   (`Critical` / `High` / `Medium` / `Low`), and KPI cards state the value in text next to the badge.
   This is the strongest accessibility property of the application.

3. **Contrast-oriented token design.** The design system pins high-contrast foreground/background
   pairs in both themes (`#0f172a` on `#f8fafc` light, `#f8fafc` on `#090d16` dark) rather than
   relying on translucent overlays for body text. See `FRONTEND_DESIGN_SYSTEM.md`.

4. **Keyboard operation of core navigation.** All navigation and controls are native `<button>`,
   `<a>`, `<input>` and `<select>` elements, so `Tab`, `Shift+Tab`, `Enter` and `Space` work as
   expected. `Cmd/Ctrl + K` opens the command palette; `Escape` closes it; the search field receives
   focus automatically on open.

5. **A theme control that is labelled.** The theme toggle carries
   `aria-label="Select color theme"`, which is also what the E2E suite selects on.

## Known Gaps

These are real and currently unaddressed. Do not describe them as met.

| Gap | Detail |
| :--- | :--- |
| **No ARIA modal semantics or focus trap** | The command palette (`src/components/navigation/CommandPalette.tsx`) and the formula inspector render as plain overlay `<div>`s. Neither sets `role="dialog"`, `aria-modal="true"` or an accessible name, and neither traps focus or restores focus to the trigger on close. A screen-reader or keyboard user can tab out of the open overlay into the page behind it. Earlier versions of this document claimed "ARIA modal dialog trapping"; **it is not implemented**. |
| **Sparse `aria-label` coverage** | There are exactly three `aria-label` attributes in the entire source tree. Other icon-only controls — the command-palette close button, chart and panel controls — have no accessible name. |
| **Charts are not accessible** | Recharts output is rendered SVG with no text alternative, no `role="img"`, no summary and no accessible data table equivalent. A screen-reader user cannot obtain the cash-flow, scenario, tornado, heatmap or Monte Carlo data. The underlying figures are available as text on `/financial-model` and via the CSV export, which is a partial mitigation, not an equivalent. |
| **No skip link** | There is no "skip to main content" link, so keyboard users traverse the full sidebar on every page. |
| **Contrast not formally verified** | The token pairs were chosen for high contrast but no automated contrast audit has been run across all states — in particular muted text, placeholder text, disabled controls and the chart palettes. |
| **No reduced-motion support** | Nothing in the codebase honours `prefers-reduced-motion`; the palette and panel enter/exit animations always play. |
| **No assistive-technology testing** | The application has not been tested with a screen reader, and there is no automated accessibility check (axe, Lighthouse or equivalent) in CI. |

## Priority Remediation

If accessibility work is picked up, in order of impact:

1. Give the command palette and formula inspector `role="dialog"`, `aria-modal="true"`, an accessible
   name, a focus trap and focus restoration.
2. Add accessible names to icon-only buttons.
3. Provide a text or table alternative for each chart.
4. Add a skip link and honour `prefers-reduced-motion`.
5. Add an automated accessibility check to CI, then run a manual screen-reader pass.
