"use client";

import { useCallback } from "react";
import { DataGrid } from "@/components/grid";
import { FormattedRecommender } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { truncateText } from "@/utils/text";

const getBackgroundColor = (count: number): string => {
  if (!count) return "";

  // Use discrete intensity levels based on actual count values
  // Similar to GitHub's contribution graph
  let intensity = 0;
  if (count >= 1) intensity = 1;
  if (count >= 2) intensity = 2;
  if (count >= 3) intensity = 3;
  if (count >= 5) intensity = 4;
  if (count >= 8) intensity = 5;
  if (count >= 13) intensity = 6;

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

interface RecommenderGridProps {
  data: FormattedRecommender[];
  onFilteredDataChange?: (count: number) => void;
}

// Recommendation cell  
function RecommendationCell({ original }: { original: FormattedRecommender }) {
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

  const firstBook = original.recommendations[0];
  const moreCount = original.recommendations.length > 1 ? original.recommendations.length - 1 : 0;

  return (
    <div className="text-text">
      <span className="flex items-start gap-1">
        <span className="flex-1">
          {firstBook && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleBookClick(firstBook.id);
              }}
              className="text-text md:hover:text-text/70 md:hover:underline transition-colors duration-200 text-left w-full whitespace-pre-line"
            >
              {truncateText(firstBook.title, 38, moreCount)}
              {moreCount > 0 && <span className="text-text/70"> + {moreCount} more</span>}
            </button>
          )}
        </span>
        <button 
          title={`${original._book_count} books`}
          className="inline-flex items-center justify-center rounded-full text-text/70 md:hover:text-text transition-colors duration-200 cursor-help shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
        </button>
      </span>
    </div>
  );
}

export default function RecommenderGrid({
  data,
  onFilteredDataChange,
}: RecommenderGridProps) {
  // Hooks
  const router = useRouter();
  const searchParams = useSearchParams();

  // Debug log for data length and counts
  console.log("RecommenderGrid data length:", data.length);
  console.log("RecommenderGrid book count range:", 
    Math.min(...data.map(r => r._book_count || 0)), "to", 
    Math.max(...data.map(r => r._book_count || 0)));

  // Row click handler
  const handleRowClick = useCallback(
    (recommender: FormattedRecommender) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("key", `${recommender.id}--${Date.now()}`);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Columns
  const columns = [
    {
      field: "full_name" as keyof FormattedRecommender,
      header: "Name",
    },
    {
      field: "recommendations" as keyof FormattedRecommender,
      header: "Recommendations",
      cell: (props: { row: { original: FormattedRecommender } }) => (
        <RecommendationCell original={props.row.original} />
      ),
    },
    {
      field: "type" as keyof FormattedRecommender,
      header: "Type",
      cell: (props: { row: { original: FormattedRecommender } }) => (
        <div className="whitespace-pre-line line-clamp-2 text-text selection:bg-main selection:text-mtext transition-all duration-200">
          {props.row.original.type}
        </div>
      ),
    },
    {
      field: "recommender_description" as keyof FormattedRecommender,
      header: "Description",
      cell: (props: { row: { original: FormattedRecommender } }) => (
        <div className="whitespace-pre-line line-clamp-2 text-text selection:bg-main selection:text-mtext transition-all duration-200">
          {props.row.original.description || ""}
        </div>
      ),
    },
    {
      field: "_book_count" as keyof FormattedRecommender,
      header: "Book Count",
    },
  ];

  return (
    <DataGrid
      data={data}
      columns={columns}
      getRowClassName={(row: FormattedRecommender) =>
        `cursor-pointer transition-colors duration-200 ${getBackgroundColor(row._book_count)}`
      }
      onRowClick={handleRowClick}
      onFilteredDataChange={onFilteredDataChange}
    />
  );
}
