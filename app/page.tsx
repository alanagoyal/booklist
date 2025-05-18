"use client";

import { BookList } from "@/components/book-list";
import { GridSkeleton } from "@/components/grid-skeleton";
import type { EssentialBook, ExtendedBook, FormattedRecommender } from "@/types";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const text = await response.text();
  console.log('Raw JSON:', text.slice(0, 200)); // Show first 200 chars
  const data = JSON.parse(text);
  console.log('Parsed data first item keys:', Object.keys(data[0] || {}));
  return data;
};
const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000";

export default function Home() {
  const { data: essentialBooks } = useSWR<EssentialBook[]>(
    `${baseUrl}/data/books-essential.json`,
    fetcher
  );
  const { data: recommenders } = useSWR<FormattedRecommender[]>(
    `${baseUrl}/data/recommenders.json`,
    fetcher
  );
  const { data: extendedData } = useSWR<ExtendedBook[]>(
    essentialBooks ? `${baseUrl}/data/books-extended.json` : null,
    fetcher
  );

  const books = essentialBooks?.map(book => {
    const extended = extendedData?.find(e => e.id === book.id);
    // Only merge specific properties from extended to avoid overwriting essential data
    return {
      ...book,
      related_books: extended?.related_books || [],
      similar_books: extended?.similar_books || []
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
