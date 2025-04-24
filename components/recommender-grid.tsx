"use client";

import { useCallback } from "react";
import { DataGrid } from "@/components/grid";
import { FormattedRecommender } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { getBackgroundColor } from "@/utils/colors";
import { truncateText } from "@/utils/text";

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
      {firstBook && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleBookClick(firstBook.id);
          }}
          className="text-text md:hover:text-text/70 md:hover:underline transition-colors duration-200 text-left w-full whitespace-pre-line"
        >
          {truncateText(firstBook.title, 45, moreCount)}
          {moreCount > 0 && <span className="text-text/70"> + {moreCount} more</span>}
        </button>
      )}
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
        `cursor-pointer transition-colors duration-200 ${getBackgroundColor(row._book_count, Math.max(...data.map((r) => r._book_count)))}`
      }
      onRowClick={handleRowClick}
      onFilteredDataChange={onFilteredDataChange}
    />
  );
}
