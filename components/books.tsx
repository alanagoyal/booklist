"use client";

import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { DataGrid } from "@/components/grid";
import { BookCounter } from "@/components/book-counter";
import { PercentileTooltip } from "@/components/percentile-tooltip";
import { FormattedBook, EnhancedBook, FormattedRecommender, RecommenderReference } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import BookDetail from "@/components/book-detail";
import RecommenderDetail from "@/components/recommender-detail";

const TitleCell = function Title({
  row: { original },
}: {
  row: { original: EnhancedBook };
}) {
  const title = original.title || "";
  const displayTitle = title.length > 50 ? `${title.slice(0, 50)}...` : title;
  return <span className="text-text">{displayTitle}</span>;
};

function RecommenderCell({ original }: { original: EnhancedBook }) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const handleRecommenderClick = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', `${id}--${Date.now()}`);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);
  
  return (
    <div className="whitespace-pre-line line-clamp-2 text-text">
      <span
        className="flex items-center gap-1"
        onClick={(e) => tooltipOpen && e.stopPropagation()}
      >
        <span className="break-words">
          {original._top_recommenders?.slice(0, 2).map((rec, i, arr) => (
            <Fragment key={rec.id}>
              <span className="inline whitespace-nowrap">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRecommenderClick(rec.id);
                  }}
                  className="text-text md:hover:text-text/70 md:hover:underline transition-colors duration-200"
                >
                  {rec.full_name}
                </button>
                {i < arr.length - 1 && i < 1 && ", "}
              </span>
              {i < arr.length - 1 && i < 1 && " "}
            </Fragment>
          ))}
          {(original._top_recommenders?.length ?? 0) > 2 && (
            <span className="text-text/70">
              , + {(original._top_recommenders?.length ?? 0) - 2} more
            </span>
          )}
        </span>
        <PercentileTooltip
          percentile={original._percentile}
          open={tooltipOpen}
          setOpen={setTooltipOpen}
        />
      </span>
    </div>
  );
}

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

export function BookGrid({
  data,
  onFilteredDataChange,
}: {
  data: FormattedBook[];
  onFilteredDataChange?: (count: number) => void;
}) {
  // Do all expensive computations once when data is received
  const enhancedData: EnhancedBook[] = useMemo(() => {
    const maxRecommendations = Math.max(
      ...data.map((book) => book.recommendations.length)
    );

    // First compute total recommendations per recommender for sorting
    const recommenderCounts = data.reduce((counts: Record<string, number>, book) => {
      book.recommendations.forEach(rec => {
        if (rec.recommender) {
          counts[rec.recommender.id] = (counts[rec.recommender.id] || 0) + 1;
        }
      });
      return counts;
    }, {});

    return data.map((book) => {
      // Get unique recommenders and sort by their total recommendation count
      const recommenders = [...new Map(
        book.recommendations
          .filter(rec => rec.recommender)
          .map(rec => [rec.recommender!.id, {
            id: rec.recommender!.id,
            full_name: rec.recommender!.full_name,
            recommendation_count: recommenderCounts[rec.recommender!.id]
          }])
      ).values()].sort((a, b) => b.recommendation_count - a.recommendation_count);

      return {
        ...book,
        _recommendation_count: book.recommendations.length,
        _top_recommenders: recommenders,
        _percentile: Math.round((book.recommendations.length / maxRecommendations) * 100)
      };
    });
  }, [data]);

  const router = useRouter();
  const searchParams = useSearchParams();

  const handleRowClick = useCallback((book: EnhancedBook) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', `${book.id || book.title}--${Date.now()}`);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const columns = [
    {
      field: "title" as keyof FormattedBook,
      header: "Title",
      cell: (props: { row: { original: EnhancedBook } }) => <TitleCell {...props} />,
    },
    { field: "author" as keyof FormattedBook, header: "Author" },
    {
      field: "recommenders" as keyof FormattedBook,
      header: "Recommenders",
      cell: (props: { row: { original: EnhancedBook } }) => (
        <RecommenderCell original={props.row.original} />
      ),
    },
    { field: "description" as keyof FormattedBook, header: "Description" },
    { field: "genres" as keyof FormattedBook, header: "Genre" },
  ];

  return (
    <DataGrid
      data={enhancedData}
      columns={columns}
      getRowClassName={(row: EnhancedBook) =>
        `cursor-pointer transition-colors duration-200 ${getBackgroundColor(row._recommendation_count, Math.max(...enhancedData.map(b => b._recommendation_count)))}`
      }
      onRowClick={handleRowClick}
      onFilteredDataChange={onFilteredDataChange}
    />
  );
}

