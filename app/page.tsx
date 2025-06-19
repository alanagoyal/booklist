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
  
  // Load recommenders in parallel
  const { data: recommenders } = useSWR<FormattedRecommender[]>(
    "/booklist/data/recommenders.json",
    fetcher
  );
  
  // Load remaining books after initial load
  const { data: allEssentialBooks } = useSWR<EssentialBook[]>(
    initialBooks ? "/booklist/data/books-essential.json" : null,
    fetcher
  );
  
  // Load extended data after we have books
  const { data: extendedData } = useSWR<ExtendedBook[]>(
    initialBooks ? "/booklist/data/books-extended.json" : null,
    fetcher
  );

  // Use initial books for immediate display, fall back to all books when available
  const essentialBooks = allEssentialBooks || initialBooks;
  
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
