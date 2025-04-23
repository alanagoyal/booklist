import { BookList } from "@/components/book-list";
import type { FormattedBook, FormattedRecommender } from "@/types";
import books from '../data/books.json';
import recommenders from '../data/recommenders.json';

export default function Home() {
  return (
    <BookList
      initialBooks={books as FormattedBook[]}
      initialRecommenders={recommenders as FormattedRecommender[]}
    />
  );
}
