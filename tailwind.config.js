/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  safelist: [
    // Transitions & Animations
    "translate-x-0",
    "-translate-x-full",

    // Gradients
    "bg-gradient-to-r",
    "bg-gradient-to-b",
    "from-cyan-500",
    "to-purple-500",
    "from-cyan-500/20",
    "to-purple-500/20",
    "from-slate-950",
    "via-slate-900",
    "to-slate-950",

    // Blur & Glass
    "backdrop-blur-xl",

    // Borders
    "border-cyan-500/20",
    "border-cyan-500/30",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
