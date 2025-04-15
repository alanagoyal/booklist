"use client";

import { Fragment, useState, useEffect, useCallback, memo, useMemo } from "react";
import { DataGrid } from "@/components/grid";
import { BookCounter } from "@/components/book-counter";
import { PercentileTooltip } from "@/components/percentile-tooltip";
import { FormattedBook, EnhancedBook, FormattedRecommender } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import BookDetail from "@/components/book-detail";
import RecommenderDetail from "@/components/recommender-detail";

const TitleCell = function Title({
  row: { original },
}: {
  row: { original: EnhancedBook };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const title = original.title || "";

  const displayTitle = title.length > 50 ? `${title.slice(0, 50)}...` : title;

  const handleBookClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', original.id || original.title);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <button
      onClick={handleBookClick}
      className="text-left hover:underline transition-colors duration-200 md:hover:text-text"
    >
      {displayTitle}
    </button>
  );
};

const getRecommendationCount = (recommenderName: string, books: FormattedBook[]) => {
  return books.reduce((count, book) => {
    const hasRecommender = book.recommendations.some(
      (rec) => rec.recommender?.full_name === recommenderName
    );
    return count + (hasRecommender ? 1 : 0);
  }, 0);
};

const getTopRecommenders = (book: EnhancedBook, books: FormattedBook[], maxCount: number) => {
  if (book._topRecommenders) {
    return book._topRecommenders;
  }

  const recommenderPairs = book.recommendations
    ?.filter(rec => rec.recommender) // Filter out null recommenders first
    .map((rec) => ({
      id: rec.recommender!.id,
      full_name: rec.recommender!.full_name,
      recommendationCount: getRecommendationCount(rec.recommender!.full_name, books)
    }))
    .sort((a, b) => b.recommendationCount - a.recommendationCount) || [];

  book._topRecommenders = recommenderPairs;
  return recommenderPairs;
};

const RecommenderCell = memo(function RecommenderCell({
  row: { original },
  maxCount,
  books,
}: {
  row: { original: EnhancedBook };
  maxCount: number;
  books: FormattedBook[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const recommenderPairs = useMemo(() => 
    getTopRecommenders(original, books, maxCount)
  , [original.id]); // Only recompute if book ID changes

  const displayCount = 2;
  const percentile = getPercentile(original._recommendationCount, maxCount);

  const handleRecommenderClick = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', id);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  return (
    <div
      className="whitespace-pre-line line-clamp-2 text-text"
      style={{
        backgroundColor: getBackgroundColor(
          original._recommendationCount,
          maxCount
        ),
      }}
    >
      <span
        className="flex items-center gap-1"
        onClick={(e) => tooltipOpen && e.stopPropagation()}
      >
        <span className="break-words">
          {recommenderPairs.slice(0, displayCount).map((pair, i) => (
            <Fragment key={pair.id}>
              <span className="inline whitespace-nowrap">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRecommenderClick(pair.id);
                  }}
                  className="text-text md:hover:text-text/70 md:hover:underline transition-colors duration-200"
                >
                  {pair.full_name}
                </button>
                {i < displayCount - 1 && recommenderPairs.length > i + 1 && ", "}
              </span>
              {i < displayCount - 1 && recommenderPairs.length > i + 1 && " "}
            </Fragment>
          ))}
          {recommenderPairs.length > displayCount && (
            <span className="text-text/70">
              , + {recommenderPairs.length - displayCount} more
            </span>
          )}
        </span>
        <PercentileTooltip
          percentile={percentile}
          open={tooltipOpen}
          setOpen={setTooltipOpen}
        />
      </span>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary rerenders
  return prevProps.row.original.id === nextProps.row.original.id;
});

const getPercentile = (count: number, maxCount: number): number => {
  return Math.round((count / maxCount) * 100);
};

