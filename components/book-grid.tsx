"use client";

import { Fragment, useState, useCallback, useMemo } from "react";
import { DataGrid } from "@/components/grid";
import { FormattedBook } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";

// Title cell
function TitleCell({ row: { original } }: { row: { original: FormattedBook } }) {
  return <span className="text-text whitespace-pre-line line-clamp-2">{original.title}</span>;
}

// Truncate text to ensure "+ X more" is visible
function truncateRecommenders(text: string, moreCount: number) {
  const moreSuffix = moreCount > 0 ? ` + ${moreCount} more` : "";
  const maxLength = 35; // Adjust based on your cell width
  
  if (text.length + moreSuffix.length <= maxLength) {
    return text;
  }
  
  return text.slice(0, maxLength - moreSuffix.length - 3) + "...";
}

// Recommender cell
function RecommenderCell({ original }: { original: FormattedBook }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const handleRecommenderClick = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('key', `${id}--${Date.now()}`);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);
  
  const firstRecommender = original.recommendations?.[0]?.recommender;
  const recommenderString = original.recommendations?.map((recommender) => recommender.recommender?.full_name).join(", ");
  const moreCount = (original.recommendations?.length ?? 0) > 1 ? (original.recommendations?.length ?? 0) - 1 : 0;
  
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
              className="text-text md:hover:text-text/70 md:hover:underline transition-colors duration-200 text-left w-full whitespace-pre-line"
            >
              {truncateRecommenders(recommenderString, moreCount)}
              {moreCount > 0 && <span className="text-text/70"> + {moreCount} more</span>}
            </button>
          )}
        </span>
        <button 
          title={`${original._percentile}${(original._percentile % 100 > 10 && original._percentile % 100 < 14) ? 'th' : original._percentile % 10 === 1 ? 'st' : original._percentile % 10 === 2 ? 'nd' : original._percentile % 10 === 3 ? 'rd' : 'th'} percentile of all recommendations`}
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

// Genre cell
function GenreCell({ original }: { original: FormattedBook }) {
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

interface BookGridProps {
  data: FormattedBook[];
  onFilteredDataChange?: (count: number) => void;
}

export default function BookGrid({ data, onFilteredDataChange }: BookGridProps) {
  // Hooks
  const router = useRouter();
  const searchParams = useSearchParams();

  // Row click handler
  const handleRowClick = useCallback((book: FormattedBook) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('key', `${book.id || book.title}--${Date.now()}`);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Columns
  const columns = [
    {
      field: "title" as keyof FormattedBook,
      header: "Title",
      cell: (props: { row: { original: FormattedBook } }) => <TitleCell {...props} />,
    },
    { field: "author" as keyof FormattedBook, header: "Author" },
    {
      field: "recommenders" as keyof FormattedBook,
      header: "Recommenders",
      cell: (props: { row: { original: FormattedBook } }) => (
        <RecommenderCell original={props.row.original} />
      ),
    },
    {
      field: "book_description" as keyof FormattedBook,
      header: "Description",
      cell: (props: { row: { original: FormattedBook } }) => (
        <div className="whitespace-pre-line line-clamp-2 text-text selection:bg-main selection:text-mtext transition-all duration-200">
          {props.row.original.description}
        </div>
      ),
    },
    {
      field: "genres" as keyof FormattedBook,
      header: "Genre",
      cell: (props: { row: { original: FormattedBook } }) => (
        <GenreCell original={props.row.original} />
      ),
    },
  ];

  return (
    <DataGrid
      data={data}
      columns={columns}
      getRowClassName={(row: FormattedBook) =>
        `cursor-pointer transition-colors duration-200 ${getBackgroundColor(row._recommendation_count, Math.max(...data.map(b => b._recommendation_count)))}`
      }
      onRowClick={handleRowClick}
      onFilteredDataChange={onFilteredDataChange}
    />
  );
}