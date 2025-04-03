"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { Suspense, useState, useRef, useEffect } from "react";
import { Menu } from "lucide-react";

function HeaderContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentParams = searchParams.toString();
  const homeHref = currentParams ? `/?${currentParams}` : "/";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const getHrefWithParams = (path: string) => {
    return currentParams ? `${path}?${currentParams}` : path;
  };

  const getLinkClasses = (path: string) => {
    const isActive = pathname === path;
    return path === '/' 
      ? 'transition-colors duration-200' 
      : `transition-colors duration-200 border-b-2 ${isActive ? 'border-text' : 'border-transparent'}`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleMenuItemClick = () => {
    // Add a delay before closing to allow for transition
    setTimeout(() => {
      setIsMenuOpen(false);
    }, 150);
  };

  return (
    <div className="h-16 flex justify-between items-center relative">
      <div className="flex items-center gap-4 px-3">
        <Link
          href={homeHref}
          className={`font-bold font-display text-xl cursor-pointer ${getLinkClasses('/')}`}
        >
          BOOKLIST
        </Link>
        <div className="hidden md:flex items-center gap-4">
          <div className="flex">
            <Link href={getHrefWithParams("/graph")} className={`text-width ${getLinkClasses('/graph')}`}>Graph</Link>
          </div>
          <div className="flex">
            <Link href={getHrefWithParams("/roulette")} className={`text-width ${getLinkClasses('/roulette')}`}>Roulette</Link>
          </div>
          <div className="flex">
            <Link href={getHrefWithParams("/contribute")} className={`text-width ${getLinkClasses('/contribute')}`}>Contribute</Link>
          </div>
          <div className="flex">
            <Link href={getHrefWithParams("/about")} className={`text-width ${getLinkClasses('/about')}`}>About</Link>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3">
        <div className="hidden md:block">
          <ThemeToggle className="min-w-[48px] p-2 h-10 md:hover:text-text text-text/70" />
        </div>
        <button
          ref={menuButtonRef}
          className="md:hidden p-2 text-text/70 transition-colors duration-200 md:hover:text-text"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
      <div 
        ref={menuRef}
        className={`absolute top-16 inset-x-0 bg-background border-y border-border z-50 transition-opacity duration-300 ${
          isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col p-3 gap-3">
          <div className="flex">
            <Link
              href={getHrefWithParams("/graph")}
              className={`text-text transition-colors duration-200 ${getLinkClasses('/graph')}`}
              onClick={handleMenuItemClick}
            >
              Graph
            </Link>
          </div>
          <div className="flex">
            <Link
              href={getHrefWithParams("/roulette")}
              className={`text-text transition-colors duration-200 ${getLinkClasses('/roulette')}`}
              onClick={handleMenuItemClick}
            >
              Roulette
            </Link>
          </div>
          <div className="flex">
            <Link
              href={getHrefWithParams("/contribute")}
              className={`text-text transition-colors duration-200 ${getLinkClasses('/contribute')}`}
              onClick={handleMenuItemClick}
            >
              Contribute
            </Link>
          </div>
          <div className="flex">
            <Link
              href={getHrefWithParams("/about")}
              className={`text-text transition-colors duration-200 ${getLinkClasses('/about')}`}
              onClick={handleMenuItemClick}
            >
              About
            </Link>
          </div>
          <div className="flex">
            <ThemeToggle 
              className={`text-text transition-colors duration-200 ${getLinkClasses('theme')}`}
              onClick={handleMenuItemClick}
            >
              Theme
            </ThemeToggle>
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
