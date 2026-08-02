# CapExIQ — Frontend Design System & UI Architecture

## 1. Executive Visual Standards
CapExIQ uses a single unified design system built on CSS variables in [`src/app/globals.css`](src/app/globals.css).

## 2. Semantic Token Registry

Values below are read from `src/app/globals.css` (`:root` for light, `.dark` for dark).

| Token | Light | Dark | Purpose |
| :--- | :--- | :--- | :--- |
| `--background` | `#f8fafc` | `#090d16` | Base canvas |
| `--foreground` | `#0f172a` | `#f8fafc` | High-contrast body text |
| `--card` | `#ffffff` | `#0f172a` | Surface card background |
| `--card-foreground` | `#0f172a` | `#f8fafc` | Card text |
| `--border` | `#cbd5e1` | `#1e293b` | Structural outline |
| `--muted` | `#f1f5f9` | `#151e2e` | Subtle panel fill |
| `--muted-foreground` | — | `#94a3b8` | Secondary text |
| `--primary` | `#0284c7` | `#06b6d4` | Corporate blue / cyan accent |
| `--success` | `#059669` | `#10b981` | Positive financial indicator |
| `--warning` | `#d97706` | `#f59e0b` | Caution / covenant threshold |
| `--destructive` | `#e11d48` | `#f43f5e` | Negative / value-destroying indicator |

Additional tokens defined in the same file cover surfaces (`--surface`, `--surface-elevated`),
popovers, form inputs (`--input`, `--ring`), interactive states (`--disabled`, `--selected`), the
`--info` status colour, and the chart palette (`--chart-1` onwards plus chart tooltip tokens).

## 3. Financial Status Code Treatment
- **Positive NPV / Return**: Green badge with explicit text label (e.g. `+AED 12.08M`).
- **Warning / Covenant Threshold**: Amber badge with explicit text label (e.g. `DSCR < 1.25x`).
- **Negative NPV / Value Loss**: Red badge with explicit text label (e.g. `-AED 4.94M`).
- **Neutral / Baseline**: Slate / Blue-Grey treatment.

## 4. Theme System & Light Mode Guidelines
- **Hydration Safety**: Powered by `next-themes` ThemeProvider and `ThemeToggle` dropdown.
- **High-Contrast Light Mode**: High-density typography (`#0f172a`), solid borders (`#cbd5e1`), crisp white cards (`#ffffff`).
- **Print Optimization**: The `@media print` block in `globals.css` hides `header`, `nav`, buttons and any `.no-print` element, forces a white background with black text, and flattens `.glass-panel` surfaces to a plain bordered box for PDF export.
