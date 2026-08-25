import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-bg)",           // #000000 — primary canvas
        elevated: "var(--color-bg-elevated)",// #0a0c0f — surfaces (palette-3)
        surface: "var(--color-surface)",     // #1a1e24 — raised blocks (palette-4)
        primary: "var(--color-primary)",     // #d97757 — accent / CTA
        secondary: "var(--color-secondary)", // #6ea8ff — complementary
        success: "var(--color-success)",     // #7dd3a0 — palette-6
        warning: "var(--color-warning)",     // #e6b25c — palette-8
        ink: "var(--color-text)",            // #d4d4d4 — primary text
        muted: "var(--color-text-secondary)",// #999999 — muted text
        hairline: "var(--color-border)",     // #14171c — dividers
        strongline: "var(--color-border-strong)" // #1f242c — outlined controls
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      borderRadius: {
        subtle: "3px",
        button: "7px"
      },
      maxWidth: {
        content: "1120px"
      }
    }
  },
  plugins: []
};

export default config;
