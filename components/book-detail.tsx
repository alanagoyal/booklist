import { ArrowLeft, X } from "lucide-react";
import { EnhancedBook } from "@/types";
import { useCallback } from "react";

type BookDetailProps = {
  book: EnhancedBook;
  onClose: () => void;
};

export default function BookDetail({ book, onClose }: BookDetailProps) {
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-20 bg-background/80" onClick={handleBackdropClick}>
      <div className="absolute right-0 top-0 bottom-0 w-full md:w-1/3 bg-background border-l border-border overflow-auto">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 md:hidden text-text/70 transition-colors duration-200 md:hover:text-text"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 hidden md:block text-text/70 transition-colors duration-200 md:hover:text-text"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="p-4 pt-16 md:pt-4 space-y-6">
          <div>
            <h1 className="text-xl font-base text-text">{book.title}</h1>
            <p className="text-text/70">{book.author}</p>
          </div>
          
          {book.description && (
            <div>
              <h2 className="text-sm text-text/70 mb-2">Description</h2>
              <p className="text-text whitespace-pre-line">{book.description}</p>
            </div>
          )}

          {book.genres && (
            <div>
              <h2 className="text-sm text-text/70 mb-2">Genres</h2>
              <p className="text-text">{book.genres}</p>
            </div>
          )}

          {book.recommenders && (
            <div>
              <h2 className="text-sm text-text/70 mb-2">Recommended by</h2>
              <div className="text-text whitespace-pre-line">
                {book.recommenders.split(",").map((recommender, i) => (
                  <span key={recommender}>
                    {i > 0 && ", "}
                    {recommender.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {book.amazon_url && (
            <div>
              <a
                href={book.amazon_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-text/70 transition-colors duration-200 md:hover:text-text underline"
              >
                View on Amazon
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}