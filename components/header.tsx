"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { Suspense, useState, useRef, useEffect } from "react";
import { Menu } from "lucide-react";

function HeaderContent() {
  const searchParams = useSearchParams();
  const currentParams = searchParams.toString();
  const homeHref = currentParams ? `/?${currentParams}` : "/";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const getHrefWithParams = (path: string) => {
    return currentParams ? `${path}?${currentParams}` : path;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuItemClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className="h-16 flex justify-between items-center relative">
      <div className="flex items-center gap-4 px-3">
        <Link
          href={homeHref}
          className="font-bold font-display text-xl cursor-pointer"
        >
          BOOKLIST
        </Link>
        <div className="hidden md:flex items-center gap-4">
          <Link href={getHrefWithParams("/graph")}>Graph</Link>
          <Link href={getHrefWithParams("/roulette")}>Roulette</Link>
          <Link href={getHrefWithParams("/contribute")}>Contribute</Link>
          <Link href={getHrefWithParams("/about")}>About</Link>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3">
        <div className="hidden md:block">
          <ThemeToggle className="min-w-[48px] p-2 h-10 md:hover:text-text text-text/70" />
        </div>
        <button
          className="md:hidden p-2 text-text/70 transition-colors duration-200 md:hover:text-text"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
      <div 
        ref={menuRef}
        className={`absolute top-[63px] inset-x-0 bg-background border-y border-border z-50 transform transition-[opacity,transform] duration-200 origin-top ${
          isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="flex flex-col divide-y divide-border">
          <Link
            href={getHrefWithParams("/graph")}
            className="px-3 py-3 text-text transition-colors duration-200 md:hover:bg-accent/50"
            onClick={handleMenuItemClick}
          >
            Graph
          </Link>
          <Link
            href={getHrefWithParams("/roulette")}
            className="px-3 py-3 text-text transition-colors duration-200 md:hover:bg-accent/50"
            onClick={handleMenuItemClick}
          >
            Roulette
          </Link>
          <Link
            href={getHrefWithParams("/contribute")}
            className="px-3 py-3 text-text transition-colors duration-200 md:hover:bg-accent/50"
            onClick={handleMenuItemClick}
          >
            Contribute
          </Link>
          <Link
            href={getHrefWithParams("/about")}
            className="px-3 py-3 text-text transition-colors duration-200 md:hover:bg-accent/50"
            onClick={handleMenuItemClick}
          >
            About
          </Link>
          <div className="px-3 py-3">
            <ThemeToggle 
              className="text-text transition-colors duration-200 md:hover:bg-accent/50 w-full text-left" 
              onClick={handleMenuItemClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  return (
    <div className="bg-background border-b border-border">
      <Suspense fallback={
        <div className="h-16 flex justify-between items-center">
          <div className="flex items-center gap-4 px-3">
            <div className="font-bold font-display text-xl">BOOKLIST</div>
          </div>
          <div className="flex items-center gap-2 px-3">
            <div className="hidden md:block">
              <ThemeToggle className="min-w-[48px] p-2 h-10 md:hover:text-text text-text/70" />
            </div>
          </div>
        </div>
      }>
        <HeaderContent />
      </Suspense>
    </div>
  );
}
