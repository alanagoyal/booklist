import {
  X,
  BookOpen,
  Tag,
  ChevronLeft,
  User,
  Link,
} from "lucide-react";
import { FormattedBook } from "@/types";
import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type BookDetailProps = {
  book: FormattedBook;
  onClose?: () => void;
  stackIndex?: number;
};


export default function BookDetail({
  book,
  onClose,
  stackIndex = 0,
}: BookDetailProps) {
  const [showAllRecommenders, setShowAllRecommenders] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose?.();
      }
    },
    [onClose]
  );

  const handleEntityClick = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("key", `${id}--${Date.now()}`);
    router.push(`?${params.toString()}`, { scroll: false });
  };


  return (
    <div
      className="fixed inset-0 z-20 bg-background/80"
      onClick={handleBackdropClick}
      style={{
        backgroundColor:
          stackIndex === 0 ? "rgba(var(--background), 0.8)" : "transparent",
      }}
    >
      <div
        className="absolute right-0 top-0 bottom-0 w-full md:w-1/2 bg-background border-border md:border-l"
        style={{
          boxShadow: stackIndex > 0 ? "0 0 20px rgba(0, 0, 0, 0.1)" : "none",
        }}
      >
        <div className="overflow-auto h-full">
          <div className="sticky top-0 bg-background pt-8 px-12 md:pt-16">
            <button
              onClick={onClose}
              className="absolute top-8 left-4 md:hidden text-text/70 transition-colors duration-200 md:hover:text-text"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 hidden md:block text-text/70 transition-colors duration-200 md:hover:text-text"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2 pb-8">
              <h1 className="text-2xl font-base text-text">{book.title}</h1>
              <p className="text-text/70 text-lg">{book.author}</p>

              {/* Book metadata */}
              <div className="flex justify-between items-center pt-4">
                {book.genres && (
                  <div className="flex items-center gap-2 text-text">
                    <Tag className="w-4 h-4 text-text/70" />
                    <span>
                      {Array.isArray(book.genres)
                        ? book.genres.join(", ")
                        : book.genres}
                    </span>
                  </div>
                )}
                {book.amazon_url && (
                  <div className="flex items-center gap-2">
                    <Link className="w-4 h-4 text-text/70" />
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
            </div>
          </div>

          <div className="px-12 pb-16">
            <div className="space-y-8">
              {/* Book description */}
              {book.description && (
                <div className="space-y-2">
                  <h2 className="text-base text-text font-bold">About</h2>
                  <p className="text-text whitespace-pre-line leading-relaxed">
                    {book.description}
                  </p>
                </div>
              )}

              {/* Book recommenders */}
              {book.recommendations && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base text-text font-bold">
                      Recommenders
                    </h2>
                  </div>
                  <div className="text-text space-y-4">
                    {book.recommendations
                      .slice(0, showAllRecommenders ? undefined : 3)
                      .map((rec) => (
                        <div
                          key={rec.recommender?.id}
                          className="flex items-start gap-3 bg-accent/50 p-2 cursor-pointer transition-colors duration-200 border-l-2 border-transparent md:hover:bg-accent md:hover:border-border"
                          onClick={() =>
                            handleEntityClick(rec.recommender?.id || "")
                          }
                        >
                          <User className="w-5 h-5 mt-0.5 text-text/70 shrink-0" />
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-text">
                                <button
                                  onClick={() =>
                                    handleEntityClick(rec.recommender?.id || "")
                                  }
                                  className="text-text text-left font-base md:hover:underline transition-colors duration-200"
                                >
                                  {rec.recommender?.full_name}
                                </button>
                                {rec.source && (
                                  <span className="text-text/70">
                                    {" "}
                                    via{" "}
                                    {rec.source_link ? (
                                      <a
                                        href={rec.source_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="md:hover:underline"
                                      >
                                        {rec.source}
                                      </a>
                                    ) : (
                                      rec.source
                                    )}
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="text-sm text-text/70">
                              {rec.recommender?.type}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  {book.recommendations.length > 3 && (
                    <button
                      onClick={() =>
                        setShowAllRecommenders(!showAllRecommenders)
                      }
                      className="w-full p-2 text-text/70 transition-colors duration-200 md:hover:text-text md:hover:underline"
                    >
                      {showAllRecommenders
                        ? "Show less"
                        : `Show ${book.recommendations.length - 3} more`}
                    </button>
                  )}
                </div>
              )}

              {/* Book suggestions */}
              {book.related_books.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-base text-text font-bold">
                    Similar Recommendations
                  </h2>
                  <div className="space-y-4">
                    {book.related_books.map((relatedBook) => (
                      <div
                        key={relatedBook.id}
                        className="flex items-start gap-3 bg-accent/50 p-2 cursor-pointer transition-colors duration-200 border-l-2 border-transparent md:hover:bg-accent md:hover:border-border"
                        onClick={() => {
                          handleEntityClick(relatedBook.id);
                        }}
                      >
                        <BookOpen className="w-5 h-5 mt-0.5 text-text/70 shrink-0" />
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-text">
                              <button
                                onClick={() => {
                                  handleEntityClick(relatedBook.id);
                                }}
                                className="text-text text-left font-base md:hover:underline transition-colors duration-200"
                              >
                                {relatedBook.title}
                              </button>{" "}
                              by {relatedBook.author}
                            </span>
                          </div>
                          <div className="text-sm text-text/70">
                            {relatedBook._recommendationCount} recommendation
                            {relatedBook._recommendationCount !== 1 && "s"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
