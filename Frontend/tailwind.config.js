/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        heading: ["Poppins", "sans-serif"],
      },
      colors: {
        primary: {
          50: "#f0f5ff",
          100: "#e0ebff",
          200: "#c2d6ff",
          300: "#94b8ff",
          400: "#5c91ff",
          500: "#2e6ff2", // Royal Blue
          600: "#1a56db",
          700: "#1542af",
          800: "#16388b",
          900: "#1a2b49", // Navy Blue
        },
      },
    },
  },
  plugins: [],
};
