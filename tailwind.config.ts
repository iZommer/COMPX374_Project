import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#10263b",
        ink: "#17283a",
        muted: "#69798b",
        brand: "#087660",
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
