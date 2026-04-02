/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)"],
        arabic: ["var(--font-cairo)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        cyber: {
          primary: "rgb(var(--accent-primary) / <alpha-value>)",
          glow: "rgb(var(--accent-glow) / <alpha-value>)",
          soft: "rgb(var(--accent-soft) / <alpha-value>)",
          bg: "rgb(var(--bg-primary) / <alpha-value>)",
          panel: "rgb(var(--bg-card) / <alpha-value>)",
          hover: "rgb(var(--bg-hover) / <alpha-value>)",
        },
        status: {
          success: "rgb(var(--success) / <alpha-value>)",
          warning: "rgb(var(--warning) / <alpha-value>)",
          danger: "rgb(var(--danger) / <alpha-value>)",
          info: "rgb(var(--info) / <alpha-value>)",
        },
        text: {
          primary: "rgb(var(--text-primary) / <alpha-value>)",
          secondary: "rgb(var(--text-secondary) / <alpha-value>)",
          muted: "rgb(var(--text-muted) / <alpha-value>)",
        },
      },
      boxShadow: {
        cyber: "0 0 0 1px rgb(0 209 255 / 0.14), 0 18px 60px rgb(0 0 0 / 0.42)",
        glow: "0 0 32px rgb(0 209 255 / 0.18)",
      },
      backgroundImage: {
        "cyber-radial": "radial-gradient(circle at top, rgb(0 209 255 / 0.16), transparent 55%)",
        "cyber-grid": "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
}



