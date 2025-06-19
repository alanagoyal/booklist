"use client";

import { BookList } from "@/components/book-list";
import { GridSkeleton } from "@/components/grid-skeleton";
import type { EssentialBook, ExtendedBook, FormattedRecommender } from "@/types";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Home() {
  // Load initial 50 books first for fast page load
  const { data: initialBooks } = useSWR<EssentialBook[]>(
    "/booklist/data/books-initial.json",
    fetcher
  );
  
  // Load initial 50 recommenders first for fast page load
  const { data: initialRecommenders } = useSWR<FormattedRecommender[]>(
    "/booklist/data/recommenders-initial.json",
    fetcher
  );
  
  // Load remaining books after initial load
  const { data: allEssentialBooks } = useSWR<EssentialBook[]>(
    initialBooks ? "/booklist/data/books-essential.json" : null,
    fetcher
  );
  
  // Load full recommenders after initial load
  const { data: allRecommenders } = useSWR<FormattedRecommender[]>(
    initialRecommenders ? "/booklist/data/recommenders.json" : null,
    fetcher
  );
  
  // Load extended data after we have books
  const { data: extendedData } = useSWR<ExtendedBook[]>(
    initialBooks ? "/booklist/data/books-extended.json" : null,
    fetcher
  );

  // Use initial books for immediate display, fall back to all books when available
  const essentialBooks = allEssentialBooks || initialBooks;
  
  // Use initial recommenders for immediate display, fall back to all recommenders when available
  const recommenders = allRecommenders || initialRecommenders;
  
  const books = essentialBooks?.map(book => {
    const extended = extendedData?.find(e => e.id === book.id);
    return {
      ...book,
      ...(extended || { related_books: [], similar_books: [] })
    };
  });

  // Show skeleton only if we don't have initial data yet
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
