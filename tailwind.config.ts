import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B1220",
          900: "#111A2C",
          800: "#1B2740",
        },
        paper: {
          50: "#F7F8FA",
          100: "#EEF1F5",
        },
        signal: {
          400: "#34D3A6",
          500: "#17B890",
          600: "#119374",
        },
        amber: {
          400: "#F7B84B",
          500: "#F5A623",
        },
        slate: {
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
        },
        line: {
          light: "#E2E5EA",
          dark: "#22304A",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,18,32,0.04), 0 8px 24px -12px rgba(11,18,32,0.10)",
        "card-dark": "0 1px 2px rgba(0,0,0,0.2), 0 8px 24px -12px rgba(0,0,0,0.5)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "arc-draw": {
          "0%": { strokeDashoffset: "var(--arc-length)" },
          "100%": { strokeDashoffset: "var(--arc-offset)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
        "arc-draw": "arc-draw 0.9s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
} satisfies Config;
