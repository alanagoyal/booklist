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
    <div className="h-full flex flex-col relative">
      <div className="flex-1 overflow-hidden">
        <BookGrid data={initialBooks} />
      </div>
      <div className="absolute bottom-4 right-4 text-text/70 transition-colors duration-200">
        {`${initialBooks.length} books`}
      </div>
    </div>
  );
}
