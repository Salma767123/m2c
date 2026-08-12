/** @type {import('tailwindcss').Config} */

// Mirrors the web design system so `bg-brand-500` / `text-ink` mean the same
// thing in both clients. Numbers are duplicated from src/constants/theme.ts —
// NativeWind reads this file at build time and can't import from TS, so a token
// change has to land in both places (and in frontend/src/app/globals.css).
// See /DESIGN.md.
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#E01A1B",
          100: "#E01A1B",
          200: "#E01A1B",
          400: "#E01A1B",
          500: "#E01A1B",
          600: "#E01A1B",
          700: "#E01A1B",
          800: "#E01A1B",
        },
        red: {
          50: "#E01A1B",
          100: "#E01A1B",
          200: "#E01A1B",
          300: "#E01A1B",
          400: "#E01A1B",
          500: "#E01A1B",
          600: "#E01A1B",
          700: "#E01A1B",
          800: "#E01A1B",
          900: "#E01A1B",
        },
        success: {
          50: "#ecfdf3",
          500: "#16a34a",
          700: "#15803d",
        },
        tertiary: {
          50: "#f5f7ff",
          500: "#0074c8",
        },
        error: {
          50: "#E01A1B",
          500: "#E01A1B",
        },
        warning: {
          50: "#fffbeb",
          500: "#d97706",
          700: "#b45309",
        },
        ink: {
          DEFAULT: "#111827",
          base: "#374151",
          muted: "#6b7280",
          subtle: "#9ca3af",
        },
        surface: {
          canvas: "#f7f7f5",
          card: "#ffffff",
          outline: "#e5e7eb",
        },
      },
    },
  },
  plugins: [],
}
