# CapExIQ — "Midnight Vault" Design System

Adapted from the Slash style reference. Single source of truth: `src/app/globals.css` (tokens) and `tailwind.config.ts` (class surface).

---

## 1. Two registers

The Slash reference is a marketing-site system: 160px section gaps, 88px display serif, cards separated by whitespace alone. Applied literally to a 30-route financial application it would destroy information density. The system is therefore split:

| Register | Applied to | Section rhythm | Display type | Motion |
|---|---|---|---|---|
| `.register-editorial` | `/`, `/presentation` | 64–160px | Playfair 40–88px | framer-motion choreography |
| `.register-app` | all data routes (set on `<main>`) | 24–48px | Playfair 24–32px | CSS reveal + count-up |

Never mix. A dashboard that adopts editorial spacing stops being a dashboard.

---

## 2. Typography — serif/sans collision

**Ivy Presto is not used.** It is a commercial IvyType licence and cannot be redistributed. `Playfair Display` is the substitute named in the reference; both are high-contrast didones, so the brand signature survives.

| Family | Variable | Role |
|---|---|---|
| Playfair Display | `--font-display` | Headings ≥ 24px, large numerals, `h1`–`h3` |
| Inter | `--font-sans` | Body, nav, buttons, labels, all UI text |
| JetBrains Mono | `--font-mono` | Metrics, captions, timestamps, tabular data |

**Hard rule:** serif never renders below 24px. `h4`–`h6` are forced to Inter by `globals.css`; small uppercase section labels carry an explicit `font-sans`.

Weights loaded: Playfair 400/500/600, Inter 300–700. `font-extrabold` / `font-black` are not available and have been removed — they were being synthesised by the browser.

---

## 3. Colour

Copper (`#cc9166` dark / `#965c28` light) is the **only** brand accent. The gilded gradient is reserved exclusively for data visualisation.

### Why semantic colours survived

The reference forbids green/blue/chromatic accents. That rule governs *branding*, not *data encoding*. NPV sign, decision status and risk severity are colour-coded across ~30 routes; flattening them to monochrome would be a comprehension and accessibility regression. Semantic colours are retained but desaturated toward the copper/sage/rust family so they read as ledger annotation rather than competing accents.

Colour is never the sole signal — every status pairs with an icon and a text label (WCAG 1.4.1).

### Contrast — both themes clear WCAG AA

| Pair | Dark | Light |
|---|---|---|
| Body text on card | 16.00:1 | 18.02:1 |
| Muted text on card | 6.78:1 | 5.51:1 |
| Copper accent on card | 7.62:1 | 5.40:1 |
| Success / Warning / Destructive on card | 8.13 / 9.28 / 6.93 | 4.87 / 5.48 / 6.14 |
| Chart axis labels | 4.80:1 | 5.51:1 |

Light-mode copper is deliberately darker than the reference hue: `#cc9166` scores only 3.6:1 on a parchment canvas and fails AA.

---

## 4. Shape and elevation

- **Radius:** exactly three values — `rounded-card` (10px), `rounded-pill` (9999px), `rounded-nav` (2px). All other radii were normalised away.
- **Elevation:** no drop shadows anywhere. Depth comes from surface colour steps (`--surface` → `--surface-elevated`) plus 1px hairline borders, per the reference. A single ambient copper bloom on `body::before` replaces lighting in dark mode.
- **Surfaces:** Void `#08080a` → Card `#040406` → Panel `#121317` → Floating `#1c1d22`.

---

## 5. Component layer — `src/components/ui/`

| File | Exports |
|---|---|
| `primitives.tsx` | `Card`, `SectionHeading`, `PageHeader`, `Stat`, `StatCard`, `Badge`, `PillGroup`, `LedgerTable`, `GildedRule`, `Eyebrow`, `cn` |
| `motion.tsx` | `Reveal`, `Stagger`, `CountUp`, `usePrefersReducedMotion` |
| `charts.tsx` | `ChartCard`, `ChartGradients`, `LedgerTooltip`, `Sparkline`, `axisProps`, `gridProps`, `tooltipProps`, `legendProps` |
| `AutoReveal.tsx` | Blanket scroll-entrance for routes not hand-converted |

CSS utility classes in `globals.css`: `.glass-panel` (sets border + radius — do not re-declare them), `.panel-gilded`, `.ledger-table`, `.btn-primary`, `.btn-ghost`, `.pill`, `.input-pill`, `.icon-well`, `.gilded-text`, `.gilded-rule`, `.link-rule`, `.eyebrow`, `.numeral`.

---

## 6. Motion

CSS baseline everywhere; framer-motion only on the two editorial routes.

- Entrance: `Reveal` uses one shared `IntersectionObserver`; grids stagger at 55–60ms.
- Numerals: `CountUp` tweens with ease-out cubic. First paint counts from zero; later changes tween from the previous value so scenario switches read as transitions rather than resets.
- Charts: Recharts mount animation plus an animated SVG gilded gradient stroke.
- Tables: row cascade at 28ms, disabled above 40 rows.

**`prefers-reduced-motion` is a hard off switch** — no observers are created, no element is ever hidden, and all durations collapse to 0.001ms.

---

## 7. Button hierarchy

The header previously carried eight colour-filled CTAs side by side. With everything emphasised, nothing was. Current hierarchy:

1. **One** `.btn-primary` (white fill) per viewport — currently "Present".
2. `.btn-ghost` for secondary actions.
3. `.pill` for filters, toggles, and the Modules / Context overflow menus.
4. `Badge` for read-only status — never interactive.

---

## 8. Print

`@media print` forces a light ledger regardless of active theme: white canvas, black text, hairline borders, chrome hidden, reveal animations neutralised. Board PDFs and `/printable-report` stay legible on paper.

---

## 9. Known constraints

- `next/font/google` fetches at build time. A build machine without access to `fonts.googleapis.com` will fail. Self-host the three families if your CI is air-gapped.
- `next@14.2.24` is flagged by npm as having a security vulnerability; upgrading is a separate task from this redesign.
