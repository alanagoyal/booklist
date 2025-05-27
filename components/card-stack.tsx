import { Book } from "@/types";
import { BookOpen, Tag, User, Link } from "lucide-react";
import { useState } from "react";

interface CardStackProps {
  recommendations: Array<Book & {
    score: number;
    subtitle?: string;
    genres?: string[] | string;
    amazon_url?: string;
    match_reasons: {
      similar_to_favorites: boolean;
      recommended_by_inspiration: boolean;
      recommended_by_similar_people: boolean;
      genre_match: boolean;
      recommended_by_similar_type: boolean;
    };
  }>;
  userType: string | null;
  onBookClick?: (id: string) => void;
}

export function CardStack({ recommendations, userType, onBookClick }: CardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % recommendations.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + recommendations.length) % recommendations.length);
  };

  return (
    <div className="relative h-[500px] w-full">
      {recommendations.map((book, index) => {
        // Calculate relative position from current index
        const position = (index - currentIndex + recommendations.length) % recommendations.length;
        const isActive = position === 0;
        const isNext = position <= 2; // Only show next 2 cards

        if (!isNext) return null;

        // Reverse the order so larger cards are behind
        const zIndex = 30 - position;
        
        return (
          <div
            key={book.id}
            className={`absolute inset-x-0 top-0 transition-all duration-500`}
            style={{
              zIndex,
              transform: `translateY(${position * 20}px) scale(${1 - position * 0.05})`,
              height: '100%', // Show only top portion of cards behind
            }}
          >
            <div className="bg-background border border-border h-full w-full p-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <h1 onClick={() => onBookClick?.(book.id)} className="text-xl font-base text-text mb-1 cursor-pointer md:hover:underline transition-colors duration-200">{book.title}</h1>
                  <p className="text-muted-foreground text-base">{book.author}</p>
                </div>

                {book.subtitle && (
                  <h2 className="text-base text-muted-foreground">
                    {book.subtitle}
                  </h2>
                )}

                {/* Book metadata */}
                <div className="flex justify-between items-center text-sm">
                  {book.genres && (
                    <div className="flex items-center gap-2 text-text">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {Array.isArray(book.genres)
                          ? book.genres.join(", ")
                          : book.genres}
                      </span>
                    </div>
                  )}
                  {book.amazon_url && (
                    <div className="flex items-center gap-2">
                      <Link className="w-4 h-4 text-muted-foreground" />
                      <a
                        href={book.amazon_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text transition-colors duration-200 hover:underline"
                      >
                        View on Amazon
                      </a>
                    </div>
                  )}
                </div>

                <p className="text-sm text-text whitespace-pre-line leading-relaxed line-clamp-4">
                  {book.description}
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm text-text font-bold">
                  Why we recommend this
                </h2>
                <div className="space-y-1.5">
                  {book.match_reasons.similar_to_favorites && (
                    <div className="flex items-start gap-2 bg-accent/50 p-1.5">
                      <BookOpen className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-text">
                        Similar to your favorite books
                      </span>
                    </div>
                  )}
                  {book.match_reasons.recommended_by_inspiration && (
                    <div className="flex items-start gap-2 bg-accent/50 p-1.5">
                      <User className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-text">
                        Recommended by people who inspire you
                      </span>
                    </div>
                  )}
                  {book.match_reasons.recommended_by_similar_people && (
                    <div className="flex items-start gap-2 bg-accent/50 p-1.5">
                      <User className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-text">
                        Recommended by people similar to your inspirations
                      </span>
                    </div>
                  )}
                  {book.match_reasons.genre_match && (
                    <div className="flex items-start gap-2 bg-accent/50 p-1.5">
                      <Tag className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-text">
                        Matches your preferred genres
                      </span>
                    </div>
                  )}
                  {book.match_reasons.recommended_by_similar_type && (
                    <div className="flex items-start gap-2 bg-accent/50 p-1.5">
                      <User className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-text">
                        Popular among {userType}s
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="absolute bottom-4 left-0 right-0 flex justify-between px-6 z-40">
        <button
          onClick={handlePrev}
          className="bg-background text-text px-4 py-2 border border-border transition-colors duration-200 md:hover:bg-accent/50"
        >
          Previous
        </button>
        <div className="text-center text-muted-foreground">
          {currentIndex + 1} of {recommendations.length}
        </div>
        <button
          onClick={handleNext}
          className="bg-background text-text px-4 py-2 border border-border transition-colors duration-200 md:hover:bg-accent/50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
