"use client";

import { Fragment, useState, useEffect, useCallback, useMemo } from "react";
import { DataGrid } from "@/components/grid";
import { PercentileTooltip } from "@/components/percentile-tooltip";
import { FormattedBook, EnhancedBook } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";

// Title cell
function TitleCell({ row: { original } }: { row: { original: EnhancedBook } }) {
  return <span className="text-text whitespace-pre-line line-clamp-2">{original.title}</span>;
}

// Recommender cell
function RecommenderCell({ original }: { original: EnhancedBook }) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const handleRecommenderClick = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', `${id}--${Date.now()}`);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);
  
  return (
    <div className="whitespace-pre-line line-clamp-2 text-text">
      <span
        className="flex items-center gap-1"
        onClick={(e) => tooltipOpen && e.stopPropagation()}
      >
        <span className="break-words">
          {original._top_recommenders?.slice(0, 1).map((rec) => (
            <Fragment key={rec.id}>
              <span className="inline whitespace-nowrap">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRecommenderClick(rec.id);
                  }}
                  className="text-text md:hover:text-text/70 md:hover:underline transition-colors duration-200"
                >
                  {rec.full_name}
                </button>
              </span>
            </Fragment>
          ))}
          {(original._top_recommenders?.length ?? 0) > 1 && (
            <span className="text-text/70">
              {" "}+ {(original._top_recommenders?.length ?? 0) - 1} more
            </span>
          )}
        </span>
        <PercentileTooltip
          percentile={original._percentile}
          open={tooltipOpen}
          setOpen={setTooltipOpen}
        />
      </span>
    </div>
  );
}

// Genre cell
function GenreCell({ original }: { original: EnhancedBook }) {
  return (
    <div className="whitespace-pre-line line-clamp-2 text-text">
      <span className="break-words">
        {Array.isArray(original.genres) 
          ? original.genres.map((genre, i, arr) => (
              <Fragment key={genre}>
                <span className="inline whitespace-nowrap">
                  {genre}
                  {i < arr.length - 1 && ", "}
                </span>
                {i < arr.length - 1 && " "}
              </Fragment>
            ))
          : original.genres}
      </span>
    </div>
  );
}

// Background color helper
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

export default function BookGrid({
  data,
  onFilteredDataChange,
}: {
  data: FormattedBook[];
  onFilteredDataChange?: (count: number) => void;
}) {
  // Hooks
  const router = useRouter();
  const searchParams = useSearchParams();

  // Do all expensive computations once when data is received
  const enhancedData: EnhancedBook[] = useMemo(() => {
    const maxRecommendations = Math.max(
      ...data.map((book) => book.recommendations.length)
    );

    // First compute total recommendations per recommender for sorting
    const recommenderCounts = data.reduce((counts: Record<string, number>, book) => {
      book.recommendations.forEach(rec => {
        if (rec.recommender) {
          counts[rec.recommender.id] = (counts[rec.recommender.id] || 0) + 1;
        }
      });
      return counts;
    }, {});

    return data.map((book) => {
      // Get unique recommenders and sort by their total recommendation count
      const recommenders = [...new Map(
        book.recommendations
          .filter(rec => rec.recommender)
          .map(rec => [rec.recommender!.id, {
            id: rec.recommender!.id,
            full_name: rec.recommender!.full_name,
            recommendation_count: recommenderCounts[rec.recommender!.id]
          }])
      ).values()].sort((a, b) => b.recommendation_count - a.recommendation_count);

      return {
        ...book,
        _recommendation_count: book.recommendations.length,
        _top_recommenders: recommenders,
        _percentile: Math.round((book.recommendations.length / maxRecommendations) * 100)
      };
    });
  }, [data]);

  // Row click handler
  const handleRowClick = useCallback((book: EnhancedBook) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', `${book.id || book.title}--${Date.now()}`);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Columns
  const columns = [
    {
      field: "title" as keyof FormattedBook,
      header: "Title",
      cell: (props: { row: { original: EnhancedBook } }) => <TitleCell {...props} />,
    },
    { field: "author" as keyof FormattedBook, header: "Author" },
    {
      field: "recommenders" as keyof FormattedBook,
      header: "Recommenders",
      cell: (props: { row: { original: EnhancedBook } }) => (
        <RecommenderCell original={props.row.original} />
      ),
    },
    { field: "description" as keyof FormattedBook, header: "Description" },
    {
      field: "genres" as keyof FormattedBook,
      header: "Genre",
      cell: (props: { row: { original: EnhancedBook } }) => (
        <GenreCell original={props.row.original} />
      ),
    },
  ];

  return (
    <DataGrid
      data={enhancedData}
      columns={columns}
      getRowClassName={(row: EnhancedBook) =>
        `cursor-pointer transition-colors duration-200 ${getBackgroundColor(row._recommendation_count, Math.max(...enhancedData.map(b => b._recommendation_count)))}`
      }
      onRowClick={handleRowClick}
      onFilteredDataChange={onFilteredDataChange}
    />
  );
}