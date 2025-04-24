"use client";

import { BookList } from "@/components/book-list";
import type { EssentialBook, ExtendedBook, FormattedBook, FormattedRecommender } from "@/types";
import { useEffect, useState } from "react";

export default function Home() {
  const [books, setBooks] = useState<FormattedBook[]>([]);
  const [recommenders, setRecommenders] = useState<FormattedRecommender[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000";
        
        // Fetch essential data first (parallel)
        const [essentialRes, recommendersRes] = await Promise.all([
          fetch(`${baseUrl}/data/books-essential.json`),
          fetch(`${baseUrl}/data/recommenders.json`)
        ]);

        if (!essentialRes.ok) throw new Error(`Failed to fetch books: ${essentialRes.statusText}`);
        if (!recommendersRes.ok) throw new Error(`Failed to fetch recommenders: ${recommendersRes.statusText}`);

        const essentialBooks: EssentialBook[] = await essentialRes.json();
        const recommendersData: FormattedRecommender[] = await recommendersRes.json();

        // Set initial data with empty arrays for extended fields
        setBooks(essentialBooks.map(book => ({
          ...book,
          related_books: [],
          similar_books: []
        })));
        setRecommenders(recommendersData);
        setIsLoading(false);

        // Load extended data in background
        const extendedRes = await fetch(`${baseUrl}/data/books-extended.json`);
        if (!extendedRes.ok) throw new Error(`Failed to fetch extended data: ${extendedRes.statusText}`);
        
        const extendedData: ExtendedBook[] = await extendedRes.json();

        // Merge extended data with books
        setBooks(books => 
          books.map(book => {
            const extended = extendedData.find(e => e.id === book.id);
            return extended ? { ...book, ...extended } : book;
          })
        );
      } catch (error) {
        console.error('Error fetching data:', error);
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
