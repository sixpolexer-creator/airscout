import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0a0e1a",
        panel: "#121829",
        edge: "#1f2940",
        accent: "#38bdf8",
        accent2: "#a78bfa",
        good: "#34d399",
      },
      boxShadow: {
        "glow-accent": "0 0 20px rgba(56,189,248,0.15)",
        "glow-good": "0 0 20px rgba(52,211,153,0.15)",
        "card-hover": "0 8px 24px rgba(56,189,248,0.06)",
      },
      keyframes: {
        "deal-in": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-5px)" },
        },
        pulseline: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        radar: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        ping2: {
          "0%": { transform: "scale(0.6)", opacity: "0.7" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
      animation: {
        "deal-in": "deal-in 0.35s ease-out",
        "fade-up": "fade-up 0.4s ease-out",
        float: "float 3s ease-in-out infinite",
        pulseline: "pulseline 1.4s ease-in-out infinite",
        radar: "radar 2.4s linear infinite",
        shimmer: "shimmer 1.6s infinite",
        ping2: "ping2 2s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
