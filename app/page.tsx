import { BookList } from "@/components/book-list";
import type { FormattedBook, FormattedRecommender } from "@/types";

async function getData() {
  const [books, recommenders] = await Promise.all([
    import('../public/data/books.json').then(m => m.default),
    import('../public/data/recommenders.json').then(m => m.default),
  ]);
  
  return {
    books: books as FormattedBook[],
    recommenders: recommenders as FormattedRecommender[],
  };
}

export default async function Home() {
  const { books, recommenders } = await getData();

  return (
    <BookList
      initialBooks={books}
      initialRecommenders={recommenders}
    />
  );
}
