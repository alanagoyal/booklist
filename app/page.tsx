import { BookList } from "@/components/book-list";
import type { FormattedBook, FormattedRecommender } from "@/types";
import path from 'path';
import fs from 'fs';

// Load data from JSON files at build time
async function getData(): Promise<[FormattedBook[], FormattedRecommender[]]> {
  const dataDir = path.join(process.cwd(), 'data');
  
  const books: FormattedBook[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'books.json'), 'utf-8')
  );
  
  const recommenders: FormattedRecommender[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'recommenders.json'), 'utf-8')
  );

  return [books, recommenders];
}

export default async function Home() {
  // These will only run at build time with the configuration above
  const [formattedBooks, formattedRecommenders] = await getData();

  return (
    <BookList
      initialBooks={formattedBooks}
      initialRecommenders={formattedRecommenders}
    />
  );
}
