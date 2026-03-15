import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#00C896",
          dark: "#0F172A",
          surface: "#1E293B",
          muted: "#64748B",
        },
      },
    },
  },
  plugins: [],
};

export default config;
