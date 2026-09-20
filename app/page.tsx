"use client";

import { BookList } from "@/components/book-list";
import { GridSkeleton } from "@/components/grid-skeleton";
import type { EssentialBook, FormattedRecommender } from "@/types";
import useSWRImmutable from "swr/immutable";
import fetcher from "@/utils/fetcher";

export default function Home() {
  // These files are build-time snapshots. Load the complete lists once so
  // the scroll range and ordering stay fixed while browsing.
  const { data: books, error: booksError, mutate: retryBooks } = useSWRImmutable<EssentialBook[]>(
    "/booklist/data/books-essential.json",
    fetcher
  );
  
  const { data: recommenders, error: recommendersError, mutate: retryRecommenders } = useSWRImmutable<FormattedRecommender[]>(
    "/booklist/data/recommenders.json",
    fetcher
  );

  if (booksError || recommendersError) {
    return (
      <div role="alert" className="p-6 text-text">
        <p>Couldn’t load the booklist.</p>
        <button className="mt-2 underline" onClick={() => {
          void retryBooks();
          void retryRecommenders();
        }}>
          Try again
        </button>
      </div>
    );
  }

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
