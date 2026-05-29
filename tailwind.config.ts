import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#ffffff",
          secondary: "#f7f7f5",
          tertiary: "#f0efeb",
        },
        text: {
          primary: "#1a1a1a",
          secondary: "#6b6b6b",
          muted: "#9b9b9b",
        },
        border: {
          default: "rgba(0,0,0,0.08)",
          strong: "rgba(0,0,0,0.15)",
        },
        accent: {
          green: "#16a34a",
          red: "#dc2626",
          blue: "#2563eb",
          amber: "#d97706",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        base: ["15px", "1.6"],
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
      },
    },
  },
  plugins: [],
};
export default config;

// Made with Bob
