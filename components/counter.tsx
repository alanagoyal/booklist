'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// Global state manager for counts
export const countManager = {
  _lastUpdate: 0,
  _callbacks: new Set<() => void>(),
  _filteredCount: {
    books: 0,
    people: 0,
  },

  addCallback(callback: () => void) {
    this._callbacks.add(callback);
    return () => {
      this._callbacks.delete(callback);
    };
  },

  updateCount(viewMode: 'books' | 'people', filteredCount: number) {
    this._filteredCount[viewMode] = filteredCount;
    this._lastUpdate = Date.now();
    this._callbacks.forEach((callback) => callback());
  },

  getLastUpdate() {
    return this._lastUpdate;
  },

  getFilteredCount(viewMode: 'books' | 'people') {
    return this._filteredCount[viewMode];
  }
};

// Loading state component following our established styling patterns
export function LoadingState() {
  return (
    <div className="fixed bottom-5 right-5 text-muted-foreground whitespace-pre-line transition-all duration-200 bg-background/80 backdrop-blur-sm p-2 selection:bg-main selection:text-mtext">
      Loading...
    </div>
  );
}

interface CounterProps {
  total: number;
  viewMode?: 'books' | 'people';
}

export function Counter({ total, viewMode = 'books' }: CounterProps) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const [filteredCount, setFilteredCount] = useState(total);

  useEffect(() => {
    setMounted(true);
    const cleanup = countManager.addCallback(() => {
      setFilteredCount(countManager.getFilteredCount(viewMode));
    });
    return cleanup;
  }, [viewMode]);

  // Reset filtered count when view mode changes
  useEffect(() => {
    setFilteredCount(countManager.getFilteredCount(viewMode));
  }, [viewMode]);

  // Only show on home page
  if (!mounted || !isHomePage) return null;

  const text = viewMode === 'books'
    ? filteredCount === total 
      ? `${total} books`
      : `${filteredCount} of ${total} books`
    : filteredCount === total
      ? `${total} people`
      : `${filteredCount} of ${total} people`;

  return createPortal(
    <div className="fixed bottom-5 right-5 text-muted-foreground text-xs whitespace-pre-line transition-all duration-200 bg-background/80 backdrop-blur-sm p-2 selection:bg-main selection:text-mtext md:hover:bg-accent/50">
      {text}
    </div>,
    document.body
  );
}