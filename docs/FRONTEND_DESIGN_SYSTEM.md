# CapExIQ — Frontend Design System & UI Architecture

## 1. Executive Visual Standards
CapExIQ uses a single unified design system built on CSS variables in [`src/app/globals.css`](file:///Users/krishnamathurm4pro/Desktop/CF%20PROJECT%20ANTIGRAVITY/src/app/globals.css).

## 2. Semantic Token Registry
- `--background`: Base canvas color (`#f1f5f9` Light / `#090d16` Dark).
- `--foreground`: Deep high-contrast text (`#0f172a` Light / `#f8fafc` Dark).
- `--card`: Surface card background (`#ffffff` Light / `#111827` Dark).
- `--card-foreground`: Card text color.
- `--border`: Solid structure outline (`#cbd5e1` Light / `#1f293d` Dark).
- `--muted`: Subtle panel fill (`#e2e8f0` Light / `#1a2333` Dark).
- `--primary`: Corporate Cyan/Blue Accent (`#0284c7` Light / `#0ea5e9` Dark).
- `--success`: Positive financial indicator (`#16a34a` Light / `#10b981` Dark).
- `--warning`: Financial caution / alert (`#d97706` Light / `#f59e0b` Dark).
- `--destructive`: Negative / Value-destroying indicator (`#dc2626` Light / `#ef4444` Dark).

## 3. Financial Status Code Treatment
- **Positive NPV / Return**: Green badge with explicit text label (e.g. `+AED 9.18M`).
- **Warning / Covenant Threshold**: Amber badge with explicit text label (e.g. `DSCR < 1.25x`).
- **Negative NPV / Value Loss**: Red badge with explicit text label (e.g. `-AED 1.50M`).
- **Neutral / Baseline**: Slate / Blue-Grey treatment.

## 4. Theme System & Light Mode Guidelines
- **Hydration Safety**: Powered by `next-themes` ThemeProvider and `ThemeToggle` dropdown.
- **High-Contrast Light Mode**: High-density typography (`#0f172a`), solid borders (`#cbd5e1`), crisp white cards (`#ffffff`).
- **Print Optimization**: Automatically strips sidebars, sets background to white, and expands charts cleanly for PDF export.
