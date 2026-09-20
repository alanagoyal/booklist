"use client";

import { useCallback, useMemo, memo } from "react";
import { openEntity } from "../utils/use-entity-click";
import { DataGrid } from "@/components/grid";
import { PersonRow, rowClassName } from "@/utils/catalog";
import { truncateText } from "@/utils/text";
import { formatPercentile } from "@/utils/format";
import { InfoIcon } from './icons'

interface RecommenderGridProps {
  data: PersonRow[];
}

// Recommendation cell
function RecommendationCell({
  original,
}: {
  original: PersonRow;
}) {

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
                openEntity(firstBook.id);
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
        <button
            title={formatPercentile(original.recommendation_percentile) + " percentile"}
            className="hidden md:inline-flex items-center justify-center rounded-full text-muted-foreground md:hover:text-text transition-colors duration-200 cursor-help shrink-0"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <InfoIcon />
        </button>
      </span>
    </div>
  );
}

function RecommenderGrid({
  data,
}: RecommenderGridProps) {
  // Row click handler
  const handleRowClick = useCallback(
    (recommender: PersonRow) => openEntity(recommender.id),
    []
  );

  // Columns
  const columns = useMemo(() => [
    {
      field: "full_name" as keyof PersonRow,
      header: "Name",
    },
    {
      field: "recommendations" as keyof PersonRow,
      header: "Recommendations",
      cell: (props: { row: { original: PersonRow } }) => (
        <RecommendationCell original={props.row.original} />
      ),
    },
    {
      field: "type" as keyof PersonRow,
      header: "Type",
      cell: (props: { row: { original: PersonRow } }) => (
        <div className="whitespace-pre-line line-clamp-2 text-text selection:bg-main selection:text-mtext transition-all duration-200">
          {props.row.original.type}
        </div>
      ),
    },
    {
      field: "recommender_description" as keyof PersonRow,
      header: "Description",
      cell: (props: { row: { original: PersonRow } }) => (
        <div className="whitespace-pre-line line-clamp-2 text-text selection:bg-main selection:text-mtext transition-all duration-200">
          {props.row.original.description || ""}
        </div>
      ),
    },
    {
      field: "_book_count" as keyof PersonRow,
      header: "Book Count",
    },
  ], []);

  return (
    <DataGrid
      data={data}
      columns={columns}
      getRowClassName={rowClassName}
      onRowClick={handleRowClick}
    />
  );
}

export default memo(RecommenderGrid);
