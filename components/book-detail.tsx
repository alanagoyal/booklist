import {
  X,
  BookOpen,
  Tag,
  LayoutList,
  AlignJustify,
  ChevronLeft,
  User,
  Link,
} from "lucide-react";
import { EnhancedBook } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { initLogger } from "braintrust";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

// Initialize Braintrust logger
initLogger({
  projectName: "booklist",
  apiKey: process.env.BRAINTRUST_API_KEY,
});

type BookDetailProps = {
  book: EnhancedBook;
  onClose?: () => void;
  stackIndex?: number;
};

type RelatedBookResponse = {
  book: {
    id: string;
    title: string;
    author: string;
    description: string | null;
    amazon_url: string | null;
  };
};

export default function BookDetail({
  book,
  onClose,
  stackIndex = 0,
}: BookDetailProps) {
  const [showSummary, setShowSummary] = useState(false);
  const [recommenderSummary, setRecommenderSummary] = useState<string>("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [relatedBooks, setRelatedBooks] = useState<Array<{
    id: string;
    title: string;
    author: string;
    description: string | null;
    amazon_url: string | null;
    _recommendationCount: number;
  }>>([]);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Explain recommenders
  useEffect(() => {
    async function fetchRecommenderSummary() {
      if (showSummary && !recommenderSummary && book.recommendations) {
        setIsLoadingSummary(true);
        try {
          const response = await fetch("/api/recommenders/explain", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              book: `${book.title} by ${book.author}`,
              recommenders: book.recommendations
                .filter(r => r.recommender)
                .map(r => ({
                  name: r.recommender?.full_name || '',
                  type: r.recommender?.type || ''
                }))
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to fetch recommender summary");
          }

          const data = await response.json();
          setRecommenderSummary(data.summary);
        } catch (error) {
          console.error("Error fetching recommender summary:", error);
        } finally {
          setIsLoadingSummary(false);
        }
      }
    }

    fetchRecommenderSummary();
  }, [showSummary, book, recommenderSummary]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose?.();
      }
    },
    [onClose]
  );

  const handleRecommenderClick = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", `${id}--${Date.now()}`);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Fetch related books
  useEffect(() => {
    async function fetchRelatedBooks() {
      const { data: relatedBooksData } = await supabase
        .from('recommendations')
        .select(`
          book:books(
            id,
            title,
            author,
            description,
            amazon_url
          )
        `)
        .in('person_id', book.recommendations?.map(r => r.recommender?.id).filter((id): id is string => id !== undefined) || [])
        .not('book_id', 'eq', book.id)
        .order('book_id', { ascending: false })
        .limit(3) as { data: RelatedBookResponse[] | null };

      // Count occurrences of each book
      const bookCounts = (relatedBooksData || []).reduce((acc, r) => {
        const bookId = r.book.id;
        acc[bookId] = (acc[bookId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const uniqueBooks = (relatedBooksData || [])
        .map(r => ({
          id: r.book.id,
          title: r.book.title,
          author: r.book.author,
          description: r.book.description,
          amazon_url: r.book.amazon_url,
          _recommendationCount: bookCounts[r.book.id]
        }))
        .filter((book, index, self) => 
          index === self.findIndex((b) => b.id === book.id)
        )
        .sort((a, b) => b._recommendationCount - a._recommendationCount)
        .slice(0, 3);

      setRelatedBooks(uniqueBooks);
    }

    fetchRelatedBooks();
  }, [book]);

  return (
    <div
      className="fixed inset-0 z-20 bg-background/80"
      onClick={handleBackdropClick}
      style={{
        backgroundColor: stackIndex === 0 ? 'rgba(var(--background), 0.8)' : 'transparent'
      }}
    >
      <div 
        className="absolute right-0 top-0 bottom-0 w-full md:w-1/2 bg-background border-border md:border-l"
        style={{
          boxShadow: stackIndex > 0 ? '0 0 20px rgba(0, 0, 0, 0.1)' : 'none'
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
                      {Array.isArray(book.genres) ? book.genres.join(", ") : book.genres}
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

          <div className="px-12">
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowSummary(false)}
                        className={`p-1.5 transition-colors duration-200 ${
                          !showSummary
                            ? "text-text bg-accent/50"
                            : "text-text/70 md:hover:text-text"
                        }`}
                        title="List View"
                      >
                        <LayoutList className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowSummary(true)}
                        className={`p-1.5 transition-colors duration-200 ${
                          showSummary
                            ? "text-text bg-accent/50"
                            : "text-text/70 md:hover:text-text"
                        }`}
                        title="Summary View"
                      >
                        <AlignJustify className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {!showSummary ? (
                    <div className="text-text space-y-4 max-h-[300px] overflow-y-auto">
                      {book.recommendations.map((rec) => (
                        <div
                          key={rec.recommender?.id}
                          className="flex items-start gap-3 bg-accent/50 p-2 cursor-pointer transition-colors duration-200 border-l-2 border-transparent md:hover:bg-accent md:hover:border-border"
                          onClick={() => handleRecommenderClick(rec.recommender?.id || "")}
                        >
                          <User className="w-5 h-5 mt-0.5 text-text/70 shrink-0" />
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-text">
                                <button
                                  onClick={() =>
                                    handleRecommenderClick(
                                      rec.recommender?.id || ""
                                    )
                                  }
                                  className="text-text md:hover:text-text/70 md:hover:underline transition-colors duration-200"
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
                  ) : (
                    <div className="text-text whitespace-pre-line leading-relaxed max-h-[300px] overflow-y-auto">
                      {isLoadingSummary ? (
                        <p className="text-text/70">Generating summary...</p>
                      ) : (
                        recommenderSummary
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Book suggestions */}
              {relatedBooks.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-base text-text font-bold">
                    Similar Recommendations
                  </h2>
                  <div className="space-y-4">
                    {relatedBooks.map((relatedBook) => (
                      <div
                        key={relatedBook.id}
                        className="flex items-start gap-3 bg-accent/50 p-2 cursor-pointer transition-colors duration-200 border-l-2 border-transparent md:hover:bg-accent md:hover:border-border"
                        onClick={() => {
                          const params = new URLSearchParams(
                            searchParams.toString()
                          );
                          params.set("view", `${relatedBook.id}--${Date.now()}`);
                          router.push(`?${params.toString()}`, {
                            scroll: false,
                          });
                        }}
                      >
                        <BookOpen className="w-5 h-5 mt-0.5 text-text/70 shrink-0" />
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-text">
                              <button
                                onClick={() => {
                                  const params = new URLSearchParams(
                                    searchParams.toString()
                                  );
                                  params.set("view", `${relatedBook.id}--${Date.now()}`);
                                  router.push(`?${params.toString()}`, {
                                    scroll: false,
                                  });
                                }}
                                className="text-text text-left md:hover:underline"
                              >
                                {relatedBook.title}
                              </button>{" "}
                              by {relatedBook.author}
                            </span>
                          </div>
                          <div className="text-sm text-text/70">
                            {relatedBook._recommendationCount}{" "}
                            recommendation{relatedBook._recommendationCount !== 1 && "s"}
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
