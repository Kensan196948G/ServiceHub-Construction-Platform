/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Primary — mapped to canonical brand tokens (docs/design/ServiceHub-WebUI.html)
        primary: {
          10:  "var(--brand-10)",
          20:  "var(--brand-20)",
          50:  "var(--brand-50)",
          500: "var(--brand-50)",
          600: "var(--brand-60)",
          700: "var(--brand-70)",
          800: "var(--brand-80)",
          900: "var(--brand-90)",
        },
        brand: {
          10:  "var(--brand-10)",
          20:  "var(--brand-20)",
          50:  "var(--brand-50)",
          60:  "var(--brand-60)",
          70:  "var(--brand-70)",
          80:  "var(--brand-80)",
          90:  "var(--brand-90)",
        },
        safety: {
          10:  "var(--safety-10)",
          20:  "var(--safety-20)",
          50:  "var(--safety-50)",
          60:  "var(--safety-60)",
        },
        ok: {
          10:  "var(--ok-10)",
          20:  "var(--ok-20)",
          60:  "var(--ok-60)",
        },
        warn: {
          10:  "var(--warn-10)",
          20:  "var(--warn-20)",
          60:  "var(--warn-60)",
        },
        err: {
          10:  "var(--err-10)",
          20:  "var(--err-20)",
          60:  "var(--err-60)",
        },
        // Brand tokens aligned with canonical design (ServiceHub-WebUI.html)
        brand: {
          10:  "#eaf2fb", // --brand-10: light tint for active bg
          20:  "#d6e4f5", // --brand-20: subtle border
          50:  "#3b7dd8", // --brand-50
          60:  "#2458a6", // --brand-60: primary brand, active left-border
          70:  "#1b4079", // --brand-70: active text
          80:  "#13315c", // --brand-80
          90:  "#0b2545", // --brand-90
        },
        construction: {
          orange: "#f97316",
          yellow: "#eab308",
        },
      },
    },
  },
  plugins: [],
};
