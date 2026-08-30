import type { Config } from "tailwindcss";

// BIZ Pulse design tokens — Dark Mode "Navy & Gold"
// Keep every color reference in the app going through these names,
// not raw hex, so the palette stays a single source of truth.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bp-bg": "#0A0F1D", // deep matte navy — app background
        "bp-surface": "#161F38", // cards, containers
        "bp-surface-raised": "#1D2847", // hover/active state of a surface
        "bp-gold": "#D4AF37", // imperial gold — accents, primary buttons
        "bp-gold-dim": "#8C7526", // disabled/dim gold
        "bp-text": "#F5F6FA", // primary text (near-white)
        "bp-text-muted": "#A6ACC2", // secondary text (light gray)
        "bp-border": "#26315689", // subtle hairline on surfaces
      },
      borderRadius: {
        xl: "1rem",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        "gold-glow": "0 0 24px 0 rgba(212, 175, 55, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
