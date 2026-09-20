'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

// Color legend data with percentile ranges
const legendData = [
  { bucket: 0, range: '0-50th percentile', color: 'bg-[hsl(var(--background-l1))]' },
  { bucket: 1, range: '50-80th percentile', color: 'bg-[hsl(var(--background-l2))]' },
  { bucket: 2, range: '80-90th percentile', color: 'bg-[hsl(var(--background-l3))]' },
  { bucket: 3, range: '90-95th percentile', color: 'bg-[hsl(var(--background-l4))]' },
  { bucket: 4, range: '95-98th percentile', color: 'bg-[hsl(var(--background-l5))]' },
  { bucket: 5, range: '98-99th percentile', color: 'bg-[hsl(var(--background-l6))]' },
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
  filteredCount: number;
  viewMode?: 'books' | 'people';
}

export function Counter({ total, filteredCount, viewMode = 'books' }: CounterProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

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