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
      keyframes: {
        "deal-in": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
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
