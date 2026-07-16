/** @type {import('tailwindcss').Config} */
// Palette mirrors checker_app/src/constants/design.ts (web checker portal
// source of truth — accent = brand red #e01a1b on white/slate surfaces).
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff1f1",
          100: "#ffdede",
          200: "#ffc1c1",
          400: "#f24344",
          500: "#e01a1b",
          600: "#c41617",
          700: "#a31314",
        },
        success: {
          50: "#ecfdf3",
          100: "#dcfce7",
          500: "#16a34a",
          600: "#15803d",
          700: "#15803d",
        },
        info: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#0074c8",
          600: "#0369a1",
        },
        amber: {
          50: "#fffbeb",
          100: "#fef3c7",
          500: "#d97706",
          600: "#b45309",
          700: "#a16207",
        },
        danger: {
          50: "#fee2e2",
          100: "#fecaca",
          500: "#dc2626",
          600: "#b91c1c",
          700: "#991b1b",
        },
        canvas: "#f7f7f5",
      },
      fontFamily: {
        sans: ["Outfit_400Regular"],
      },
      borderRadius: {
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
      },
    },
  },
  plugins: [],
}
