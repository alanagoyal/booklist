"use client";

import { useState, useEffect } from "react";
import { Book } from "../types/book";

interface RouletteProps {
  initialBook: Book;
}

// Helper function to get recommendation count
const getRecommendationCount = (
  recommendations?: Book["recommendations"]
): number => {
  return recommendations?.length || 0;
};

export default function Roulette({ initialBook }: RouletteProps) {
  const [selectedBook, setSelectedBook] = useState<Book>(initialBook);
  const [isSpinning, setIsSpinning] = useState(true);  
  const [error, setError] = useState<string | null>(null);

  // Initial fade in with shorter delay
  useEffect(() => {
    setTimeout(() => {
      setSelectedBook(initialBook);
      setIsSpinning(false);
    }, 100);
  }, [initialBook]);

  const spinRoulette = async () => {
    setError(null);
    setIsSpinning(true);

    try {
      const response = await fetch("/api/random-book");
      if (!response.ok) {
        throw new Error("Failed to fetch random book");
      }
      const book = await response.json();
      // Add a small delay to allow the fade out animation to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      setSelectedBook(book);
    } catch (err) {
      setError("Failed to get a random book. Please try again.");
      console.error("Error fetching random book:", err);
    } finally {
      setIsSpinning(false);
    }
  };

  return (
    <>
      <div className="bg-background border border-border p-6 min-h-[30rem]">
        <div
          className={`transition-opacity duration-300 ${
            isSpinning ? "opacity-0" : "opacity-100"
          }`}
        >
          <h2 className="text-2xl font-bold mb-4 min-h-[2rem]">
            {selectedBook.title}
          </h2>
          <p className="text-text/70 mb-2 min-h-[1.5rem]">
            by {selectedBook.author}
          </p>
          <div className="mb-4 min-h-[3rem]">
            {selectedBook.description && (
              <p className="text-text whitespace-pre-line line-clamp-2">
                {selectedBook.description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-4 min-h-[2rem]">
            <div className="text-text/70">
              {selectedBook.genre.join(", ")}
            </div>
            <div className="text-text/70">
              {getRecommendationCount(selectedBook.recommendations)}{" "}
              {getRecommendationCount(selectedBook.recommendations) === 1
                ? "recommendation"
                : "recommendations"}
            </div>
            {selectedBook.amazon_url && (
              <a
                href={selectedBook.amazon_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text md:hover:text-text/70 transition-colors duration-200"
              >
                View on Amazon
              </a>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-border min-h-[10rem]">
            {selectedBook.recommendations &&
              selectedBook.recommendations.length > 0 && (
                <>
                  <h3 className="font-bold mb-2">Recommendations</h3>
                  <ul className="space-y-2">
                    {selectedBook.recommendations.map((rec, i) => (
                      <li key={i} className="text-text/70">
                        {rec.recommender_name || rec.source}
                        {rec.source_link && (
                          <a
                            href={rec.source_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-text md:hover:text-text/70 transition-colors duration-200"
                          >
                            (<span className="hover:underline">source</span>)
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={spinRoulette}
          disabled={isSpinning}
          className="w-full p-2 bg-background border border-border text-text transition-colors duration-200 md:hover:bg-accent/50 font-base"
        >
          {isSpinning ? "Finding a book..." : "Get Another Book"}
        </button>
      </div>

      {error && <p className="mt-4 text-red-500">{error}</p>}
    </>
  );
}
