"use client";

import { BookList } from "@/components/book-list";
import type { FormattedBook, FormattedRecommender } from "@/types";
import { useEffect, useState } from "react";

export default function Home() {
  const [books, setBooks] = useState<FormattedBook[]>([]);
  const [recommenders, setRecommenders] = useState<FormattedRecommender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const TOTAL_CHUNKS = 6;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000";
        
        // Fetch all chunks in parallel
        const chunkPromises = Array.from({ length: TOTAL_CHUNKS }, (_, i) => 
          fetch(`${baseUrl}/data/books-${i + 1}.json`)
            .then(res => {
              if (!res.ok) throw new Error(`Failed to fetch chunk ${i + 1}: ${res.statusText}`);
              return res.json();
            })
        );

        const recommendersPromise = fetch(`${baseUrl}/data/recommenders.json`)
          .then(res => {
            if (!res.ok) throw new Error(`Failed to fetch recommenders: ${res.statusText}`);
            return res.json();
          });

        // Wait for all data to load
        const [chunks, recommendersData] = await Promise.all([
          Promise.all(chunkPromises),
          recommendersPromise
        ]);

        // Combine all chunks
        const allBooks = chunks.flat();
        setBooks(allBooks);
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
