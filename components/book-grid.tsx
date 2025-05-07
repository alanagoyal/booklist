"use client";

import { Fragment, useCallback } from "react";
import { DataGrid } from "@/components/grid";
import { FormattedBook } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { truncateText } from "@/utils/text";

// Title cell
function TitleCell({ row: { original } }: { row: { original: FormattedBook } }) {
  return <span className="text-text whitespace-pre-line line-clamp-2">{original.title}</span>;
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
              {truncateText(firstRecommender.full_name, 35, moreCount)}
              {moreCount > 0 && <span className="text-text/70"> + {moreCount} more</span>}
            </button>
          )}
        </span>
        <button 
          title={`${original._recommendation_count} recommendations`}
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
        `cursor-pointer ${row._background_color}`
      }
      onRowClick={handleRowClick}
      onFilteredDataChange={onFilteredDataChange}
    />
  );
}