"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

export default function Header() {
  const searchParams = useSearchParams();
  const currentParams = searchParams.toString();
  const homeHref = currentParams ? `/?${currentParams}` : "/";

  const getHrefWithParams = (path: string) => {
    return currentParams ? `${path}?${currentParams}` : path;
  };

  return (
    <div className="bg-background border-b border-border">
      <div className="h-16 p-2 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            href={homeHref}
            className="font-bold font-display text-xl cursor-pointer"
          >
            BOOKLIST
          </Link>
          <Link href={getHrefWithParams("/about")}>About</Link>
          <Link href={getHrefWithParams("/roulette")}>Roulette</Link>
          <Link href={getHrefWithParams("/contribute")}>Contribute</Link>
        </div>
          <ThemeToggle />
      </div>
    </div>
  );
}
