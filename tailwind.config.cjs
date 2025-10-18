/** @type {import("tailwindcss").Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Roboto", "system-ui", "sans-serif"]
      },
      colors: {
        "brand-primary": "#1C6DD0",
        "brand-secondary": "#F7B538",
        "brand-muted": "#F2F4F7",
        "priority-red": "#D92D20",
        "priority-orange": "#F79009",
        "priority-green": "#12B76A"
      }
    }
  },
  plugins: []
};