import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#f8f4ec",
        mist: "#eef4f7",
        ink: "#1f2a37",
        sage: "#bdd8c0",
        moss: "#5a7c65",
        gold: "#d7b575",
        blush: "#f4d9cc"
      },
      boxShadow: {
        card: "0 24px 50px -24px rgba(31, 42, 55, 0.28)",
        soft: "0 12px 30px -18px rgba(77, 105, 133, 0.25)"
      },
      fontFamily: {
        sans: ["SF Pro Display", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      backgroundImage: {
        aurora:
          "radial-gradient(circle at top left, rgba(255,255,255,0.9), rgba(238,244,247,0.45) 36%, rgba(189,216,192,0.35) 70%, rgba(248,244,236,0.95) 100%)"
      }
    }
  },
  plugins: []
};

export default config;
