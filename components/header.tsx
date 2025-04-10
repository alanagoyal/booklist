"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { useState } from "react";
import AboutDialog from "./about-dialog";

function HeaderContent() {
  const searchParams = useSearchParams();
  const currentParams = searchParams.toString();
  const homeHref = currentParams ? `/?${currentParams}` : "/";
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  return (
    <div className="h-16 flex justify-between items-center">
      <div className="px-3">
        <Link
          href={homeHref}
          className="font-bold text-xl text-text transition-colors duration-200"
        >
          BOOKLIST
        </Link>
      </div>
      <div className="flex items-center gap-4 px-3">
        <button
          onClick={() => setIsAboutOpen(true)}
          className="text-text/70 transition-colors duration-200 md:hover:text-text"
        >
          About
        </button>
        <ThemeToggle className="min-w-[48px] p-2 h-10 md:hover:text-text text-text/70" />
      </div>
      <AboutDialog open={isAboutOpen} onOpenChange={setIsAboutOpen} />
    </div>
  );
}

export default function Header() {
  return (
    <div className="bg-background border-b border-border">
      <HeaderContent />
    </div>
  );
}
