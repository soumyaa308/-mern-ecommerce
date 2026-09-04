/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f7f5",
          100: "#dceee7",
          200: "#b8ddd0",
          300: "#8fc7b3",
          400: "#5fa892",
          500: "#3d8b76",
          600: "#2c6f5d",
          700: "#24594c",
          800: "#1f483f",
          900: "#1a3c35",
          950: "#0c221e",
        },
        accent: {
          500: "#e08a3c",
          600: "#c9702a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Poppins", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 12px rgba(0,0,0,0.06)",
        cardHover: "0 8px 24px rgba(0,0,0,0.10)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.35s ease-out",
        slideDown: "slideDown 0.2s ease-out",
      },
    },
  },
  plugins: [],
};