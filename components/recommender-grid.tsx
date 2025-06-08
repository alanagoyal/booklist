"use client";

import { useCallback } from "react";
import { DataGrid } from "@/components/grid";
import { FormattedRecommender } from "@/types";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { truncateText } from "@/utils/text";
import { formatPercentile } from "@/utils/format";
import { InfoIcon } from './icons'

interface RecommenderGridProps {
  data: FormattedRecommender[];
  isMobile: boolean;
}

// Recommendation cell
function RecommendationCell({
  original,
  isMobile,
}: {
  original: FormattedRecommender;
  isMobile: boolean;
}) {
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
  const moreCount =
    original.recommendations.length > 1
      ? original.recommendations.length - 1
      : 0;

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
              className="text-text md:hover:text-muted-foreground md:hover:underline transition-colors duration-200 text-left w-full whitespace-pre-line"
            >
              {truncateText(firstBook.title, 35, moreCount)}
              {moreCount > 0 && (
                <span className="text-muted-foreground"> + {moreCount} more</span>
              )}
            </button>
          )}
        </span>
        {!isMobile && (
          <button
            title={formatPercentile(original.recommendation_percentile) + " percentile"}
            className="inline-flex items-center justify-center rounded-full text-muted-foreground md:hover:text-text transition-colors duration-200 cursor-help shrink-0"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <InfoIcon />
          </button>
        )}
      </span>
    </div>
  );
}

export default function RecommenderGrid({
  data,
  isMobile,
}: RecommenderGridProps) {
  // Hooks
  const router = useRouter();
  const searchParams = useSearchParams();

  // Row click handler
  const pathname = usePathname();
  
  const handleRowClick = useCallback(
    (recommender: FormattedRecommender) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("key", `${recommender.id}--${Date.now()}`);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
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
        <RecommendationCell original={props.row.original} isMobile={isMobile} />
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
        `cursor-pointer ${row._background_color || ""}`
      }
      onRowClick={handleRowClick}
    />
  );
}
