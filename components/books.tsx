"use client";

import { Fragment, useState } from 'react';
import { DataGrid } from "@/components/grid";

interface FormattedBook {
  id: number;
  title: string;
  author: string;
  description: string;
  genres: string;
  recommender: string;
  source: string;
  source_link: string;
  url: string;
  amazon_url: string;
}

interface EnhancedBook extends FormattedBook {
  _recommendationCount: number;
}

interface CellProps {
  row: {
    original: EnhancedBook;
    isExpanded: boolean;
  };
}

const SourceCell = ({ row: { original, isExpanded } }: CellProps) => {
  const sourceText = original.source || '';
  const sources = sourceText.split(',').map(s => s.trim()).filter(Boolean);
  const sourceLinks = (original.source_link?.split(',').map(l => l.trim()) || [])
    .concat(Array(sources.length).fill(null));

  if (sources.length === 0) {
    return <span></span>;
  }

  const displayCount = !isExpanded ? 2 : sources.length;

  return (
    <span>
      {sources.slice(0, displayCount).map((source, i) => (
        <Fragment key={i}>
          {i > 0 && ", "}
          {sourceLinks[i] ? (
            <a
              href={sourceLinks[i]}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {source}
            </a>
          ) : (
            <span>{source}</span>
          )}
        </Fragment>
      ))}
      {!isExpanded && sources.length > displayCount && (
        <>
          {", "}
          <span className="text-text/70">
            + {sources.length - displayCount} more
          </span>
        </>
      )}
    </span>
  );
};

const TitleCell = function Title({ row: { original, isExpanded } }: CellProps) {
  const title = original.title || '';
  const amazonUrl = original.amazon_url;
  
  const displayTitle = !isExpanded && title.length > 50 ? `${title.slice(0, 50)}...` : title;
      
  return amazonUrl ? (
    <a
      href={amazonUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline"
    >
      {displayTitle}
    </a>
  ) : (
    <span>{displayTitle}</span>
  );
};

const RecommenderCell = function Recommender({ row: { original, isExpanded } }: CellProps) {
  const recommenderText = original.recommender || '';
  const recommenders = recommenderText.split(',').map(r => r.trim()).filter(Boolean);
  
  const urls = (original.url?.split(',').map(url => url.trim()) || [])
    .concat(Array(recommenders.length).fill(null));

  if (recommenders.length === 0) {
    return <span></span>;
  }

  const displayCount = !isExpanded ? 2 : recommenders.length;

  return (
    <span>
      {recommenders.slice(0, displayCount).map((rec, i) => {
        const recommenderUrl = urls[i];
            
        return (
          <Fragment key={i}>
            {i > 0 && ", "}
            {recommenderUrl ? (
              <a
                href={recommenderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {rec}
              </a>
            ) : (
              <span>{rec}</span>
            )}
          </Fragment>
        );
      })}
      {!isExpanded && recommenders.length > displayCount && (
        <>
          {", "}
          <span className="text-text/70">
            + {recommenders.length - displayCount} more
          </span>
        </>
      )}
    </span>
  );
};

interface BookGridProps {
  data: FormattedBook[];
}

const getRecommendationCount = (recommender: string): number => {
  return recommender ? recommender.split(',').filter(r => r.trim()).length : 0;
};

const getBackgroundColor = (count: number, maxCount: number): string => {
  if (count === 0) return '';
  
  // Create 4 intensity levels like GitHub
  const intensity = Math.ceil((count / maxCount) * 4);
  
  // Use emerald theme colors with carefully tuned opacity levels
  // Light mode base: hsl(151, 80%, 95%)
  // Dark mode base: hsl(160, 84%, 5%)
  switch (intensity) {
    case 1: return 'bg-primary/10 hover:bg-primary/15 dark:bg-primary/20 dark:hover:bg-primary/25 transition-colors duration-200';
    case 2: return 'bg-primary/20 hover:bg-primary/25 dark:bg-primary/35 dark:hover:bg-primary/40 transition-colors duration-200';
    case 3: return 'bg-primary/30 hover:bg-primary/35 dark:bg-primary/50 dark:hover:bg-primary/55 transition-colors duration-200';
    case 4: return 'bg-primary/40 hover:bg-primary/45 dark:bg-primary/65 dark:hover:bg-primary/70 transition-colors duration-200';
    default: return '';
  }
};

const columns: { 
  field: keyof FormattedBook; 
  header: string; 
  width?: number;
  cell?: (props: CellProps) => React.ReactNode;
  isExpandable?: boolean;
}[] = [
  { 
    field: "title", 
    header: "Title", 
    width: 150,
    cell: TitleCell
  },
  { field: "author", header: "Author", width: 120 },
  { field: "description", header: "Description", width: 200, isExpandable: true },
  { field: "genres", header: "Genres", width: 150 },
  {
    field: "recommender",
    header: "Recommender",
    width: 150,
    cell: RecommenderCell
  },
  {
    field: "source",
    header: "Source",
    width: 150,
    cell: SourceCell
  },
];

export function BookGrid({ data }: BookGridProps) {
  // Calculate max recommendation count
  const maxRecommendations = Math.max(
    ...data.map(book => getRecommendationCount(book.recommender))
  );

  const enhancedData: EnhancedBook[] = data.map(book => ({
    ...book,
    _recommendationCount: getRecommendationCount(book.recommender)
  }));

  return (
    <DataGrid
      data={enhancedData}
      columns={columns}
      getRowClassName={(row: EnhancedBook) =>
        getBackgroundColor(row._recommendationCount, maxRecommendations)
      }
    />
  );
}
