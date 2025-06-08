import { X, BookOpen, Tag, ChevronLeft, User, Link } from "lucide-react";
import { FormattedBook } from "@/types";
import { useCallback, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

type BookDetailProps = {
  book: FormattedBook;
  onClose?: () => void;
  onBackdropClick?: () => void;
  isHovered?: boolean;
  isTopIndex?: boolean;
  isNavigating?: boolean;
};

export default function BookDetail({
  book,
  onClose,
  onBackdropClick,
  isHovered = false,
  isTopIndex = false,
  isNavigating = false
}: BookDetailProps) {
  const [showAllRecommenders, setShowAllRecommenders] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onBackdropClick?.();
      }
    },
    [onBackdropClick]
  );

  const handleEntityClick = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("key", `${id}--${Date.now()}`);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div
      className="fixed inset-0 z-20 bg-transparent"
      onClick={handleBackdropClick}
    >
      <div
        className={`absolute right-0 top-0 bottom-0 w-full md:w-1/2 ${
          isHovered ? "bg-accent" : "bg-background"
        } border-border md:border-l ${
          isNavigating ? "" : "transition-colors duration-300 ease-in-out"
        }`}
      >
        {isTopIndex && <div className="overflow-auto h-full">
          <div className="sticky top-0 bg-background pt-8 px-12 md:pt-16">
            <button
              onClick={onClose}
              className="absolute top-8 left-4 md:hidden text-muted-foreground transition-colors duration-200 md:hover:text-text"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 hidden md:block text-muted-foreground transition-colors duration-200 md:hover:text-text"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2 pb-8">
              <h1 className="text-2xl font-base text-text">{book.title}</h1>
              <p className="text-muted-foreground text-lg">{book.author}</p>

              {/* Book metadata */}
              <div className="flex justify-between items-center pt-4">
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
            </div>
          </div>

          <div className="px-12 pb-16">
            <div className="space-y-4">
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
                          className="flex items-start gap-3 bg-accent/50 p-2 cursor-pointer transition-colors duration-200 md:hover:bg-accent"
                          onClick={() =>
                            handleEntityClick(rec.recommender?.id || "")
                          }
                        >
                          <User className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-text">
                                {rec.recommender?.full_name}
                                {rec.source && (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    (via{" "}
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
                                    )})
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
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
                      className="w-full p-2 text-muted-foreground transition-colors duration-200 md:hover:text-text md:hover:underline"
                    >
                      {showAllRecommenders
                        ? "Show less"
                        : `Show ${book.recommendations.length - 3} more`}
                    </button>
                  )}
                </div>
              )}

              {/* Similar books (combined) */}
              {(book.related_books.length > 0 || book.similar_books.length > 0) && (
                <div className="space-y-2">
                  <h2 className="text-base text-text font-bold">
                    Similar Books
                  </h2>
                  <div className="space-y-4">
                    {Object.values(
                      [...book.similar_books, ...book.related_books].reduce<Record<string, {
                        id: string;
                        title: string;
                        author: string;
                        similarity?: number;
                        _shared_count?: number;
                      }>>((acc, curr) => {
                        if (curr.id in acc) {
                          acc[curr.id] = {
                            ...acc[curr.id],
                            ...curr,
                            similarity: 'similarity' in curr ? curr.similarity : acc[curr.id].similarity,
                            _shared_count: '_shared_count' in curr ? curr._shared_count : acc[curr.id]._shared_count
                          };
                        } else {
                          acc[curr.id] = {
                            id: curr.id,
                            title: curr.title,
                            author: curr.author,
                            ...('similarity' in curr ? { similarity: curr.similarity } : {}),
                            ...('_shared_count' in curr ? { _shared_count: curr._shared_count } : {})
                          };
                        }
                        return acc;
                      }, {})
                    )
                      .sort((a, b) => a.title.localeCompare(b.title))
                      .map((book) => (
                        <div
                          key={book.id}
                          className="flex items-start gap-3 bg-accent/50 p-2 cursor-pointer transition-colors duration-200 md:hover:bg-accent"
                          onClick={() => {
                            handleEntityClick(book.id);
                          }}
                        >
                          <BookOpen className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-text">
                                {book.title} by {book.author}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-0.5">
                              {book._shared_count !== undefined && (
                                <div>{book._shared_count} shared recommender{book._shared_count !== 1 ? 's' : ''}</div>
                              )}
                              {book.similarity !== undefined && (
                                <div>{book.similarity.toFixed(2)} similarity</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
}
