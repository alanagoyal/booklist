import { getRandomBook } from "../../lib/books";
import Roulette from "@/components/roulette";

export default async function RoulettePage() {
  const initialBook = await getRandomBook();
  
  if (!initialBook) {
    return (
      <div className="h-full p-4 bg-background text-text overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <div className="text-text">No books found. Please try again later.</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full p-4 bg-background text-text overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <Roulette initialBook={initialBook} />
      </div>
    </div>
  );
}