const getBackgroundColor = (count: number, maxCount: number): string => {
  if (count === 0) return "";

  const percentile = (count / maxCount) * 100;

  let intensity = 0;
  if (percentile > 10) intensity = 1;
  if (percentile > 25) intensity = 2;
  if (percentile > 50) intensity = 3;
  if (percentile > 75) intensity = 4;
  if (percentile > 95) intensity = 5;
  if (percentile > 99) intensity = 6;

  switch (intensity) {
    case 1:
      return "bg-[hsl(151,80%,95%)] hover:bg-[hsl(151,80%,92%)] dark:bg-[hsl(160,84%,5%)] dark:hover:bg-[hsl(160,84%,7%)] transition-colors duration-200";
    case 2:
      return "bg-[hsl(151,80%,90%)] hover:bg-[hsl(151,80%,88%)] dark:bg-[hsl(160,84%,9%)] dark:hover:bg-[hsl(160,84%,11%)] transition-colors duration-200";
    case 3:
      return "bg-[hsl(151,80%,85%)] hover:bg-[hsl(151,80%,84%)] dark:bg-[hsl(160,84%,13%)] dark:hover:bg-[hsl(160,84%,15%)] transition-colors duration-200";
    case 4:
      return "bg-[hsl(151,80%,80%)] hover:bg-[hsl(151,80%,80%)] dark:bg-[hsl(160,84%,17%)] dark:hover:bg-[hsl(160,84%,19%)] transition-colors duration-200";
    case 5:
      return "bg-[hsl(151,80%,75%)] hover:bg-[hsl(151,80%,76%)] dark:bg-[hsl(160,84%,21%)] dark:hover:bg-[hsl(160,84%,23%)] transition-colors duration-200";
    case 6:
      return "bg-[hsl(151,80%,70%)] hover:bg-[hsl(151,80%,72%)] dark:bg-[hsl(160,84%,25%)] dark:hover:bg-[hsl(160,84%,27%)] transition-colors duration-200";
    default:
      return "";
  }
};

export function BookGrid({
  data,
  onFilteredDataChange,
}: {
  data: FormattedBook[];
  onFilteredDataChange?: (count: number) => void;
}) {
  const maxRecommendations = Math.max(
    ...data.map((book) => book.recommendations.length)
  );

  const enhancedData: EnhancedBook[] = data.map((book) => ({
    ...book,
    _recommendationCount: book.recommendations.length,
  }));

  const columns = [
    {
      field: "title" as keyof FormattedBook,
      header: "Title",
      cell: (props: {
        row: { original: EnhancedBook };
      }) => <TitleCell {...props} />,
    },
    { field: "author" as keyof FormattedBook, header: "Author" },
    {
      field: "recommenders" as keyof FormattedBook,
      header: "Recommenders",
      cell: (props: {
        row: { original: EnhancedBook };
      }) => (
        <RecommenderCell
          {...props}
          maxCount={maxRecommendations}
          books={data}
        />
      ),
      isExpandable: true,
    },
    {
      field: "description" as keyof FormattedBook,
      header: "Description",
      isExpandable: true,
    },
    { field: "genres" as keyof FormattedBook, header: "Genre" },
  ];

  return (
    <DataGrid
      data={enhancedData}
      columns={columns}
      getRowClassName={(row: EnhancedBook) =>
        getBackgroundColor(row._recommendationCount, maxRecommendations)
      }
      onFilteredDataChange={onFilteredDataChange}
    />
  );
}

export function BookList({ initialBooks, initialRecommenders }: { 
  initialBooks: FormattedBook[]; 
  initialRecommenders: FormattedRecommender[];
}) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filteredCount, setFilteredCount] = useState(initialBooks.length);

  // Get selected item based on URL param
  const viewId = searchParams.get('view');
  const selectedRecommender = viewId ? initialRecommenders.find(r => r.id === viewId) : null;
  const selectedBook = viewId && !selectedRecommender ? initialBooks.find(book => book.id === viewId || book.title === viewId) as EnhancedBook | null : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClose = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('view');
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.push(newUrl, { scroll: false });
  }, [router, searchParams]);

  const handleFilteredDataChange = useCallback((count: number) => {
    setFilteredCount(count);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 overflow-hidden">
        <BookGrid
          data={initialBooks}
          onFilteredDataChange={handleFilteredDataChange}
        />
      </div>
      <BookCounter total={initialBooks.length} filtered={filteredCount} />
      {selectedBook && (
        <BookDetail
          book={selectedBook}
          onClose={handleClose}
        />
      )}
      {selectedRecommender && (
        <RecommenderDetail
          recommender={selectedRecommender}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
