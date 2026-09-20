"use client";

import { Fragment, useCallback } from "react";
import { useEntityClick } from "../utils/use-entity-click";
import { DataGrid } from "@/components/grid";
import { EssentialBook } from "@/types";
import { truncateText } from "@/utils/text";
import { formatPercentile } from "../utils/format";
import { InfoIcon } from './icons';

// Title cell
function TitleCell({
  row: { original },
}: {
  row: { original: EssentialBook };
}) {
  return (
    <span className="text-text whitespace-pre-line line-clamp-2">
      {original.title}
    </span>
  );
}

// Recommender cell
function RecommenderCell({
  original,
  isMobile,
}: {
  original: EssentialBook;
  isMobile: boolean;
}) {
  const handleRecommenderClick = useEntityClick();

  const firstRecommender = original.recommendations?.[0]?.recommender;
  const moreCount =
    (original.recommendations?.length ?? 0) > 1
      ? (original.recommendations?.length ?? 0) - 1
      : 0;

  return (
    <div className="text-text">
      <span className="flex items-start gap-1">
        <span className="flex-1">
          {firstRecommender && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRecommenderClick(firstRecommender.id);
              }}
              className="text-text md:hover:text-muted-foreground md:hover:underline transition-colors duration-200 text-left w-full whitespace-pre-line"
            >
              {truncateText(firstRecommender.full_name, 35, moreCount)}
              {moreCount > 0 && (
                <span className="text-muted-foreground"> + {moreCount} more</span>
              )}
            </button>
          )}
        </span>
        {!isMobile && (
          <button
            title={
              formatPercentile(original.recommendation_percentile) +
              " percentile"
            }
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

// Genre cell
function GenreCell({ original }: { original: EssentialBook }) {
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

interface BookGridProps {
  data: EssentialBook[];
  isMobile: boolean;
}

export default function BookGrid({ data, isMobile }: BookGridProps) {
  // Row click handler
  const handleEntityClick = useEntityClick();
  const handleRowClick = useCallback(
    (book: EssentialBook) => handleEntityClick(book.id || book.title),
    [handleEntityClick]
  );

  // Columns
  const columns = [
    {
      field: "title" as keyof EssentialBook,
      header: "Title",
      cell: (props: { row: { original: EssentialBook } }) => (
        <TitleCell {...props} />
      ),
    },
    { field: "author" as keyof EssentialBook, header: "Author" },
    {
      field: "recommenders" as keyof EssentialBook,
      header: "Recommenders",
      cell: (props: { row: { original: EssentialBook } }) => (
        <RecommenderCell original={props.row.original} isMobile={isMobile} />
      ),
    },
    {
      field: "book_description" as keyof EssentialBook,
      header: "Description",
      cell: (props: { row: { original: EssentialBook } }) => (
        <div className="whitespace-pre-line line-clamp-2 text-text selection:bg-main selection:text-mtext transition-all duration-200">
          {props.row.original.description}
        </div>
      ),
    },
    {
      field: "genres" as keyof EssentialBook,
      header: "Genre",
      cell: (props: { row: { original: EssentialBook } }) => (
        <GenreCell original={props.row.original} />
      ),
    },
  ];

  return (
    <DataGrid
      data={data}
      columns={columns}
      getRowClassName={(row: EssentialBook) =>
        `cursor-pointer ${row._background_color}`
      }
      onRowClick={handleRowClick}
    />
  );
}
