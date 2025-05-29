"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation"; // Import useRouter hook
import { ThemeToggle } from "./theme-toggle";
import { useState, Suspense, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

function HeaderContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter(); // Initialize useRouter hook
  const currentParams = searchParams.toString();
  const homeHref = (() => {
    const params = new URLSearchParams(currentParams);
    params.set("view", "books");
    return `/?${params.toString()}`;
  })();
  const handleMobileHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(currentParams);
    params.delete("key");
    params.set("view", "books");
    router.push(`/?${params.toString()}`, { scroll: false });
  };
  const isHomePage = pathname === "/";
  const view = isHomePage
    ? (searchParams.get("view") as "books" | "people") || "books"
    : null;

  // State for menu
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!isMenuOpen) return;

      const target = e.target as HTMLElement;
      if (!menuRef.current?.contains(target)) {
        e.preventDefault();
        e.stopPropagation();
        setIsMenuOpen(false);
        // Brief delay before allowing new clicks
        const clickBlock = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
        };
        document.addEventListener("click", clickBlock, true);
        setTimeout(() => {
          document.removeEventListener("click", clickBlock, true);
        }, 200);
      }
    };

    document.addEventListener("mousedown", handleClick, true);
    return () => document.removeEventListener("mousedown", handleClick, true);
  }, [isMenuOpen]);

  // Create new search params for view switching
  const getViewHref = (view: "books" | "people") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    return `/?${params.toString()}`;
  };

  return (
    <div className="h-[48px] flex border-b border-border">
      <div className="flex gap-4 px-3">
        <Link
          href={homeHref}
          className="hidden md:block font-bold text-2xl text-text transition-colors duration-200 pt-3"
        >
          BOOKLIST
        </Link>
        <Link
          href={homeHref}
          onClick={handleMobileHomeClick}
          className="md:hidden font-bold text-2xl text-text transition-colors duration-200 pt-3"
        >
          BOOKLIST
        </Link>
        <div className="hidden md:flex h-[48px] text-sm pt-2 space-x-3">
          <Link
            href={getViewHref("books")}
            className={`h-full flex items-center px-1 transition-colors duration-200 border-b-2 text-text ${
              isHomePage && view === "books"
                ? "border-text"
                : "border-transparent"
            }`}
          >
            Books
          </Link>
          <Link
            href={getViewHref("people")}
            className={`h-full flex items-center px-1 transition-colors duration-200 border-b-2 text-text ${
              isHomePage && view === "people"
                ? "border-text"
                : "border-transparent"
            }`}
          >
            People
          </Link>
          <Link
            href={`/recommendations?${searchParams.toString()}`}
            className={`h-full flex items-center px-1 transition-colors duration-200 border-b-2 text-text ${
              pathname === "/recommendations"
                ? "border-text"
                : "border-transparent"
            }`}
          >
            Recommendations
          </Link>
          <Link
            href={`/insights?${searchParams.toString()}`}
            className={`h-full flex items-center px-1 transition-colors duration-200 border-b-2 text-text ${
              pathname === "/insights"
                ? "border-text"
                : "border-transparent"
            }`}
          >
            Insights
          </Link>
          <Link
            href={`/about?${searchParams.toString()}`}
            className={`h-full flex items-center px-1 transition-colors duration-200 border-b-2 text-text ${
              pathname === "/about"
                ? "border-text"
                : "border-transparent"
            }`}
          >
            About
          </Link>
        </div>
      </div>
      <div className="ml-auto flex gap-2">
        <div className="hidden md:flex items-center gap-2 pt-2 px-2 text-sm">
          <ThemeToggle className="h-full p-2 text-text" />
        </div>
        <div className="md:hidden px-2 pt-1 relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="h-10 w-10 flex items-center justify-center text-text"
            aria-label="Menu"
          >
            <Menu size={24} />
          </button>
          {isMenuOpen && (
            <div
              ref={menuRef}
              className="absolute right-0 top-12 w-56 bg-background border-l border-b border-border z-50"
            >
              <Link
                href={getViewHref("books")}
                className="w-full px-4 py-2 flex items-center text-left text-text"
                onClick={(e) => {
                  e.preventDefault();
                  setIsMenuOpen(false);
                  const params = new URLSearchParams(currentParams);
                  params.delete("key");
                  params.set("view", "books");
                  router.push(`/?${params.toString()}`, { scroll: false });
                }}
              >
                <span
                  className={`transition-all duration-200 ${isHomePage && view === "books" ? "border-b-2 border-text text-text" : ""}`}
                >
                  Books
                </span>
              </Link>
              <Link
                href={getViewHref("people")}
                className="w-full px-4 py-2 flex items-center text-left text-text"
                onClick={(e) => {
                  e.preventDefault();
                  setIsMenuOpen(false);
                  const params = new URLSearchParams(currentParams);
                  params.delete("key");
                  params.set("view", "people");
                  router.push(`/?${params.toString()}`, { scroll: false });
                }}
              >
                <span
                  className={`transition-all duration-200 ${isHomePage && view === "people" ? "border-b-2 border-text text-text" : ""}`}
                >
                  People
                </span>
              </Link>
              <Link
                href={`/recommendations?${currentParams}`}
                className="w-full px-4 py-2 flex items-center text-left text-text"
                onClick={(e) => {
                  e.preventDefault();
                  setIsMenuOpen(false);
                  router.push(`/recommendations?${currentParams}`);
                }}
              >
                <span
                  className={`transition-all duration-200 ${pathname === "/recommendations" ? "border-b-2 border-text text-text" : ""}`}
                >
                  Recommendations
                </span>
              </Link>
              <Link
                href="/insights"
                className="w-full px-4 py-2 flex items-center text-left text-text"
                onClick={(e) => {
                  e.preventDefault();
                  setIsMenuOpen(false);
                  router.push(`/insights?${currentParams}`);
                }}
              >
                <span
                  className={`transition-all duration-200 ${pathname === "/insights" ? "border-b-2 border-text text-text" : ""}`}
                >
                  Insights
                </span>
              </Link>
              <Link
                href="/about"
                className="w-full px-4 py-2 flex items-center text-left text-text"
                onClick={(e) => {
                  e.preventDefault();
                  setIsMenuOpen(false);
                  router.push(`/about?${currentParams}`);
                }}
              >
                <span
                  className={`transition-all duration-200 ${pathname === "/about" ? "border-b-2 border-text text-text" : ""}`}
                >
                  About
                </span>
              </Link>
              <ThemeToggle
                className="w-full px-4 py-2 flex items-center text-left text-text transition-colors duration-200"
                onClick={() => {
                  setIsMenuOpen(false);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  return (
    <div className="bg-background">
      <Suspense fallback={<div className="h-16" />}>
        <HeaderContent />
      </Suspense>
    </div>
  );
}
