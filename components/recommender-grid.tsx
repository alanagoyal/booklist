"use client";

import { Fragment, useCallback, useMemo } from "react";
import { DataGrid } from "@/components/grid";
import { FormattedBook, FormattedRecommender } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";

type EnhancedRecommender = {
  id: string;
  full_name: string;
  type: string;
  description: string | null;
  recommendations: FormattedBook[];
  _book_count: number;
  _percentile: number;
};

interface RecommenderGridProps {
  data: FormattedRecommender[];
  onFilteredDataChange?: (count: number) => void;
}

function BookCell({ original }: { original: EnhancedRecommender }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleBookClick = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("key", `${id}--${Date.now()}`);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  return (
    <div className="whitespace-pre-line line-clamp-2 text-text">
      <span className="break-words">
        {original.recommendations.slice(0, 1).map((book) => (
          <Fragment key={book.id}>
            <span className="inline whitespace-nowrap">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleBookClick(book.id);
                }}
                className="text-text md:hover:text-text/70 md:hover:underline transition-colors duration-200"
              >
                {book.title}
              </button>
            </span>
          </Fragment>
        ))}
        {original.recommendations.length > 1 && (
          <span className="text-text/70">
            {" "}
            + {original.recommendations.length - 1} more
          </span>
        )}
      </span>
    </div>
  );
}

// Background color helper - reused from BookGrid
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

export default function RecommenderGrid({
  data,
  onFilteredDataChange,
}: RecommenderGridProps) {
  // Hooks
  const router = useRouter();
  const searchParams = useSearchParams();

  // Transform recommender data into grid format
  const enhancedData: EnhancedRecommender[] = useMemo(() => {
    return data
      .map((recommender) => ({
        id: recommender.id,
        full_name: recommender.full_name,
        type: recommender.type || "Unknown",
        description: recommender.description || null,
        recommendations: recommender.recommendations.map((book) => ({
          ...book,
          genres: book.genre || [], // Convert genre to genres
          amazon_url: book.amazon_url || "", // Ensure amazon_url is always a string
          recommendations: [], // Add empty recommendations array
        })) as FormattedBook[],
        _book_count: recommender.recommendations.length,
        _percentile: 0,
      }))
      .map((rec, _, arr) => {
        const maxBooks = Math.max(...arr.map((r) => r._book_count));
        return {
          ...rec,
          _percentile: Math.round((rec._book_count / maxBooks) * 100),
        };
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [data]);

  // Row click handler
  const handleRowClick = useCallback(
    (recommender: EnhancedRecommender) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("key", `${recommender.id}--${Date.now()}`);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Columns
  const columns = [
    {
      field: "full_name" as keyof EnhancedRecommender,
      header: "Name",
    },
    {
      field: "recommendations" as keyof EnhancedRecommender,
      header: "Recommendations",
      cell: (props: { row: { original: EnhancedRecommender } }) => (
        <BookCell original={props.row.original} />
      ),
    },
    {
      field: "type" as keyof EnhancedRecommender,
      header: "Type",
      cell: (props: { row: { original: EnhancedRecommender } }) => (
        <div className="whitespace-pre-line line-clamp-2 text-text selection:bg-main selection:text-mtext transition-all duration-200">
          {props.row.original.type}
        </div>
      ),
    },
    {
      field: "recommender_description" as keyof EnhancedRecommender,
      header: "Description",
      cell: (props: { row: { original: EnhancedRecommender } }) => (
        <div className="whitespace-pre-line line-clamp-2 text-text selection:bg-main selection:text-mtext transition-all duration-200">
          {props.row.original.description || ""}
        </div>
      ),
    },
    {
      field: "_book_count" as keyof EnhancedRecommender,
      header: "Book Count",
    },
  ];

  return (
    <DataGrid
      data={enhancedData}
      columns={columns}
      getRowClassName={(row: EnhancedRecommender) =>
        `cursor-pointer transition-colors duration-200 ${getBackgroundColor(row._book_count, Math.max(...enhancedData.map((r) => r._book_count)))}`
      }
      onRowClick={handleRowClick}
      onFilteredDataChange={onFilteredDataChange}
    />
  );
}
