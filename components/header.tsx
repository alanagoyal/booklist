"use client";

import { useTheme } from "next-themes";
import Link from "next/link";

export default function Header() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="bg-background border-b">
      <div className="h-16 px-3 py-2 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-bold font-display text-xl cursor-pointer"
          >
            BOOKLIST
          </Link>
          <Link href="/about">About</Link>
          <Link href="/contribute">Contribute</Link>
        </div>
      </div>
    </div>
  );
}
