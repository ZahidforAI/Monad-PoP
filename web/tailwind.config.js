/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
          border: "var(--card-border)",
        },
        outline: {
          variant: "var(--outline-variant)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          container: "var(--primary-container)",
          onContainer: "var(--on-primary-container)",
        },
        monad: {
          purple: "var(--monad-purple)",
          lightPurple: "var(--monad-lightPurple)",
          darkPurple: "var(--monad-darkPurple)",
          glow: "var(--monad-glow)",
        },
        accent: {
          cyan: "var(--accent-cyan)",
          emerald: "var(--accent-emerald)",
          rose: "var(--accent-rose)",
          amber: "var(--accent-amber)",
        }
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "sans-serif"],
        display: ["var(--font-playfair)", "serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s infinite ease-in-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: 0.2, transform: "scale(1)" },
          "50%": { opacity: 0.6, transform: "scale(1.02)" },
        },
        "fade-in": {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        }
      }
    },
  },
  plugins: [],
}
