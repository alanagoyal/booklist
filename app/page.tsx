import { BookList } from "@/components/book-list";
import type { FormattedBook, FormattedRecommender } from "@/types";

// Force static generation
export const dynamic = "force-static";

// Load data from public JSON files at build time
async function getData(): Promise<[FormattedBook[], FormattedRecommender[]]> {
  // In production, these files will be available at /data/
  const books: FormattedBook[] = await fetch(
    new URL('../public/data/books.json', import.meta.url)
  ).then(res => res.json());
  
  const recommenders: FormattedRecommender[] = await fetch(
    new URL('../public/data/recommenders.json', import.meta.url)
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
