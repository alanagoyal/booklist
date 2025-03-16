"use client";

import { Fragment, useState, useEffect, useCallback } from 'react';
import { DataGrid } from "@/components/grid";
import { BookCounter } from "@/components/book-counter";

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
  onFilteredDataChange?: (count: number) => void;
}

const getRecommendationCount = (recommender: string): number => {
  return recommender ? recommender.split(',').filter(r => r.trim()).length : 0;
};

const getBackgroundColor = (count: number, maxCount: number): string => {
  if (count === 0) return '';
  
  // Create 6 intensity levels
  const intensity = Math.ceil((count / maxCount) * 6);
  
  // Light mode: Start at 95% and decrease to 75% to maintain readability
  // Dark mode: Start at 5% and increase to 25% to maintain contrast
  switch (intensity) {
    case 1: return 'bg-[hsl(151,80%,95%)] hover:bg-[hsl(151,80%,92%)] dark:bg-[hsl(160,84%,5%)] dark:hover:bg-[hsl(160,84%,7%)] transition-colors duration-200';
    case 2: return 'bg-[hsl(151,80%,90%)] hover:bg-[hsl(151,80%,88%)] dark:bg-[hsl(160,84%,9%)] dark:hover:bg-[hsl(160,84%,11%)] transition-colors duration-200';
    case 3: return 'bg-[hsl(151,80%,85%)] hover:bg-[hsl(151,80%,84%)] dark:bg-[hsl(160,84%,13%)] dark:hover:bg-[hsl(160,84%,15%)] transition-colors duration-200';
    case 4: return 'bg-[hsl(151,80%,80%)] hover:bg-[hsl(151,80%,80%)] dark:bg-[hsl(160,84%,17%)] dark:hover:bg-[hsl(160,84%,19%)] transition-colors duration-200';
    case 5: return 'bg-[hsl(151,80%,75%)] hover:bg-[hsl(151,80%,76%)] dark:bg-[hsl(160,84%,21%)] dark:hover:bg-[hsl(160,84%,23%)] transition-colors duration-200';
    case 6: return 'bg-[hsl(151,80%,70%)] hover:bg-[hsl(151,80%,72%)] dark:bg-[hsl(160,84%,25%)] dark:hover:bg-[hsl(160,84%,27%)] transition-colors duration-200';
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

export function BookGrid({ data, onFilteredDataChange }: BookGridProps) {
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
      onFilteredDataChange={onFilteredDataChange}
    />
  );
}

export function BookList({ initialBooks }: { initialBooks: FormattedBook[] }) {
  const [mounted, setMounted] = useState(false);
  const [filteredCount, setFilteredCount] = useState(initialBooks.length);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFilteredDataChange = useCallback((count: number) => {
    setFilteredCount(count);
  }, []);

  if (!mounted) {
    return (
      <div className="h-full flex flex-col relative">
        <div className="flex-1 overflow-hidden">
          <div className="text-text/70 transition-colors duration-200">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 overflow-hidden">
        <BookGrid data={initialBooks} onFilteredDataChange={handleFilteredDataChange} />
      </div>
      <BookCounter total={initialBooks.length} filtered={filteredCount} />
    </div>
  );
}
