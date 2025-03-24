import { getRandomBook } from "../../lib/books";
import Roulette from "@/components/roulette";

export default async function RoulettePage() {
  const initialBook = await getRandomBook();
  
  if (!initialBook) {
    return (
      <main className="h-[calc(100dvh-4rem)] overflow-y-auto p-8">
        <div className="text-text">No books found. Please try again later.</div>
      </main>
    );
  }
  
  return (
    <main className="h-[calc(100dvh-4rem)] overflow-y-auto">
      <Roulette initialBook={initialBook} />
    </main>
  );
}
