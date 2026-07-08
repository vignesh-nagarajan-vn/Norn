import type { Config } from "tailwindcss";

// Tokens follow the "Scientific Precision" design system from the Stitch mockup.
// Colors use channel CSS variables so Tailwind opacity modifiers (bg-x/10) work.
const c = (name: string) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: c("background"),
        surface: c("surface"),
        "surface-low": c("surface-low"),
        "surface-container": c("surface-container"),
        "surface-high": c("surface-high"),
        "surface-bright": c("surface-bright"),
        "surface-variant": c("surface-variant"),
        "bg-clinical": c("background"),
        "on-surface": c("on-surface"),
        "on-surface-variant": c("on-surface-variant"),
        outline: c("outline"),
        "outline-variant": c("outline-variant"),
        primary: c("primary"),
        "on-primary": c("on-primary"),
        "primary-container": c("primary-container"),
        secondary: c("secondary"),
        "on-secondary": c("on-secondary"),
        "secondary-container": c("secondary-container"),
        pathogenic: c("pathogenic"),
        vus: c("vus"),
        benign: c("benign"),
        "risk-high": c("risk-high"),
        error: c("error"),
        "acmg-very-strong": c("acmg-vs"),
        "acmg-strong": c("acmg-s"),
        "acmg-moderate": c("acmg-m"),
        "acmg-supporting": c("acmg-sup"),
        // Aliases kept for continuity.
        ink: c("on-surface"),
        muted: c("on-surface-variant"),
        faint: c("outline"),
        line: c("outline-variant"),
        canvas: c("background"),
        brand: c("primary"),
        accent: c("secondary"),
        path: c("path"),
        lpath: c("lpath"),
        lben: c("lben"),
        ben: c("ben"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.05)",
        lift: "0 6px 20px rgba(15, 23, 42, 0.08)",
      },
      letterSpacing: {
        caps: "0.05em",
      },
    },
  },
  plugins: [],
};

export default config;
