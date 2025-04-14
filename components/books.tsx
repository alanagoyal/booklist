"use client";

import { Fragment, useState, useEffect, useCallback, useRef } from "react";
import { DataGrid } from "@/components/grid";
import { BookCounter } from "@/components/book-counter";
import { PercentileTooltip } from "@/components/percentile-tooltip";
import { FormattedBook, EnhancedBook, Recommender } from "@/types";
import BookDetail from "@/components/book-detail";
import RecommenderDetail from "@/components/recommender-detail";
import { supabase } from "@/utils/supabase/client";

const TitleCell = function Title({
  row: { original, isExpanded },
  onSelect,
}: {
  row: { original: EnhancedBook; isExpanded: boolean };
  onSelect: (book: EnhancedBook) => void;
}) {
  const title = original.title || "";

  const displayTitle =
    !isExpanded && title.length > 50 ? `${title.slice(0, 50)}...` : title;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect(original);
      }}
      className="text-left hover:underline transition-colors duration-200 md:hover:text-text"
    >
      {displayTitle}
    </button>
  );
};

const RecommenderCell = ({
  row: { original, isExpanded },
  maxCount,
  tooltipOpen,
  setTooltipOpen,
  onSelectRecommender,
}: {
  row: { original: EnhancedBook; isExpanded: boolean };
  maxCount: number;
  tooltipOpen: boolean;
  setTooltipOpen: (open: boolean) => void;
  onSelectRecommender: (recommender: Recommender) => void;
}) => {
  const recommenderText = original.recommenders || "";
  const urlText = original.url || "";

  const recommenderPairs = recommenderText
    .split(",")
    .map((r: string, i: number) => {
      const url = urlText.split(",")[i] || "";
      return { recommender: r.trim(), url: url.trim() };
    })
    .filter((pair: { recommender: string; url: string }) => pair.recommender)
    .sort((a: { recommender: string }, b: { recommender: string }) => {
      const countA = getRecommendationCount(a.recommender);
      const countB = getRecommendationCount(b.recommender);
      return countB - countA;
    });

  if (recommenderPairs.length === 0) {
    return <span></span>;
  }

  const displayCount = !isExpanded ? 2 : recommenderPairs.length;
  const percentile = getPercentile(original._recommendationCount, maxCount);

  const handleRecommenderClick = async (recommenderName: string, url: string) => {
    // First get the recommender's ID from the database
    const { data: recommenderData, error } = await supabase
      .from('people')
      .select('*')
      .eq('full_name', recommenderName)
      .single();

    if (error) {
      console.error('Error fetching recommender:', error);
      return;
    }

    onSelectRecommender(recommenderData);
  };

  return (
    <div
      className={`whitespace-pre-line ${
        isExpanded ? "" : "line-clamp-2"
      } text-text`}
      style={{
        backgroundColor: getBackgroundColor(
          getRecommendationCount(original.recommenders),
          maxCount
        ),
      }}
    >
      <span
        className="flex items-center gap-1"
        onClick={(e) => tooltipOpen && e.stopPropagation()}
      >
        <span>
          {recommenderPairs.slice(0, displayCount).map((pair, i) => (
            <Fragment key={pair.recommender}>
              {i > 0 && ", "}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRecommenderClick(pair.recommender, pair.url);
                }}
                className="text-text md:hover:text-text/70 md:hover:underline transition-colors duration-200"
              >
                {pair.recommender}
              </button>
            </Fragment>
          ))}
          {recommenderPairs.length > displayCount && (
            <span className="text-text/70">
              {" "}
              +{recommenderPairs.length - displayCount} more
            </span>
          )}
        </span>
        <PercentileTooltip
          percentile={percentile}
          onTooltipOpenChange={setTooltipOpen}
        />
      </span>
    </div>
  );
};

interface BookGridProps {
  data: FormattedBook[];
  onFilteredDataChange?: (count: number) => void;
  tooltipOpen: boolean;
  setTooltipOpen: (open: boolean) => void;
  onSelectBook: (book: EnhancedBook) => void;
  onSelectRecommender: (recommender: Recommender) => void;
}

const getRecommendationCount = (recommender: string): number => {
  return recommender
    ? recommender.split(",").filter((r) => r.trim()).length
    : 0;
};

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
  tooltipOpen,
  setTooltipOpen,
  onSelectBook,
  onSelectRecommender,
}: BookGridProps) {
  const maxRecommendations = Math.max(
    ...data.map((book) => getRecommendationCount(book.recommenders))
  );

  const enhancedData: EnhancedBook[] = data.map((book) => ({
    ...book,
    _recommendationCount: getRecommendationCount(book.recommenders),
  }));

  const columns = [
    {
      field: "title" as keyof FormattedBook,
      header: "Title",
      cell: (props: {
        row: { original: EnhancedBook; isExpanded: boolean };
      }) => (
        <TitleCell {...props} onSelect={onSelectBook} />
      ),
    },
    { field: "author" as keyof FormattedBook, header: "Author" },
    {
      field: "recommenders" as keyof FormattedBook,
      header: "Recommenders",
      cell: (props: {
        row: { original: EnhancedBook; isExpanded: boolean };
      }) => (
        <RecommenderCell
          {...props}
          maxCount={maxRecommendations}
          tooltipOpen={tooltipOpen}
          setTooltipOpen={setTooltipOpen}
          onSelectRecommender={onSelectRecommender}
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
      tooltipOpen={tooltipOpen}
    />
  );
}

export function BookList({ initialBooks }: { initialBooks: FormattedBook[] }) {
  const [mounted, setMounted] = useState(false);
  const [books, setBooks] = useState(initialBooks);
  const [filteredCount, setFilteredCount] = useState(initialBooks.length);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<EnhancedBook | null>(null);
  const [selectedRecommender, setSelectedRecommender] = useState<Recommender | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = useCallback(
    async (query: string) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        setBooks(initialBooks);
        return;
      }

      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: trimmedQuery }),
        });

        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.error) {
          console.error("Search error:", data.error);
          return;
        }

        setBooks(data.books);
      } catch (error) {
        console.error("Error searching books:", error);
        setBooks(initialBooks);
      }
    },
    [initialBooks]
  );

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

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
          data={books}
          onFilteredDataChange={handleFilteredDataChange}
          tooltipOpen={tooltipOpen}
          setTooltipOpen={setTooltipOpen}
          onSelectBook={setSelectedBook}
          onSelectRecommender={setSelectedRecommender}
        />
      </div>
      <BookCounter total={initialBooks.length} filtered={filteredCount} />
      {selectedBook && (
        <BookDetail
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
        />
      )}
      {selectedRecommender && (
        <RecommenderDetail
          recommender={selectedRecommender}
          onClose={() => setSelectedRecommender(null)}
        />
      )}
    </div>
  );
}
