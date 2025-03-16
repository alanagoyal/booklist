'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// Global event for updating book counts
const BOOK_COUNT_UPDATE = 'BOOK_COUNT_UPDATE';

type BookCountEvent = {
  total: number;
  filtered: number;
};

// Singleton pattern for book count updates
export const bookCountManager = {
  _lastUpdate: { total: 0, filtered: 0 },
  update(total: number, filtered: number) {
    this._lastUpdate = { total, filtered };
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent<BookCountEvent>(BOOK_COUNT_UPDATE, {
          detail: { total, filtered }
        })
      );
    }
  },
  getLastUpdate() {
    return this._lastUpdate;
  }
};

// Loading state component following our established styling patterns
export function LoadingState() {
  return (
    <div className="fixed bottom-5 right-5 text-text/70 whitespace-pre-line transition-all duration-200 bg-background/80 backdrop-blur-sm p-2 selection:bg-main selection:text-mtext">
      Loading...
    </div>
  );
}

interface BookCounterProps {
  total: number;
  filtered: number;
}

export function BookCounter({ total, filtered }: BookCounterProps) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only show on home page
  if (!mounted || !isHomePage) return null;

  return createPortal(
    <div className="fixed bottom-5 right-5 text-text/70 text-xs whitespace-pre-line transition-all duration-200 bg-background/80 backdrop-blur-sm p-2 selection:bg-main selection:text-mtext md:hover:bg-accent/50">
      {filtered === total 
        ? `${total} books`
        : `${filtered} of ${total} books`}
    </div>,
    document.body
  );
}
