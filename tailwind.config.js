/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FBF8F1",
          100: "#F5F0E6",
          200: "#EBE3D2",
          300: "#DDD0B8",
        },
        green: {
          50: "#EFF7F1",
          100: "#D6E8DC",
          200: "#A7CDB4",
          300: "#7AAE8E",
          400: "#4E8E6A",
          500: "#2E6B4A",
          600: "#1F5238",
          700: "#173D2A",
          800: "#112A1E",
          900: "#0A1B14",
        },
        gold: {
          100: "#F7EBC8",
          200: "#EFD791",
          300: "#E0C168",
          400: "#C9A23E",
          500: "#A8842A",
          600: "#856820",
        },
        red: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
        },
        purple: {
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Amiri", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 2px 12px rgba(23, 61, 42, 0.08)",
        card: "0 4px 20px rgba(23, 61, 42, 0.10)",
        deep: "0 8px 30px rgba(23, 61, 42, 0.18)",
        gold: "0 0 12px rgba(201, 162, 62, 0.25)",
      },
      borderRadius: {
        card: "1.5rem",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-down": "slideDown 0.35s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideUp: {
          "0%": { opacity: 0, transform: "translateY(16px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: 0, transform: "translateY(-100%)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: 0, transform: "scale(0.95)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
