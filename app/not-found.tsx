'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function NotFoundContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '';

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-text/70 text-center mb-8">
        {from ? `The page "${from}" could not be found.` : 'The requested page could not be found'}
      </p>
      <Link
        href="/"
        className="px-4 py-2 transition-colors duration-200 md:hover:bg-accent/50 border border-border"
      >
        Return Home
      </Link>
    </div>
  );
}

export default function NotFound() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p>Loading...</p>
      </div>
    }>
      <NotFoundContent />
    </Suspense>
  );
}
