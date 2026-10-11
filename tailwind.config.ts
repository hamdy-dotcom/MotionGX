import type { Config } from "tailwindcss";

// "Option 6" design tokens. Values live as CSS variables in app/globals.css.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: { DEFAULT: "var(--teal)", band: "var(--teal-band)", bg: "var(--teal-bg)", accent: "var(--teal-accent)", ink: "var(--teal-ink)" },
        primary: {
          DEFAULT: "var(--primary)",
          dark: "var(--primary-dark)",
          mid: "var(--primary-mid)",
          lavender: "var(--primary-lavender)",
          light: "var(--primary-light)",
        },
        field: "var(--field)",
        navy: "var(--navy)",
        ink: { 2: "var(--ink-2)", muted: "var(--ink-muted)" },
        dash: "var(--dash)",
        success: { bg: "var(--success-bg)", ink: "var(--success-ink)" },
        warning: { bg: "var(--warning-bg)", ink: "var(--warning-ink)" },
        danger: { bg: "var(--danger-bg)", ink: "var(--danger-ink)" },
      },
      borderRadius: {
        card: "30px",
        panel: "22px",
      },
      boxShadow: {
        card: "0 24px 60px rgba(16, 24, 74, 0.16)",
      },
      maxWidth: {
        app: "1360px",
      },
      fontFamily: {
        sans: ["var(--font-readex)", "system-ui", "sans-serif"],
      },
      minHeight: {
        pill: "44px",
      },
    },
  },
};

export default config;
