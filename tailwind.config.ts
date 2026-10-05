import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#171717",
        ink: "#17283a",
        muted: "#69798b",
        brand: "var(--waikato-red, #D40100)",
        line: "#e3e9ed",
        canvas: "#f5f7f9",
      },
      fontFamily: {
        sans: ["Arial", "Helvetica", "sans-serif"],
        serif: ["Georgia", "serif"],
      },
      screens: {
        wide: { min: "1500px" },
        compact: { max: "1150px" },
        mobile: { max: "760px" },
      },
    },
  },
  plugins: [],
} satisfies Config;
