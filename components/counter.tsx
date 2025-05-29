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

// Color legend data with percentile ranges
const legendData = [
  { bucket: 0, range: '0-50th percentile', color: 'bg-[hsl(151,80%,95%)] dark:bg-[hsl(160,84%,5%)]' },
  { bucket: 1, range: '50-80th percentile', color: 'bg-[hsl(151,80%,90%)] dark:bg-[hsl(160,84%,9%)]' },
  { bucket: 2, range: '80-90th percentile', color: 'bg-[hsl(151,80%,85%)] dark:bg-[hsl(160,84%,13%)]' },
  { bucket: 3, range: '90-95th percentile', color: 'bg-[hsl(151,80%,80%)] dark:bg-[hsl(160,84%,17%)]' },
  { bucket: 4, range: '95-98th percentile', color: 'bg-[hsl(151,80%,75%)] dark:bg-[hsl(160,84%,21%)]' },
  { bucket: 5, range: '98-99th percentile', color: 'bg-[hsl(151,80%,70%)] dark:bg-[hsl(160,84%,25%)]' },
];

// Color legend component
function ColorLegend() {
  return (
    <div className="flex flex-col gap-1 text-xs">
      {legendData.map(({ bucket, range, color }) => (
        <div key={bucket} className="flex items-center gap-1">
          <div className={`w-3 h-3 ${color} border border-border`} />
          <span className="text-text/70">{range}</span>
        </div>
      ))}
    </div>
  );
}

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
    <>
      {/* Count in bottom-left corner */}
      <div className="fixed bottom-5 left-5 text-xs whitespace-pre-line transition-all duration-200 bg-background/80 backdrop-blur-sm p-2 selection:bg-main selection:text-mtext md:hover:bg-accent/50">
        <div className="text-text/70">{text}</div>
      </div>
      
      {/* Legend in bottom-right corner */}
      <div className="fixed bottom-5 right-5 text-xs transition-all duration-200 bg-background/80 backdrop-blur-sm p-2 selection:bg-main selection:text-mtext md:hover:bg-accent/50">
        <ColorLegend />
      </div>
    </>,
    document.body
  );
}