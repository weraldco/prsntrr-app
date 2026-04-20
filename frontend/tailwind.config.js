import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    fontFamily: {
      sans: ["Poppins", "system-ui", "sans-serif"],
      serif: ["Lora", "Georgia", "serif"],
      logo: ['"Bitcount Grid Double"', "system-ui", "sans-serif"],
      mono: defaultTheme.fontFamily.mono,
    },
    extend: {
      colors: {
        prsnt: {
          ink: "rgb(var(--prsnt-ink-rgb) / <alpha-value>)",
          surface: "rgb(var(--prsnt-surface-rgb) / <alpha-value>)",
          primary: "rgb(var(--prsnt-primary-rgb) / <alpha-value>)",
          accent: "rgb(var(--prsnt-accent-rgb) / <alpha-value>)",
          cta: "rgb(var(--prsnt-cta-rgb) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};
