'use client';

import { useEffect, useState } from 'react';
import { BookGrid } from './books';
import { BookCount } from './book-count';
import { getCache, setCache } from '@/lib/cache';

interface Book {
  id: number;
  title: string;
  author: string;
  description: string;
  genres: string;
  recommender: string;
  source: string;
  source_link: string;
  url: string;
  amazon_url: string;
}

export function BookList({ initialBooks }: { initialBooks: Book[] }) {
  const [books, setBooks] = useState(initialBooks);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBooks = async () => {
      const cachedData = getCache();
      if (cachedData) {
        setBooks(cachedData.books);
      }
      setCache(initialBooks);
      setIsLoading(false);
    };

    loadBooks();
  }, [initialBooks]);

  return (
    <div className="relative min-h-screen">
      <BookGrid data={books} />
      <div className="fixed bottom-4 right-4 text-[#121212/70] dark:text-[#D4C4A3/70] transition-colors duration-200">
        {isLoading ? "Loading books..." : `${books.length} books`}
      </div>
    </div>
  );
}
