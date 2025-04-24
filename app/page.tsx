"use client";

import { BookList } from "@/components/book-list";
import type { EssentialBook, ExtendedBook, FormattedBook, FormattedRecommender } from "@/types";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());
const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000";

export default function Home() {
  const { data: essentialBooks, error: essentialError } = useSWR<EssentialBook[]>(
    `${baseUrl}/data/books-essential.json`,
    fetcher
  );
  const { data: recommenders, error: recommendersError } = useSWR<FormattedRecommender[]>(
    `${baseUrl}/data/recommenders.json`,
    fetcher
  );
  const { data: extendedData } = useSWR<ExtendedBook[]>(
    essentialBooks ? `${baseUrl}/data/books-extended.json` : null,
    fetcher
  );

  const books = essentialBooks?.map(book => {
    const extended = extendedData?.find(e => e.id === book.id);
    return {
      ...book,
      ...(extended || { related_books: [], similar_books: [] })
    };
  });

  if (!books || !recommenders) {
    return null;
  }

  return (
    <BookList
      initialBooks={books}
      initialRecommenders={recommenders}
    />
  );
}
