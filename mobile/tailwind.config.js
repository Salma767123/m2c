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
        // Brand red — the real ladder from frontend/src/app/globals.css.
        // Every step here was previously #E01A1B, so `bg-brand-50` (a pale pink
        // tint) painted a solid red block, and `text-brand-800` on it was red on
        // red. A ladder whose steps are all identical is not a ladder.
        brand: {
          50: "#fff1f1",
          100: "#ffdede",
          200: "#ffc1c1",
          400: "#f24344",
          500: "#e01a1b",
          600: "#c41617",
          700: "#a31314",
          800: "#7d0f10",
        },
        // NOTE: `red` is deliberately NOT overridden — the web doesn't override
        // it either, so `bg-red-50` / `border-red-200` keep Tailwind's own soft
        // reds for error surfaces. Flattening them to brand red turned every
        // soft error card into a solid red slab.
        success: {
          50: "#ecfdf3",
          500: "#16a34a",
          700: "#15803d",
        },
        tertiary: {
          50: "#f5f7ff",
          500: "#0074c8",
        },
        // Error red — distinct from brand red on purpose. globals.css: "Kept
        // distinct from --color-error-* so 'active selection' never reads as a
        // validation failure." Mobile had them identical, collapsing exactly
        // the distinction the web set out to preserve.
        error: {
          50: "#ffdad6",
          500: "#ba1a1a",
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
