"use client";

import { BookList } from "@/components/book-list";
import type { FormattedBook, FormattedRecommender } from "@/types";
import { useEffect, useState } from "react";

export default function Home() {
  const [books, setBooks] = useState<FormattedBook[]>([]);
  const [recommenders, setRecommenders] = useState<FormattedRecommender[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000";
        const [booksRes, recommendersRes] = await Promise.all([
          fetch(`${baseUrl}/data/books.json`),
          fetch(`${baseUrl}/data/recommenders.json`),
        ]);

        if (!booksRes.ok) throw new Error(`Failed to fetch books: ${booksRes.statusText}`);
        if (!recommendersRes.ok) throw new Error(`Failed to fetch recommenders: ${recommendersRes.statusText}`);

        const booksData: FormattedBook[] = await booksRes.json();
        const recommendersData: FormattedRecommender[] = await recommendersRes.json();

        setBooks(booksData);
        setRecommenders(recommendersData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <BookList
      initialBooks={books}
      initialRecommenders={recommenders}
    />
  );
}
