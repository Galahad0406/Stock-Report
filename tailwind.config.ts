// tailwind.config.ts 수정 예시
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        appleDark: "#000000",
        appleCard: "#1c1c1e",
        appleGray: "#2c2c2e",
        appleText: "#f5f5f7",
        appleSub: "#86868b",
        appleAccent: "#0a84ff", // 애플 블루
      },
      fontFamily: {
        body: ["'-apple-system'", "'BlinkMacSystemFont'", "'SF Pro Display'", "'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
