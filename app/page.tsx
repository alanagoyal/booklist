import { BookList } from "@/components/book-list";
import type { FormattedBook, FormattedRecommender } from "@/types";

// Load data from JSON files at build time
async function getData(): Promise<[FormattedBook[], FormattedRecommender[]]> {
  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
  
  const [booksRes, recommendersRes] = await Promise.all([
    fetch(`${baseUrl}/data/books.json`),
    fetch(`${baseUrl}/data/recommenders.json`)
  ]);

  if (!booksRes.ok) throw new Error(`Failed to fetch books: ${booksRes.statusText}`);
  if (!recommendersRes.ok) throw new Error(`Failed to fetch recommenders: ${recommendersRes.statusText}`);

  const books: FormattedBook[] = await booksRes.json();
  const recommenders: FormattedRecommender[] = await recommendersRes.json();

  return [books, recommenders];
}

export default async function Home() {
  // These will only run at build time
  const [formattedBooks, formattedRecommenders] = await getData();

  return (
    <BookList
      initialBooks={formattedBooks}
      initialRecommenders={formattedRecommenders}
    />
  );
}
