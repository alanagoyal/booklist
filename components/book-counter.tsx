'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// Global state manager for book counts
export const bookCountManager = {
  _lastUpdate: 0,
  _callbacks: new Set<() => void>(),

  addCallback(callback: () => void) {
    this._callbacks.add(callback);
    return () => {
      this._callbacks.delete(callback);
    };
  },

  updateCount() {
    this._lastUpdate = Date.now();
    this._callbacks.forEach((callback) => callback());
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
  viewMode?: 'books' | 'recommenders';
}

export function BookCounter({ total, filtered, viewMode = 'books' }: BookCounterProps) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only show on home page
  if (!mounted || !isHomePage) return null;

  const text = viewMode === 'books'
    ? filtered === total 
      ? `${total} books`
      : `${filtered} of ${total} books`
    : filtered === total
      ? `${total} recommenders`
      : `${filtered} of ${total} recommenders`;

  return createPortal(
    <div className="fixed bottom-5 right-5 text-text/70 text-xs whitespace-pre-line transition-all duration-200 bg-background/80 backdrop-blur-sm p-2 selection:bg-main selection:text-mtext md:hover:bg-accent/50">
      {text}
    </div>,
    document.body
  );
}
