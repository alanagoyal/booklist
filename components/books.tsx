"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { DataGrid } from "@/components/grid";
import { BookCounter } from "@/components/book-counter";
import { PercentileTooltip } from "@/components/percentile-tooltip";

interface FormattedBook {
  id: number;
  title: string;
  author: string;
  description: string;
  genres: string;
  recommender: string;
  source: string;
  source_link: string;
  url: string;
  amazon_url: string;
}

interface EnhancedBook extends FormattedBook {
  _recommendationCount: number;
}

interface CellProps {
  row: {
    original: EnhancedBook;
    isExpanded: boolean;
  };
  maxCount?: number;
}

const SourceCell = ({ row: { original, isExpanded } }: CellProps) => {
  const sourceText = original.source || "";
  const sources = sourceText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const sourceLinks = (
    original.source_link?.split(",").map((l) => l.trim()) || []
  ).concat(Array(sources.length).fill(null));

  if (sources.length === 0) {
    return <span></span>;
  }

  const displayCount = !isExpanded ? 2 : sources.length;

  return (
    <span>
      {sources.slice(0, displayCount).map((source, i) => (
        <Fragment key={i}>
          {i > 0 && ", "}
          {sourceLinks[i] ? (
            <a
              href={sourceLinks[i]}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {source}
            </a>
          ) : (
            <span>{source}</span>
          )}
        </Fragment>
      ))}
      {!isExpanded && sources.length > displayCount && (
        <>
          {", "}
          <span className="text-text/70">
            + {sources.length - displayCount} more
          </span>
        </>
      )}
    </span>
  );
};

const TitleCell = function Title({ row: { original, isExpanded } }: CellProps) {
  const title = original.title || "";
  const amazonUrl = original.amazon_url;

  const displayTitle =
    !isExpanded && title.length > 50 ? `${title.slice(0, 50)}...` : title;

  return amazonUrl ? (
    <a
      href={amazonUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline"
    >
      {displayTitle}
    </a>
  ) : (
    <span>{displayTitle}</span>
  );
};

const RecommenderCell = function Recommender({
  row: { original, isExpanded },
  maxCount,
  tooltipOpen,
  setTooltipOpen,
}: CellProps & { maxCount: number; tooltipOpen: boolean; setTooltipOpen: (open: boolean) => void }) {
  const recommenderText = original.recommender || "";
  const recommenders = recommenderText
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const urls = (original.url?.split(",").map((url) => url.trim()) || [])
    .concat(Array(recommenders.length).fill(null));

  if (recommenders.length === 0) {
    return <span></span>;
  }

  const displayCount = !isExpanded ? 2 : recommenders.length;
  const percentile = getPercentile(original._recommendationCount, maxCount);

  return (
    <span
      className="flex items-center gap-1"
      onClick={(e) => tooltipOpen && e.stopPropagation()}
    >
      <span>
        {recommenders.slice(0, displayCount).map((rec, i) => {
          const recommenderUrl = urls[i];

          return (
            <Fragment key={rec}>
              {i > 0 && ", "}
              {recommenderUrl ? (
                <a
                  href={recommenderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text hover:text-text/70 hover:underline transition-colors duration-200"
                >
                  {rec}
                </a>
              ) : (
                <span>{rec}</span>
              )}
            </Fragment>
          );
        })}
        {recommenders.length > displayCount && (
          <span className="text-text/70">
            {" "}
            +{recommenders.length - displayCount} more
          </span>
        )}
      </span>
      <PercentileTooltip
        percentile={percentile}
        onTooltipOpenChange={setTooltipOpen}
      />
    </span>
  );
};

interface BookGridProps {
  data: FormattedBook[];
  onFilteredDataChange?: (count: number) => void;
  tooltipOpen: boolean;
  setTooltipOpen: (open: boolean) => void;
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

  // Create 6 intensity levels based on percentiles
  const percentile = (count / maxCount) * 100;

  // Map to intensity levels based on percentiles:
  // Level 1: > 10th percentile
  // Level 2: > 25th percentile
  // Level 3: > 50th percentile
  // Level 4: > 75th percentile
  // Level 5: > 95th percentile
  // Level 6: > 99th percentile
  let intensity = 0;
  if (percentile > 10) intensity = 1;
  if (percentile > 25) intensity = 2;
  if (percentile > 50) intensity = 3;
  if (percentile > 75) intensity = 4;
  if (percentile > 95) intensity = 5;
  if (percentile > 99) intensity = 6;

  // Light mode: Start at 95% and decrease to 75% to maintain readability
  // Dark mode: Start at 5% and increase to 25% to maintain contrast
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

export function BookGrid({ data, onFilteredDataChange, tooltipOpen, setTooltipOpen }: BookGridProps) {
  const maxRecommendations = Math.max(
    ...data.map((book) => getRecommendationCount(book.recommender))
  );

  const enhancedData: EnhancedBook[] = data.map((book) => ({
    ...book,
    _recommendationCount: getRecommendationCount(book.recommender),
  }));

  const columns = [
    {
      field: "title" as keyof FormattedBook,
      header: "Title",
      width: 150,
      cell: TitleCell,
    },
    { field: "author" as keyof FormattedBook, header: "Author", width: 120 },
    {
      field: "description" as keyof FormattedBook,
      header: "Description",
      width: 200,
      isExpandable: true,
    },
    { field: "genres" as keyof FormattedBook, header: "Genres", width: 150 },
    {
      field: "recommender" as keyof FormattedBook,
      header: "Recommender",
      width: 200,
      cell: (props: CellProps) => (
        <RecommenderCell {...props} maxCount={maxRecommendations} tooltipOpen={tooltipOpen} setTooltipOpen={setTooltipOpen} />
      ),
      isExpandable: true,
    },
    {
      field: "source" as keyof FormattedBook,
      header: "Source",
      width: 150,
      cell: SourceCell,
    },
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
  const [filteredCount, setFilteredCount] = useState(initialBooks.length);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFilteredDataChange = useCallback((count: number) => {
    setFilteredCount(count);
  }, []);

  if (!mounted) {
    return;
  }

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 overflow-hidden">
        <BookGrid
          data={initialBooks}
          onFilteredDataChange={handleFilteredDataChange}
          tooltipOpen={tooltipOpen}
          setTooltipOpen={setTooltipOpen}
        />
      </div>
      <BookCounter total={initialBooks.length} filtered={filteredCount} />
    </div>
  );
}
