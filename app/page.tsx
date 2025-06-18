"use client";

import { BookList } from "@/components/book-list";
import { GridSkeleton } from "@/components/grid-skeleton";
import type { EssentialBook, ExtendedBook, FormattedRecommender } from "@/types";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

const fetcher = (url: string) => fetch(url).then(r => r.json());

function HomeContent() {
  const searchParams = useSearchParams();
  const key = searchParams.get('key');

  const { data: essentialBooks } = useSWR<EssentialBook[]>(
    "/booklist/data/books-essential.json",
    fetcher
  );
  const { data: recommenders } = useSWR<FormattedRecommender[]>(
    "/booklist/data/recommenders.json",
    fetcher
  );
  const { data: extendedData } = useSWR<ExtendedBook[]>(
    essentialBooks ? "/booklist/data/books-extended.json" : null,
    fetcher
  );

  // Update OG image meta tags dynamically
  useEffect(() => {
    const ogImageUrl = key 
      ? `/booklist/api/og?key=${encodeURIComponent(key)}`
      : "/booklist/api/og";

    // Update existing meta tags
    const ogImageMeta = document.querySelector('meta[property="og:image"]');
    const twitterImageMeta = document.querySelector('meta[name="twitter:image"]');
    
    if (ogImageMeta) {
      ogImageMeta.setAttribute('content', ogImageUrl);
    }
    if (twitterImageMeta) {
      twitterImageMeta.setAttribute('content', ogImageUrl);
    }
  }, [key]);

  const books = essentialBooks?.map(book => {
    const extended = extendedData?.find(e => e.id === book.id);
    return {
      ...book,
      ...(extended || { related_books: [], similar_books: [] })
    };
  });

  // Return a skeleton loader rather than a simple loading message
  if (!books || !recommenders) {
    return <GridSkeleton />;
  }

  return (
    <BookList
      initialBooks={books}
      initialRecommenders={recommenders}
    />
  );
}

export default function Home() {
  return (
    <Suspense fallback={<GridSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}
