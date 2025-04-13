import { ArrowLeft, X, BookOpen, Tag, Users } from "lucide-react";
import { EnhancedBook, RelatedBook } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";

type BookDetailProps = {
  book: EnhancedBook;
  onClose: () => void;
};

export default function BookDetail({ book, onClose }: BookDetailProps) {
  const [relatedBooks, setRelatedBooks] = useState<RelatedBook[]>([]);

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
        <button
          onClick={onClose}
          className="absolute top-4 left-4 md:hidden text-text/70 transition-colors duration-200 md:hover:text-text"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 hidden md:block text-text/70 transition-colors duration-200 md:hover:text-text"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-12 py-4 md:p-8">
          <div className="space-y-8">
            <div className="space-y-2">
              <h1 className="text-2xl font-base text-text">{book.title}</h1>
              <p className="text-text/70 text-lg">{book.author}</p>
            </div>

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
                <h2 className="text-sm text-text font-bold">Recommended By</h2>
                <div className="text-text space-y-3">
                  {(() => {
                    const pairs = book.recommenders.split(",").map((recommender, i) => ({
                      name: recommender.trim(),
                      type: book.recommender_types.split(",")[i]?.trim() || ""
                    }));

                    const groupedByType = pairs.reduce((acc, pair) => {
                      if (!acc[pair.type]) {
                        acc[pair.type] = [];
                      }
                      acc[pair.type].push(pair.name);
                      return acc;
                    }, {} as Record<string, string[]>);

                    return Object.entries(groupedByType)
                      .sort(([, namesA], [, namesB]) => namesB.length - namesA.length)
                      .map(([type, names]) => (
                        <div key={type} className="whitespace-pre-line">
                          <span className="text-text/70">{names.length} {type.toLowerCase()}: </span>
                          {names.map((name, j) => (
                            <span key={name}>
                              {j > 0 && ", "}
                              {name}
                            </span>
                          ))}
                        </div>
                      ));
                  })()}
                </div>
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
                        <span className="text-sm text-text/70">{relatedBook.recommender_count} shared recommenders</span>
                      </div>
                      <p className="text-text/70">{relatedBook.author}</p>
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
