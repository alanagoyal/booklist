'use client';

import { BookGrid } from './books';

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
  return (
    <div className="relative min-h-screen">
      <BookGrid data={initialBooks} />
      <div className="fixed bottom-4 right-4 text-[#121212/70] dark:text-[#d0fbed/70] transition-colors duration-200">
        {`${initialBooks.length} books`}
      </div>
    </div>
  );
}
