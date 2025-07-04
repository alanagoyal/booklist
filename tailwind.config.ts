import type { Config } from "tailwindcss";

const config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class"],
  safelist: [
    // CSS variable versions used by getBackgroundColor function
    'bg-[hsl(var(--background-l1))]',
    'bg-[hsl(var(--background-l2))]',
    'bg-[hsl(var(--background-l3))]',
    'bg-[hsl(var(--background-l4))]',
    'bg-[hsl(var(--background-l5))]',
    'bg-[hsl(var(--background-l6))]',
    'md:hover:bg-[hsl(var(--background-l1-hover))]',
    'md:hover:bg-[hsl(var(--background-l2-hover))]',
    'md:hover:bg-[hsl(var(--background-l3-hover))]',
    'md:hover:bg-[hsl(var(--background-l4-hover))]',
    'md:hover:bg-[hsl(var(--background-l5-hover))]',
    'md:hover:bg-[hsl(var(--background-l6-hover))]',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        "grid-border": "hsl(var(--grid-border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      fontFamily: {
        sans: ['Special Elite', 'monospace'],
        serif: ['Special Elite', 'serif'],
        display: ['Special Elite', 'sans-serif'],
        mono: ['Special Elite', 'monospace'],
      },
      borderRadius: {
        base: "var(--radius)",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
