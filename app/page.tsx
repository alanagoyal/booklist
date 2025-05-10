"use client";

import { BookList } from "@/components/book-list";
import type {
  EssentialBook,
  ExtendedBook,
  FormattedRecommender,
} from "@/types";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Home() {
  const { data: essentialBooks } = useSWR<EssentialBook[]>(
    `/data/books-essential.json`,
    fetcher
  );
  const { data: recommenders } = useSWR<FormattedRecommender[]>(
    `/data/recommenders.json`,
    fetcher
  );
  const { data: extendedData } = useSWR<ExtendedBook[]>(
    essentialBooks ? `/data/books-extended.json` : null,
    fetcher
  );

  const books = essentialBooks?.map((book) => {
    const extended = extendedData?.find((e) => e.id === book.id);
    return {
      ...book,
      ...(extended || { related_books: [], similar_books: [] }),
    };
  });

  if (!books || !recommenders) {
    return null;
  }

  return <BookList initialBooks={books} initialRecommenders={recommenders} />;
}
