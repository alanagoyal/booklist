import type { Config } from "tailwindcss";

const config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class"],
  safelist: [
    // Safelist for background colors with arbitrary HSL values
    'bg-[hsl(151,80%,95%)]',
    'bg-[hsl(151,80%,90%)]',
    'bg-[hsl(151,80%,85%)]',
    'bg-[hsl(151,80%,80%)]',
    'bg-[hsl(151,80%,75%)]',
    'bg-[hsl(151,80%,70%)]',
    'hover:bg-[hsl(151,80%,92%)]',
    'hover:bg-[hsl(151,80%,88%)]',
    'hover:bg-[hsl(151,80%,84%)]',
    'hover:bg-[hsl(151,80%,80%)]',
    'hover:bg-[hsl(151,80%,76%)]',
    'hover:bg-[hsl(151,80%,72%)]',
    'dark:bg-[hsl(160,84%,5%)]',
    'dark:bg-[hsl(160,84%,9%)]',
    'dark:bg-[hsl(160,84%,13%)]',
    'dark:bg-[hsl(160,84%,17%)]',
    'dark:bg-[hsl(160,84%,21%)]',
    'dark:bg-[hsl(160,84%,25%)]',
    'dark:hover:bg-[hsl(160,84%,7%)]',
    'dark:hover:bg-[hsl(160,84%,11%)]',
    'dark:hover:bg-[hsl(160,84%,15%)]',
    'dark:hover:bg-[hsl(160,84%,19%)]',
    'dark:hover:bg-[hsl(160,84%,23%)]',
    'dark:hover:bg-[hsl(160,84%,27%)]',
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
