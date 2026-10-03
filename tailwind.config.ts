import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        appleDark: "#000000",
        appleCard: "#1C1C1E",
        appleCardHover: "#2C2C2E",
        appleGray: "#3A3A3C",
        appleSubText: "#8E8E93",
        appleText: "#F2F2F7",
        appleAccent: "#0A84FF", // Apple System Blue
        appleGreen: "#30D158",
        appleRed: "#FF453A",
      },
      fontFamily: {
        body: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "SF Pro Display",
          "Inter",
          "sans-serif",
        ],
        mono: ["SF Mono", "Menlo", "IBM Plex Mono", "monospace"],
      },
      boxShadow: {
        apple: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
    },
  },
  plugins: [],
};

export default config;