export function BookList({ initialBooks, initialRecommenders }: { 
  initialBooks: FormattedBook[]; 
  initialRecommenders: FormattedRecommender[];
}) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filteredCount, setFilteredCount] = useState(initialBooks.length);
  const [viewHistory, setViewHistory] = useState<Array<{id: string; actualId: string; type: 'book' | 'recommender'}>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if mobile on mount and when window resizes
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Keep viewHistory in sync with URL
  useEffect(() => {
    if (searchParams.get('view')) {
      const [actualId] = searchParams.get('view')!.split('--');
      const isRecommender = initialRecommenders.find(r => r.id === actualId);
      
      setViewHistory(prev => {
        // Don't add if it's already the most recent view
        if (prev[prev.length - 1]?.id === searchParams.get('view')) return prev;
        
        return [...prev, {
          id: searchParams.get('view')!, // Keep full viewId with timestamp in history
          actualId, // Store the real ID separately
          type: isRecommender ? 'recommender' : 'book'
        }];
      });
    }
    // Don't clear history when viewId is null - only handleClose should modify history
  }, [searchParams, initialRecommenders]);

  // Set mounted state to true after initial render
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Handle closing the detail view
  const handleClose = useCallback(() => {
    if (viewHistory.length <= 1) {
      // If there's only one view, remove it completely
      const params = new URLSearchParams(searchParams.toString());
      params.delete('view');
      router.push(`?${params.toString()}`, { scroll: false });
      setViewHistory([]);
    } else {
      // If there are multiple views, just remove the topmost one
      const previousView = viewHistory[viewHistory.length - 2]; // Get second-to-last view
      const params = new URLSearchParams(searchParams.toString());
      params.set('view', previousView.id);
      router.push(`?${params.toString()}`, { scroll: false });
      
      // Update state to remove only the last view
      setViewHistory(prev => prev.slice(0, -1));
    }
  }, [router, searchParams, viewHistory]);
  
  // Handle filtered data change
  const handleFilteredDataChange = useCallback((count: number) => {
    setFilteredCount(count);
  }, []);
  
  // Tab layout configuration - centralized in one place
  const tabConfig = {
    height: 100,         // Height allocated per tab
    baseTopOffset: 82,   // Starting position from top
    bottomMargin: 100,   // Increased margin to prevent overflow in production
    width: 150,          // Width of tab
    horizontalOffset: 4, // Horizontal offset between tabs
  };
  
  // Calculate visible tabs and their positions
  const tabPositions = useMemo(() => {
    if (!mounted) return [];
    
    // Skip the most recent view (it's displayed as the main content)
    const tabsToPosition = viewHistory.slice(0, -1);
    if (tabsToPosition.length === 0) return [];
    
    const availableHeight = window.innerHeight - tabConfig.baseTopOffset - tabConfig.bottomMargin;
    const maxVisibleTabs = Math.max(1, Math.floor(availableHeight / tabConfig.height));
    
    // If we have more tabs than can fit, only show the most recent ones
    const startIndex = Math.max(0, tabsToPosition.length - maxVisibleTabs);
    
    return tabsToPosition.map((view, index) => {
      // Calculate if this tab should be visible
      const shouldShow = index >= startIndex;
      
      // Calculate position from the top (relative to visible tabs)
      const positionIndex = index - startIndex;
      const calculatedPosition = (positionIndex * tabConfig.height) + tabConfig.baseTopOffset;
      
      // Ensure we don't exceed the bottom margin
      const maxPosition = window.innerHeight - tabConfig.bottomMargin;
      const finalPosition = Math.min(calculatedPosition, maxPosition);
      
      return {
        view,
        index,
        shouldShow,
        position: finalPosition,
        zIndex: 50 + index, // Ensure proper stacking
      };
    });
  }, [viewHistory, mounted]);

  if (!mounted) {
    return null;
  }

  return (
    <div ref={containerRef} className="h-full flex flex-col relative">
      <div className="flex-1 overflow-hidden">
        <BookGrid
          data={initialBooks}
          onFilteredDataChange={handleFilteredDataChange}
        />
      </div>
      <BookCounter total={initialBooks.length} filtered={filteredCount} />
      
      {/* Render detail views */}
      {viewHistory.map((view, index) => {
        const isLast = index === viewHistory.length - 1;
        const selectedRecommender = view.type === 'recommender' ? 
          initialRecommenders.find(r => r.id === view.actualId) : null;
        const selectedBook = view.type === 'book' ? 
          initialBooks.find(book => book.id === view.actualId || book.title === view.actualId) as EnhancedBook | null : null;

        return (
          <div 
            key={`${view.id}-${index}`}
            className="absolute inset-0" 
            style={{
              transform: `translateX(${isMobile ? 0 : index * 8}px)`,
              zIndex: 20 + index,
              width: `calc(100% - ${isMobile ? 0 : index * 8}px)`
            }}
          >
            {selectedBook && (
              <BookDetail
                book={selectedBook}
                onClose={isLast ? handleClose : () => {}}
                stackIndex={index}
              />
            )}
            {selectedRecommender && (
              <RecommenderDetail
                recommender={selectedRecommender}
                onClose={isLast ? handleClose : () => {}}
                stackIndex={index}
              />
            )}
          </div>
        );
      })}
      
      {/* Render tabs as separate DOM elements outside of the detail components */}
      {tabPositions.map(({ view, index, shouldShow, position, zIndex }) => {
        if (!shouldShow) return null;
        
        const selectedRecommender = view.type === 'recommender' ? 
          initialRecommenders.find(r => r.id === view.actualId) : null;
        const selectedBook = view.type === 'book' ? 
          initialBooks.find(book => book.id === view.actualId || book.title === view.actualId) : null;
        
        const tabTitle = selectedBook ? selectedBook.title : (selectedRecommender ? selectedRecommender.full_name : '');
        
        return (
          <button 
            key={`tab-${view.id}-${index}`}
            className="hidden md:block fixed bg-background border-border border px-3 py-2 text-text/70 truncate h-[32px] w-[150px] text-sm text-right whitespace-nowrap cursor-pointer transition-colors duration-200"
            style={{
              top: `${position}px`,
              left: `calc(50% + ${index * tabConfig.horizontalOffset}px)`,
              transform: 'translateX(-100%) translateX(-31px) rotate(-90deg)',
              transformOrigin: 'top right',
              zIndex, 
            }}
            onClick={(e) => {
              e.preventDefault();
              
              // When clicking a tab, we want to truncate the view history to this point
              // This means we'll remove all views above the clicked one
              const newViewHistory = viewHistory.slice(0, index + 1);
              
              // Update URL to show only the clicked view
              const params = new URLSearchParams(searchParams.toString());
              params.set('view', view.id); // Use the original ID with timestamp
              router.push(`?${params.toString()}`, { scroll: false });
              
              // Update the view history state
              setViewHistory(newViewHistory);
            }}
          >
            {tabTitle}
          </button>
        );
      })}
    </div>
  );
}
