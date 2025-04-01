'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

type ThemeToggleProps = {
  className?: string;
  onClick?: () => void;
};

export function ThemeToggle({ className = "", onClick }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-w-[48px] p-2 h-10" />; // Placeholder matching button dimensions
  }

  const handleClick = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={`text-text ${className}`}
      aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      Theme
    </button>
  );
}
