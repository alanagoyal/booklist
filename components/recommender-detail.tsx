import { FormattedRecommender } from "@/types";
import { X, BookOpen, Tag, ChevronLeft, User, Link } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type RecommenderDetailProps = {
  recommender: FormattedRecommender;
  onClose?: () => void;
  stackIndex?: number;
  maxStackIndex?: number;
};

export default function RecommenderDetail({
  recommender,
  onClose,
  stackIndex = 0,
  maxStackIndex = 0,
}: RecommenderDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-20 bg-background/80"
      onClick={handleBackdropClick}
      style={{
        backgroundColor: stackIndex === 0 ? 'rgba(var(--background), 0.8)' : 'transparent'
      }}
    >
      <div 
        className={`absolute right-0 top-0 bottom-0 w-full md:w-1/2 bg-background border-border ${stackIndex > 0 ? 'border-l' : 'md:border-l'}`}
        style={{
          boxShadow: stackIndex > 0 ? '0 0 20px rgba(0, 0, 0, 0.1)' : 'none'
        }}
      >
        {stackIndex !== maxStackIndex && (
          <div 
          className="hidden md:block absolute -left-[32px] -translate-x-full origin-top-right -rotate-90 bg-background border-border border px-3 py-2 text-text/70 h-[32px] w-[200px] whitespace-nowrap truncate text-right text-sm"
          style={{ top: `${(stackIndex * 150) + 4}px`}}
          >
            {recommender.full_name}
          </div>
        )}
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
            <h1 className="text-2xl font-base text-text">
              {recommender.full_name}
            </h1>
          </div>

          <div className="px-12 py-8">
            <div className="space-y-8">
              {/* Recommender metadata */}
              <div className="flex justify-between items-center">
                {recommender.type && (
                  <div className="flex items-center gap-2 text-text">
                    <Tag className="w-4 h-4 text-text/70" />
                    <span>{recommender.type}</span>
                  </div>
                )}
                {recommender.url && (
                  <div className="flex items-center gap-2">
                    <Link className="w-4 h-4 text-text/70" />
                    <a
                      href={recommender.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text transition-colors duration-200 md:hover:underline"
                    >
                      View Website
                    </a>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                {/* Book recommendations */}
                <div className="space-y-2">
                  <h2 className="text-base text-text font-bold">
                    Recommendations
                  </h2>
                  <div className="text-text space-y-4 max-h-[300px] overflow-y-auto">
                    {recommender.recommendations.map((book) => (
                      <div key={book.id} className="flex items-start gap-3 bg-accent/50 p-2">
                        <BookOpen className="w-5 h-5 mt-0.5 text-text/70 shrink-0" />
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-text">
                              <button
                                onClick={() => {
                                  const params = new URLSearchParams(searchParams.toString());
                                  params.set("view", `${book.id}--${Date.now()}`);
                                  router.push(`?${params.toString()}`, { scroll: false });
                                }}
                                className="text-text text-left md:hover:underline"
                              >
                                {book.title}
                              </button>{" "}
                              by {book.author} (via{" "}
                              {book.source_link ? (
                                <a
                                  href={book.source_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-text md:hover:underline"
                                >
                                  {book.source}
                                </a>
                              ) : (
                                <span>{book.source}</span>
                              )}
                              )
                            </span>
                          </div>
                          {book.genre && (
                            <div className="text-sm text-text/70">
                              {book.genre.join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Related recommenders */}
                {recommender.related_recommenders.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-base text-text font-bold">
                      You Might Also Enjoy
                    </h2>
                    <div className="space-y-4">
                      {recommender.related_recommenders.map((related) => (
                        <div key={related.id} className="flex items-start gap-3 bg-accent/50 p-2">
                          <User className="w-5 h-5 mt-0.5 text-text/70 shrink-0" />
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-text">
                                <button
                                  onClick={() => {
                                    const params = new URLSearchParams(searchParams.toString());
                                    params.set("view", `${related.id}--${Date.now()}`);
                                    router.push(`?${params.toString()}`, { scroll: false });
                                  }}
                                  className="text-text text-left font-base hover:underline transition-colors duration-200"
                                >
                                  {related.full_name}
                                </button>{" "}
                                ({related.type})
                              </span>
                            </div>
                            <div className="text-sm text-text/70">
                              {related.shared_count} shared recommendation
                              {related.shared_count !== 1 && "s"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!recommender.recommendations.length && (
                <div className="text-text/70">No books recommended yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
