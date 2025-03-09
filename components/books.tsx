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
  website_url: string;
  twitter_url: string;
  wiki_url: string;
  amazon_url: string;
}

interface ExpandedState {
  [key: string]: boolean;
}

interface EnhancedBook extends FormattedBook {
  _expanded: ExpandedState;
  _toggleExpand: (id: string) => void;
  _recommendationCount: number;
}

interface CellProps {
  row: {
    original: EnhancedBook;
  };
}

const useExpandableState = () => {
  const [expandedItems, setExpandedItems] = useState<ExpandedState>({});
  
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return { expandedItems, toggleExpand };
};

const SourceCell = ({ row: { original } }: CellProps) => {
  const sourceText = original.source || '';
  const sources = sourceText.split(',').map(s => s.trim()).filter(Boolean);
  const sourceLinks = (original.source_link?.split(',').map(l => l.trim()) || [])
    .concat(Array(sources.length).fill(null));

  if (sources.length === 0) {
    return <span></span>;
  }

  const cellId = `source-${original.id}`;
  const isExpanded = original._expanded?.[cellId] || false;
  const displayCount = !isExpanded && sources.length > 2 ? 2 : sources.length;

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
      {!isExpanded && sources.length > 2 && (
        <>
          {", "}
          <button
            onClick={() => original._toggleExpand?.(cellId)}
            className="hover:underline"
          >
            + {sources.length - 2} more
          </button>
        </>
      )}
    </span>
  );
};

const TitleCell = function Title({ row: { original } }: CellProps) {
  const title = original.title || '';
  const amazonUrl = original.amazon_url;
      
  return amazonUrl ? (
    <a
      href={amazonUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline"
    >
      {title}
    </a>
  ) : (
    <span>{title}</span>
  );
};

const RecommenderCell = function Recommender({ row: { original } }: CellProps) {
  const recommenderText = original.recommender || '';
  const recommenders = recommenderText.split(',').map(r => r.trim()).filter(Boolean);
  
  const websiteUrls = (original.website_url?.split(',').map(url => url.trim()) || [])
    .concat(Array(recommenders.length).fill(null));
  const twitterUrls = (original.twitter_url?.split(',').map(url => url.trim()) || [])
    .concat(Array(recommenders.length).fill(null));
  const wikiUrls = (original.wiki_url?.split(',').map(url => url.trim()) || [])
    .concat(Array(recommenders.length).fill(null));

  if (recommenders.length === 0) {
    return <span></span>;
  }

  const cellId = `recommender-${original.id}`;
  const isExpanded = original._expanded?.[cellId] || false;
  const displayCount = !isExpanded && recommenders.length > 2 ? 2 : recommenders.length;

  return (
    <span>
      {recommenders.slice(0, displayCount).map((rec, i) => {
        const recommenderUrl = twitterUrls[i] || websiteUrls[i] || wikiUrls[i];
            
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
      {!isExpanded && recommenders.length > 2 && (
        <>
          {", "}
          <button
            onClick={() => original._toggleExpand?.(cellId)}
            className="hover:underline"
          >
            + {recommenders.length - 2} more
          </button>
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
  
  // Use Tailwind's color opacity classes
  switch (intensity) {
    case 1: return 'bg-emerald-50 dark:bg-[#121212]/20';
    case 2: return 'bg-emerald-100 dark:bg-[#121212]/40';
    case 3: return 'bg-emerald-200 dark:bg-[#121212]/60';
    case 4: return 'bg-emerald-300 dark:bg-[#121212]/80';
    default: return '';
  }
};

const columns: { 
  field: keyof FormattedBook; 
  header: string; 
  width?: number;
  cell?: (props: CellProps) => React.ReactNode;
}[] = [
  { 
    field: "title", 
    header: "Title", 
    width: 150,
    cell: TitleCell
  },
  { field: "author", header: "Author", width: 120 },
  { field: "description", header: "Description", width: 200 },
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
  const { expandedItems, toggleExpand } = useExpandableState();

  // Calculate max recommendation count
  const maxRecommendations = Math.max(
    ...data.map(book => getRecommendationCount(book.recommender))
  );

  const enhancedData: EnhancedBook[] = data.map(book => ({
    ...book,
    _expanded: expandedItems,
    _toggleExpand: toggleExpand,
    _recommendationCount: getRecommendationCount(book.recommender)
  }));

  return (
    <DataGrid
      data={enhancedData}
      columns={columns}
      getRowClassName={(row) => 
        getBackgroundColor(row._recommendationCount, maxRecommendations)
      }
    />
  );
}
