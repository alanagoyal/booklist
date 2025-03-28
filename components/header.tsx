"use client";

import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export default function Header() {
  return (
    <div className="bg-background border-b border-border">
      <div className="h-16 p-2 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="font-bold font-display text-xl cursor-pointer"
          >
            BOOKLIST
          </Link>
          <Link href="/about">About</Link>
          <Link href="/roulette">Roulette</Link>
          <Link href="/contribute">Contribute</Link>
        </div>
          <ThemeToggle />
      </div>
    </div>
  );
}
