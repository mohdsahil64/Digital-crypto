/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Dark blue crypto theme
        navy: {
          950: "#060b1a",
          900: "#0a1128",
          800: "#0f1b3d",
          700: "#152451",
          600: "#1d3066",
        },
        accent: {
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
