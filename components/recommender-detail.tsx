import { FormattedRecommender } from "@/types";
import { X, BookOpen, Tag, ChevronLeft, User } from "lucide-react";

type RecommenderDetailProps = {
  recommender: FormattedRecommender;
  onClose: () => void;
};

export default function RecommenderDetail({
  recommender,
  onClose,
}: RecommenderDetailProps) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-20 bg-background/80"
      onClick={handleBackdropClick}
    >
      <div className="absolute right-0 top-0 bottom-0 w-full md:w-1/2 bg-background md:border-l border-border overflow-auto">
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
                  <User className="w-4 h-4 text-text/70" />
                  <a
                    href={recommender.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text transition-colors duration-200 md:hover:underline"
                  >
                    Profile
                  </a>
                </div>
              )}
            </div>

            <div className="space-y-8">
              {/* Book recommendations */}
              <div>
                <h2 className="text-base text-text font-bold">
                  Recommendations
                </h2>
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                  {recommender.recommendations.map((book) => (
                    <div key={book.id} className="flex items-start gap-3">
                      <BookOpen className="w-5 h-5 mt-0.5 text-text/70 shrink-0" />
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-text">
                            <button
                              onClick={() => {
                                onClose();
                                const params = new URLSearchParams();
                                params.set("view", book.id);
                                window.history.pushState(
                                  {},
                                  "",
                                  `/?${params.toString()}`
                                );
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
                <div>
                  <h2 className="text-base text-text font-bold">
                    You Might Also Enjoy
                  </h2>
                  <div className="space-y-4">
                    {recommender.related_recommenders.map((related) => (
                      <div key={related.id} className="flex items-start gap-3">
                        <User className="w-5 h-5 mt-0.5 text-text/70 shrink-0" />
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-text">
                              <button
                                onClick={() => {
                                  onClose();
                                  const params = new URLSearchParams();
                                  params.set("view", related.id);
                                  window.history.pushState(
                                    {},
                                    "",
                                    `/?${params.toString()}`
                                  );
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
  );
}
