"use client";

import { BookList } from "@/components/book-list";
import { GridSkeleton } from "@/components/grid-skeleton";
import type { EssentialBook, ExtendedBook, FormattedRecommender } from "@/types";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

const fetcher = (url: string) => fetch(url).then(r => r.json());

function HomeContent() {
  // read ?key search param so we can update OG image URLs
  const searchParams = useSearchParams();
  const key = searchParams.get("key");

  // stage-1: load small initial datasets so view renders quickly
  const { data: initialBooks } = useSWR<EssentialBook[]>(
    "/booklist/data/books-initial.json",
    fetcher
  );
  const { data: initialRecommenders } = useSWR<FormattedRecommender[]>(
    "/booklist/data/recommenders-initial.json",
    fetcher
  );

  // stage-2: load remaining essential data in the background
  const { data: allEssentialBooks } = useSWR<EssentialBook[]>(
    initialBooks ? "/booklist/data/books-essential.json" : null,
    fetcher
  );
  const { data: allRecommenders } = useSWR<FormattedRecommender[]>(
    initialRecommenders ? "/booklist/data/recommenders.json" : null,
    fetcher
  );

  // stage-3: load extended book data after we have at least initial books
  const { data: extendedData } = useSWR<ExtendedBook[]>(
    initialBooks ? "/booklist/data/books-extended.json" : null,
    fetcher
  );

  // prefer the full datasets when they arrive, otherwise fall back to initial batches
  const essentialBooks = allEssentialBooks || initialBooks;
  const recommenders = allRecommenders || initialRecommenders;

  // update open-graph + twitter card images when ?key changes
  useEffect(() => {
    const ogImageUrl = key
      ? `/booklist/api/og?key=${encodeURIComponent(key)}`
      : "/booklist/api/og";

    const ogImageMeta = document.querySelector(
      'meta[property="og:image"]'
    );
    const twitterImageMeta = document.querySelector(
      'meta[name="twitter:image"]'
    );

    if (ogImageMeta) ogImageMeta.setAttribute("content", ogImageUrl);
    if (twitterImageMeta) twitterImageMeta.setAttribute("content", ogImageUrl);
  }, [key]);

  // merge essential + extended data so BookList has consistent shape
  const books = essentialBooks?.map((book) => {
    const extended = extendedData?.find((e) => e.id === book.id);
    return {
      ...book,
      ...(extended || { related_books: [], similar_books: [] }),
    };
  });

  // show skeleton only until stage-1 data arrives
  if (!initialBooks || !initialRecommenders) {
    return <GridSkeleton />;
  }

  return (
    <BookList
      initialBooks={books || []}
      initialRecommenders={recommenders || []}
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
