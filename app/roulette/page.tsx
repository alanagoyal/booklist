import { getBooks } from "../../lib/books";
import Roulette from "@/components/roulette";
import { Book } from "@/types/book";

function getRandomBook(books: Book[]): Book {
  const randomIndex = Math.floor(Math.random() * books.length);
  return books[randomIndex];
}

export default async function RoulettePage() {
  const books = await getBooks();
  
  // Add console log to check books data
  console.log('Books loaded:', books?.length || 0);
  
  if (!books || books.length === 0) {
    return (
      <main className="h-[calc(100dvh-4rem)] overflow-y-auto p-8">
        <div className="text-text">No books found. Please try again later.</div>
      </main>
    );
  }
  
  const initialBook = getRandomBook(books);
  
  return (
    <main className="h-[calc(100dvh-4rem)] overflow-y-auto">
      <Roulette books={books} initialBook={initialBook} />
    </main>
  );
}
