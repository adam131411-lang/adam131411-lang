import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 台股慣例:紅漲綠跌
        up: "#e53935",
        down: "#2e7d32",
      },
    },
  },
  plugins: [],
};

export default config;
