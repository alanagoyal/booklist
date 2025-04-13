import { X, BookOpen, Tag, LayoutList, AlignJustify, ChevronLeft, User } from "lucide-react";
import { EnhancedBook, RelatedBook } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { initLogger } from "braintrust";

// Initialize Braintrust logger
initLogger({
  projectName: "booklist",
  apiKey: process.env.BRAINTRUST_API_KEY,
});
  

type BookDetailProps = {
  book: EnhancedBook;
  onClose: () => void;
};

export default function BookDetail({ book, onClose }: BookDetailProps) {
  const [relatedBooks, setRelatedBooks] = useState<RelatedBook[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [recommenderSummary, setRecommenderSummary] = useState<string>("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  useEffect(() => {
    async function fetchRelatedBooks() {
      const { data, error } = await supabase
        .rpc('get_books_by_shared_recommenders', {
          p_book_id: book.id,
          p_limit: 10
        });

      if (!error && data) {
        setRelatedBooks(data);
      } else if (error) {
        console.error('Error fetching related books:', error);
      }
    }

    fetchRelatedBooks();
  }, [book.id]);

  useEffect(() => {
    async function fetchRecommenderSummary() {
      if (showSummary && !recommenderSummary && book.recommenders && book.recommender_types) {
        setIsLoadingSummary(true);
        try {
          const response = await fetch('/api/recommenders/explain', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              book: `${book.title} by ${book.author}`,
              recommenders: book.recommenders,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to fetch recommender summary');
          }

          const data = await response.json();
          setRecommenderSummary(data.summary);
        } catch (error) {
          console.error('Error fetching recommender summary:', error);
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
        onClose();
      }
    },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 z-20 bg-background/80"
      onClick={handleBackdropClick}
    >
      <div className="absolute right-0 top-0 bottom-0 w-full md:w-1/2 bg-background border-l border-border overflow-auto">
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

          <div className="space-y-2">
            <h1 className="text-2xl font-base text-text">{book.title}</h1>
            <p className="text-text/70 text-lg">{book.author}</p>
          </div>
        </div>

        <div className="px-12 py-8">
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              {book.genres && (
                <div className="flex items-center gap-2 text-text">
                  <Tag className="w-4 h-4 text-text/70" />
                  <span>{book.genres}</span>
                </div>
              )}
              {book.amazon_url && (
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-text/70" />
                  <a
                    href={book.amazon_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text transition-colors duration-200 md:hover:text-text/70"
                  >
                    View on Amazon
                  </a>
                </div>
              )}
            </div>

            {book.description && (
              <div className="space-y-2">
                <h2 className="text-sm text-text font-bold">About</h2>
                <p className="text-text whitespace-pre-line leading-relaxed">
                  {book.description}
                </p>
              </div>
            )}

            {book.recommenders && book.recommender_types && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm text-text font-bold">Recommenders</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowSummary(false)}
                      className={`p-1.5 transition-colors duration-200 ${
                        !showSummary ? 'text-text bg-accent/50' : 'text-text/70 md:hover:text-text'
                      }`}
                      title="List View"
                    >
                      <LayoutList className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowSummary(true)}
                      className={`p-1.5 transition-colors duration-200 ${
                        showSummary ? 'text-text bg-accent/50' : 'text-text/70 md:hover:text-text'
                      }`}
                      title="Summary View"
                    >
                      <AlignJustify className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {!showSummary ? (
                  <div className="text-text space-y-4 max-h-[300px] overflow-y-auto">
                    {(() => {
                      const pairs = book.recommenders.split(",").map((recommender, i) => ({
                        name: recommender.trim(),
                        type: book.recommender_types.split(",")[i]?.trim() || "",
                        url: book.url?.split(",")[i]?.trim() || "",
                        source: book.source?.split(",")[i]?.trim() || "",
                        source_link: book.source_link?.split(",")[i]?.trim() || ""
                      }));

                      return pairs.map((pair) => (
                        <div key={pair.name} className="flex items-start gap-3">
                          <User className="w-5 h-5 mt-0.5 text-text/70 shrink-0" />
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              {pair.url ? (
                                <a 
                                  href={pair.url}
                                  target="_blank"
                                  rel="noopener noreferrer" 
                                  className="text-text md:hover:underline"
                                >
                                  {pair.name}
                                </a>
                              ) : (
                                <span className="text-text">{pair.name}</span>
                              )}
                              <span className="text-sm text-text/70">({pair.type})</span>
                            </div>
                            {pair.source && (
                              <div className="text-sm text-text/70">
                                via{" "}
                                {pair.source_link ? (
                                  <a 
                                    href={pair.source_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="md:hover:underline"
                                  >
                                    {pair.source}
                                  </a>
                                ) : (
                                  pair.source
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
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

            {relatedBooks.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm text-text font-bold">You Might Also Enjoy</h2>
                <div className="space-y-4">
                  {relatedBooks.map((relatedBook) => (
                    <div key={relatedBook.id} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-text font-base">{relatedBook.title}</h3>
                        <span className="text-sm text-text/70">{relatedBook.author}</span>
                      </div>
                      <p className="text-sm text-text/70">
                        Also recommended by {relatedBook.recommenders}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
