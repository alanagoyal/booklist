import { BookList } from "@/components/book-list";
import type { FormattedBook, FormattedRecommender } from "@/types";

// Force static generation
export const dynamic = "force-static";

// Load data from public JSON files at build time
async function getData(): Promise<[FormattedBook[], FormattedRecommender[]]> {
  // Use absolute paths from the public directory
  const books: FormattedBook[] = await fetch(
    '/data/books.json'
  ).then(res => res.json());
  
  const recommenders: FormattedRecommender[] = await fetch(
    '/data/recommenders.json'
  ).then(res => res.json());

  return [books, recommenders];
}

export default async function Home() {
  const [books, recommenders] = await getData();

  return (
    <main>
      <BookList initialBooks={books} initialRecommenders={recommenders} />
    </main>
  );
}
