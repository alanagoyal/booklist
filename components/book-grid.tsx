"use client";

import { Fragment, useCallback, useMemo, memo } from "react";
import { openEntity } from "../utils/use-entity-click";
import { DataGrid } from "@/components/grid";
import { BookRow, rowClassName } from "@/utils/catalog";
import { truncateText } from "@/utils/text";
import { formatPercentile } from "../utils/format";
import { InfoIcon } from './icons';

// Title cell
function TitleCell({
  row: { original },
}: {
  row: { original: BookRow };
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
}: {
  original: BookRow;
}) {

  const firstRecommender = original.recommendations?.[0];
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
                openEntity(firstRecommender.id);
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
        <button
            title={
              formatPercentile(original.recommendation_percentile) +
              " percentile"
            }
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

// Genre cell
function GenreCell({ original }: { original: BookRow }) {
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
  data: BookRow[];
}

function BookGrid({ data }: BookGridProps) {
  // Row click handler
  const handleRowClick = useCallback(
    (book: BookRow) => openEntity(book.id || book.title),
    []
  );

  // Columns
  const columns = useMemo(() => [
    {
      field: "title" as keyof BookRow,
      header: "Title",
      cell: (props: { row: { original: BookRow } }) => (
        <TitleCell {...props} />
      ),
    },
    { field: "author" as keyof BookRow, header: "Author" },
    {
      field: "recommenders" as keyof BookRow,
      header: "Recommenders",
      cell: (props: { row: { original: BookRow } }) => (
        <RecommenderCell original={props.row.original} />
      ),
    },
    {
      field: "book_description" as keyof BookRow,
      header: "Description",
      cell: (props: { row: { original: BookRow } }) => (
        <div className="whitespace-pre-line line-clamp-2 text-text selection:bg-main selection:text-mtext transition-all duration-200">
          {props.row.original.description}
        </div>
      ),
    },
    {
      field: "genres" as keyof BookRow,
      header: "Genre",
      cell: (props: { row: { original: BookRow } }) => (
        <GenreCell original={props.row.original} />
      ),
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

export default memo(BookGrid);
