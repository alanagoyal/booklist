"use client";

import { useTheme } from "next-themes";

export default function Header() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="bg-background border-b">
    <div className="h-16 px-3 py-2 flex justify-between items-center">
      <button 
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="font-bold font-display text-xl cursor-pointer"
      >
        BOOKLIST
      </button>
    </div>
  </div>
  )
}