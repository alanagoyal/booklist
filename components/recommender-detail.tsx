import { FormattedRecommender } from "@/types";
import { X, BookOpen, Tag, ChevronLeft, User, Link } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type RecommenderDetailProps = {
  recommender: FormattedRecommender;
  onClose?: () => void;
  isHovered?: boolean;
  isTopIndex?: boolean;
};

export default function RecommenderDetail({
  recommender,
  onClose,
  isHovered = false,
  isTopIndex = false,
}: RecommenderDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  const handleEntityClick = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("key", `${id}--${Date.now()}`);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div
      className="fixed inset-0 z-20 bg-transparent"
      onClick={handleBackdropClick}
    >
      <div
        className={`absolute right-0 top-0 bottom-0 w-full md:w-1/2 ${
          isHovered ? "bg-accent" : "bg-background"
        } border-border md:border-l`}
      >
        {isTopIndex && <div className="overflow-auto h-full">
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
              <div className="space-y-2">
                <h1 className="text-2xl font-base text-text">
                  {recommender?.full_name}
                </h1>
                <p className="text-text/70 text-lg">
                  {recommender?.recommendations?.length || 0} recommendation
                  {(recommender?.recommendations?.length || 0) === 1 ? "" : "s"}
                </p>
              </div>

              {/* Recommender metadata */}
              <div className="flex justify-between items-center pt-4">
                {recommender?.type && (
                  <div className="flex items-center gap-2 text-text">
                    <Tag className="w-4 h-4 text-text/70" />
                    <span>{recommender.type}</span>
                  </div>
                )}
                {recommender?.url && (
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
            </div>
          </div>

          <div className="px-12 pb-16">
            <div className="space-y-4">
              {/* Recommender description */}
              {recommender?.description && (
                <div className="space-y-2">
                  <h2 className="text-base text-text font-bold">About</h2>
                  <p className="text-text whitespace-pre-line leading-relaxed">
                    {recommender.description}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <h2 className="text-base text-text font-bold">
                  Recommendations
                </h2>
                <div className="text-text space-y-4">
                  {recommender?.recommendations
                    ?.slice(0, showAllRecommendations ? undefined : 3)
                    .map((book) => (
                      <div
                        key={book.id}
                        className="flex items-start gap-3 bg-accent/50 p-2 cursor-pointer transition-colors duration-200 border-l-2 border-transparent md:hover:bg-accent md:hover:border-border"
                        onClick={() => {
                          handleEntityClick(book.id);
                        }}
                      >
                        <BookOpen className="w-5 h-5 mt-0.5 text-text/70 shrink-0" />
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-text">
                              <button
                                onClick={(e) => {
                                  handleEntityClick(book.id);
                                }}
                                className="text-text text-left font-base md:hover:underline transition-colors duration-200"
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
                {recommender?.recommendations?.length > 3 && (
                  <button
                    onClick={() =>
                      setShowAllRecommendations(!showAllRecommendations)
                    }
                    className="w-full p-2 text-text/70 transition-colors duration-200 md:hover:text-text md:hover:underline"
                  >
                    {showAllRecommendations
                      ? "Show less"
                      : `Show ${(recommender?.recommendations?.length || 0) - 3} more`}
                  </button>
                )}
              </div>

              {/* Similar recommenders (combined) */}
              {(recommender?.related_recommenders?.length > 0 || recommender?.similar_recommenders?.length > 0) && (
                <div className="space-y-2">
                  <h2 className="text-base text-text font-bold">
                    Similar People
                  </h2>
                  <div className="space-y-4">
                    {Object.values(
                      [...(recommender?.similar_recommenders || []).map(r => ({
                        id: r.person_id,
                        full_name: r.full_name,
                        type: r.type,
                        similarity: r.similarity
                      })), 
                      ...(recommender?.related_recommenders || [])].reduce<Record<string, {
                        id: string;
                        full_name: string;
                        type: string;
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
                            full_name: curr.full_name,
                            type: curr.type,
                            ...('similarity' in curr ? { similarity: curr.similarity } : {}),
                            ...('_shared_count' in curr ? { _shared_count: curr._shared_count } : {})
                          };
                        }
                        return acc;
                      }, {})
                    )
                      .sort((a, b) => a.full_name.localeCompare(b.full_name))
                      .map((person) => (
                        <div
                          key={person.id}
                          className="flex items-start gap-3 bg-accent/50 p-2 cursor-pointer transition-colors duration-200 border-l-2 border-transparent md:hover:bg-accent md:hover:border-border"
                          onClick={() => {
                            handleEntityClick(person.id);
                          }}
                        >
                          <User className="w-5 h-5 mt-0.5 text-text/70 shrink-0" />
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-text">
                                <button
                                  onClick={() => {
                                    handleEntityClick(person.id);
                                  }}
                                  className="text-text text-left font-base md:hover:underline transition-colors duration-200"
                                >
                                  {person.full_name}
                                </button>{" "}
                                ({person.type})
                              </span>
                            </div>
                            <div className="text-sm text-text/70 space-y-0.5">
                              {person._shared_count !== undefined && (
                                <div>{person._shared_count} shared recommendation{person._shared_count === 1 ? "" : "s"}</div>
                              )}
                              {person.similarity !== undefined && (
                                <div>{person.similarity.toFixed(2)} similarity</div>
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
