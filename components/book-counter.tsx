'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BookOpen, User } from 'lucide-react'; 

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
  toggleViewMode?: () => void;
}

export function BookCounter({ total, filtered, viewMode = 'books', toggleViewMode }: BookCounterProps) {
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
    <div className="fixed bottom-5 right-5 flex items-center gap-3 text-text/70 text-xs whitespace-pre-line transition-all duration-200 bg-background/80 backdrop-blur-sm p-3 selection:bg-main selection:text-mtext">
      {toggleViewMode && (
        <div className="flex items-center gap-3">
          <span className="text-sm">
            {viewMode === "books" ? `Showing ${text}` : `Showing ${text}`}
          </span>
          <button 
            onClick={toggleViewMode}
            title={viewMode === "books" ? "Click to view by recommender" : "Click to view by book"}
            className="relative flex items-center h-6 w-12 cursor-pointer"
          >
            <div className="absolute inset-0 border border-border bg-background transition-colors duration-200"></div>
            <div 
              className={`absolute h-6 w-6 flex items-center justify-center transition-all duration-200 border-r border-border ${
                viewMode === "books" ? "left-0" : "left-6"
              }`}
            >
              <div className="absolute inset-0 md:hover:bg-accent/50 transition-colors duration-200"></div>
              {viewMode === "books" ? (
                <BookOpen size={14} className="relative z-10 text-text/70" />
              ) : (
                <User size={14} className="relative z-10 text-text/70" />
              )}
            </div>
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}
