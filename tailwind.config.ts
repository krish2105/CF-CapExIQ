import type { Config } from "tailwindcss";

/**
 * CapExIQ — "Midnight Vault" Tailwind theme.
 *
 * Semantic tokens (bg-card, text-muted-foreground, border-border …) resolve to
 * CSS variables declared in src/app/globals.css, so both the dark "midnight
 * vault" register and the light "parchment ledger" register are driven from
 * one class surface. Raw Slash palette names are exposed as well for the rare
 * case where a literal value is required.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        /* ---- Semantic (theme-aware) ---- */
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          DEFAULT: "var(--surface)",
          elevated: "var(--surface-elevated)",
          sunken: "var(--surface-sunken)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        input: "var(--input)",
        ring: "var(--ring)",
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
          soft: "var(--success-soft)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          foreground: "var(--warning-foreground)",
          soft: "var(--warning-soft)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
          soft: "var(--destructive-soft)",
        },
        info: {
          DEFAULT: "var(--info)",
          foreground: "var(--info-foreground)",
          soft: "var(--info-soft)",
        },
        selected: {
          DEFAULT: "var(--selected)",
          foreground: "var(--selected-foreground)",
        },
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
          grid: "var(--chart-grid)",
          axis: "var(--chart-axis)",
        },

        /* ---- Raw Slash palette (literal values) ---- */
        obsidian: "#08080a",
        onyx: "#040406",
        carbon: "#121317",
        graphite: "#1c1d22",
        slateline: "#2e3038",
        smoke: "#464853",
        ash: "#5e616e",
        steel: "#777a88",
        fog: "#9194a1",
        mist: "#acafb9",
        silver: "#c7c9d1",
        bone: "#e2e3e9",
        copper: {
          DEFAULT: "#cc9166",
          50: "#faf1ea",
          100: "#f2ddcc",
          200: "#e6c0a3",
          300: "#d9a37b",
          400: "#cc9166",
          500: "#b3703f",
          600: "#8a5327",
          700: "#653c1c",
        },
        gilded: {
          DEFAULT: "#ae9357",
          light: "#fff0cc",
          deep: "#bd9d4f",
        },
      },

      fontFamily: {
        display: ["var(--font-playfair)", "Playfair Display", "Georgia", "serif"],
        serif: ["var(--font-playfair)", "Playfair Display", "Georgia", "serif"],
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "ui-monospace", "monospace"],
      },

      /* Slash type scale. Serif steps start at 28px ("display-xs");
         sans steps stay below the 48px ceiling per the reference rules. */
      fontSize: {
        eyebrow: ["13px", { lineHeight: "1", letterSpacing: "-0.26px" }],
        "body-xs": ["16px", { lineHeight: "1.5" }],
        "body-sm": ["18px", { lineHeight: "1.38", letterSpacing: "-0.36px" }],
        body: ["20px", { lineHeight: "1.38", letterSpacing: "-0.8px" }],
        subheading: ["24px", { lineHeight: "1", letterSpacing: "-0.31px" }],
        "display-xs": ["28px", { lineHeight: "1.13", letterSpacing: "0.01em" }],
        "heading-sm": ["44px", { lineHeight: "1.13", letterSpacing: "0.44px" }],
        heading: ["52px", { lineHeight: "1.13", letterSpacing: "0.52px" }],
        "heading-lg": ["64px", { lineHeight: "1.13", letterSpacing: "0.64px" }],
        display: ["88px", { lineHeight: "1", letterSpacing: "0.88px" }],
      },

      letterSpacing: {
        display: "0.01em",
        tightest: "-0.04em",
        tighter: "-0.025em",
        tight: "-0.013em",
        eyebrow: "0.14em",
      },

      spacing: {
        "4.5": "18px",
        "5.5": "22px",
        "18": "72px",
        "26": "105px",
        "56": "224px",
        section: "160px",
        "section-app": "40px",
      },

      maxWidth: {
        page: "1216px",
        prose: "72ch",
      },

      borderRadius: {
        nav: "2px",
        card: "10px",
        pill: "9999px",
      },

      boxShadow: {
        subtle: "rgba(255, 255, 255, 0.2) 0px 0px 0px 1px",
        "ring-copper": "0 0 0 1px rgba(204, 145, 102, 0.35)",
        none: "none",
      },

      backgroundImage: {
        gilded:
          "linear-gradient(103deg, rgb(174,147,87), rgb(255,240,204) 40%, rgb(174,147,87) 70%, rgba(189,157,79,0))",
        "gilded-solid":
          "linear-gradient(103deg, #ae9357 0%, #fff0cc 45%, #d8b86a 100%)",
        "vault-bloom":
          "radial-gradient(900px 520px at 12% -8%, rgba(204,145,102,0.06), transparent 62%)",
      },

      transitionTimingFunction: {
        vault: "cubic-bezier(0.22, 1, 0.36, 1)",
      },

      keyframes: {
        "reveal-up": {
          from: { opacity: "0", transform: "translate3d(0, 14px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        "reveal-fade": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "gild-sweep": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.45", transform: "scale(0.85)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },

      animation: {
        "reveal-up": "reveal-up 0.72s cubic-bezier(0.22,1,0.36,1) forwards",
        "reveal-fade": "reveal-fade 0.6s ease forwards",
        "gild-sweep": "gild-sweep 8s linear infinite",
        "pulse-dot": "pulse-dot 2.4s ease-in-out infinite",
        "slide-down": "slide-down 0.2s cubic-bezier(0.22,1,0.36,1)",
        "scale-in": "scale-in 0.16s cubic-bezier(0.22,1,0.36,1)",
      },
    },
  },
  plugins: [],
};

export default config;
