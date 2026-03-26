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
        background: "var(--background)",
        "background-secondary": "var(--background-secondary)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        surface: "var(--surface)",
        "surface-secondary": "var(--surface-secondary)",
        brand: {
          orange: "var(--accent)",
          "orange-light": "var(--accent-light)",
          muted: "var(--muted)",
          black: "var(--foreground)",
          white: "var(--background)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          light: "var(--accent-light)",
          mid: "var(--accent-mid)",
          hover: "var(--accent-hover)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0,0,0,0.04)',
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
        'md': '0 4px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)',
        'lg': '0 8px 30px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03)',
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '20px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
export default config;
