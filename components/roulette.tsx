"use client";

import { useState, useEffect } from "react";
import { Book } from "../types/book";

interface RouletteProps {
  initialBook: Book;
}

// Helper function to get recommendation count
const getRecommendationCount = (recommendations?: Book['recommendations']): number => {
  return recommendations?.length || 0;
};

export default function Roulette({ initialBook }: RouletteProps) {
  const [selectedBook, setSelectedBook] = useState<Book>(initialBook);
  const [isSpinning, setIsSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spinRoulette = async () => {
    setError(null);
    setIsSpinning(true);
    
    try {
      const response = await fetch('/api/random-book');
      if (!response.ok) {
        throw new Error('Failed to fetch random book');
      }
      const book = await response.json();
      setSelectedBook(book);
    } catch (err) {
      setError('Failed to get a random book. Please try again.');
      console.error('Error fetching random book:', err);
    } finally {
      setIsSpinning(false);
    }
  };

  if (!selectedBook) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-text">
        {error || 'No book selected'}
      </div>
    );
  }

  return (
    <div className="p-6 overflow-auto h-[calc(100dvh-4rem)]">
      <div className="max-w-2xl mx-auto space-y-6">
        {error && (
          <div className="text-text/70 text-center">{error}</div>
        )}

        {isSpinning ? (
          <div className="bg-background border border-border p-6 text-center text-text/70">
            Finding a book...
          </div>
        ) : selectedBook && (
          <div className="bg-background border border-border p-6 transition-all duration-200">
            <h2 className="text-2xl font-bold mb-4">{selectedBook.title}</h2>
            <p className="text-text/70 mb-2">by {selectedBook.author}</p>
            {selectedBook.description && (
              <p className="whitespace-pre-line mb-4">{selectedBook.description}</p>
            )}
            <div className="flex flex-wrap gap-4">
              <div className="text-text/70">
                {selectedBook.genre.join(", ")}
              </div>
              <div className="text-text/70">
                {getRecommendationCount(selectedBook.recommendations)} {getRecommendationCount(selectedBook.recommendations) === 1 ? 'recommendation' : 'recommendations'}
              </div>
              {selectedBook.amazon_url && (
                <a 
                  href={selectedBook.amazon_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text hover:text-text/70 hover:underline transition-colors duration-200"
                >
                  View on Amazon
                </a>
              )}
            </div>
            {selectedBook.recommendations && selectedBook.recommendations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <h3 className="font-bold mb-2">Recommendations</h3>
                <ul className="space-y-2">
                  {selectedBook.recommendations?.map((rec, i) => (
                    <li key={i} className="text-text/70">
                      {rec.recommender_name || rec.source}
                      {rec.source_link && (
                        <a 
                          href={rec.source_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-text hover:text-text/70 transition-colors duration-200"
                        >
                          (<span className="hover:underline">source</span>)
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!isSpinning && (
          <button
            onClick={spinRoulette}
            disabled={isSpinning}
            className="w-full p-2 bg-background border border-border text-text transition-colors duration-200 md:hover:bg-accent/50 font-base"
          >
            {isSpinning ? "Finding a book..." : "Get Another Book"}
          </button>
        )}
      </div>
    </div>
  );
}
