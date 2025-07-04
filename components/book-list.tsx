"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Counter } from "@/components/counter";
import { FormattedBook, FormattedRecommender } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import BookDetail from "@/components/book-detail";
import RecommenderDetail from "@/components/recommender-detail";
import BookGrid from "./book-grid";
import RecommenderGrid from "./recommender-grid";
import { useDetailViewClick } from "@/utils/use-entity-click";

export function BookList({
  initialBooks,
  initialRecommenders,
}: {
  initialBooks: FormattedBook[];
  initialRecommenders: FormattedRecommender[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewMode = (searchParams.get("view") as "books" | "people") || "books";
  const [viewHistory, setViewHistory] = useState<
    Array<{ id: string; actualId: string; type: "book" | "recommender" }>
  >([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Check if mobile on mount and when window resizes
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Add resize listener
    window.addEventListener("resize", checkMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Keep viewHistory in sync with URL
  useEffect(() => {
    if (searchParams.get("key")) {
      const [actualId] = searchParams.get("key")!.split("--");
      const isRecommender = initialRecommenders.find((r) => r.id === actualId);

      setViewHistory((prev) => {
        // Don't add if it's already the most recent view
        if (prev[prev.length - 1]?.id === searchParams.get("key")) return prev;

        return [
          ...prev,
          {
            id: searchParams.get("key")!, // Keep full viewId with timestamp in history
            actualId, // Store the real ID separately
            type: isRecommender ? "recommender" : "book",
          },
        ];
      });
    } else {
      // Clear history when key param is removed
      setViewHistory([]);
    }
  }, [searchParams, initialRecommenders]);

  // Handle closing the detail view
  const handleClose = useCallback(() => {
    if (viewHistory.length <= 1) {
      // If there's only one view, remove it completely
      const params = new URLSearchParams(searchParams.toString());
      params.delete("key");
      router.push(`?${params.toString()}`, { scroll: false });
      setViewHistory([]);
    } else {
      // If there are multiple views, just remove the topmost one
      const previousView = viewHistory[viewHistory.length - 2]; // Get second-to-last view
      const params = new URLSearchParams(searchParams.toString());
      params.set("key", previousView.id);
      router.push(`?${params.toString()}`, { scroll: false });

      // Update state to remove only the last view
      setViewHistory((prev) => prev.slice(0, -1));
    }
  }, [router, searchParams, viewHistory]);

  // Handle closing all detail views
  const handleCloseAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("key");
    router.push(`?${params.toString()}`, { scroll: false });
    setViewHistory([]);
  }, [router, searchParams]);

  // Handle tab click using the utility hook
  const handleTabClick = useDetailViewClick(
    setViewHistory,
    viewHistory,
    setIsNavigating,
    setHoveredTabId
  );

  // Calculate tab positions
  const tabConfig = useMemo(() => {
    return {
      height: 100,
      baseTopOffset: 82,
      bottomMargin: 100,
      width: 150,
      horizontalOffset: 4,
    };
  }, []);

  // Calculate visible tabs and their positions
  const tabPositions = useMemo(() => {
    const tabsToPosition = viewHistory.slice(0, -1);
    if (tabsToPosition.length === 0) return [];

    const availableHeight =
      window.innerHeight - tabConfig.baseTopOffset - tabConfig.bottomMargin;
    const maxVisibleTabs = Math.max(
      1,
      Math.floor(availableHeight / tabConfig.height)
    );

    const startIndex = Math.max(0, tabsToPosition.length - maxVisibleTabs);

    return tabsToPosition.map(
      (view: (typeof viewHistory)[0], index: number) => {
        const shouldShow = index >= startIndex;
        const positionIndex = index - startIndex;
        const calculatedPosition =
          positionIndex * tabConfig.height + tabConfig.baseTopOffset;
        const maxPosition = window.innerHeight - tabConfig.bottomMargin;
        const finalPosition = Math.min(calculatedPosition, maxPosition);

        return {
          view,
          index,
          visibleIndex: positionIndex, // Add visibleIndex for horizontal positioning
          shouldShow,
          position: finalPosition,
          zIndex: 50 + index,
        };
      }
    );
  }, [viewHistory, tabConfig]);

  // Calculate visible detail views (same logic as tabs)
  const visibleDetailViews = useMemo(() => {
    if (viewHistory.length === 0) return [];

    const availableHeight =
      window.innerHeight - tabConfig.baseTopOffset - tabConfig.bottomMargin;
    const maxVisibleTabs = Math.max(
      1,
      Math.floor(availableHeight / tabConfig.height)
    );

    // For detail views, we need to consider all views including the current one
    const allViews = viewHistory;
    const startIndex = Math.max(0, allViews.length - maxVisibleTabs - 1); // -1 because we include the current view

    return allViews.map((view, index) => {
      const shouldShow = index >= startIndex;
      const visibleIndex = index - startIndex; // This will be the horizontal offset index
      
      return {
        view,
        originalIndex: index,
        visibleIndex,
        shouldShow,
        isLast: index === allViews.length - 1,
      };
    }).filter(item => item.shouldShow);
  }, [viewHistory, tabConfig]);

  return (
    <div ref={containerRef} className="h-full flex flex-col relative">
      <div className="flex-1 overflow-hidden">
        {viewMode === "books" ? (
          <BookGrid data={initialBooks} isMobile={isMobile} />
        ) : (
          <RecommenderGrid data={initialRecommenders} isMobile={isMobile} />
        )}
      </div>
      <Counter
        total={
          viewMode === "books"
            ? initialBooks.length
            : initialRecommenders.length
        }
        viewMode={viewMode}
      />

      {/* Render detail views */}
      {visibleDetailViews.map(({ view, originalIndex, visibleIndex, isLast }) => {
        const selectedRecommender =
          view.type === "recommender"
            ? initialRecommenders.find((r) => r.id === view.actualId)
            : null;
        const selectedBook =
          view.type === "book"
            ? initialBooks.find(
                (book) =>
                  book.id === view.actualId || book.title === view.actualId
              )
            : null;

        const isHovered = hoveredTabId === view.id && !isLast;

        return (
          <div
            key={`${view.id}-${originalIndex}`}
            className="absolute inset-0 text-base sm:text-sm"
            style={{
              transform: `translateX(${isMobile ? 0 : visibleIndex * 8}px)`,
              zIndex: 20 + originalIndex,
              width: `calc(100% - ${isMobile ? 0 : visibleIndex * 8}px)`,
            }}
          >
            {selectedBook && (
              <BookDetail
                book={selectedBook}
                onClose={isLast ? handleClose : () => {}}
                onBackdropClick={isLast ? handleCloseAll : () => {}}
                isHovered={isHovered}
                isTopIndex={originalIndex === viewHistory.length - 1}
                isNavigating={isNavigating}
              />
            )}
            {selectedRecommender && (
              <RecommenderDetail
                recommender={selectedRecommender}
                onClose={isLast ? handleClose : () => {}}
                onBackdropClick={isLast ? handleCloseAll : () => {}}
                isHovered={isHovered}
                isTopIndex={originalIndex === viewHistory.length - 1}
                isNavigating={isNavigating}
              />
            )}
          </div>
        );
      })}

      {/* Render tabs */}
      {tabPositions.map(({ view, index, visibleIndex, shouldShow, position, zIndex }) => {
        if (!shouldShow) return null;

        const selectedRecommender =
          view.type === "recommender"
            ? initialRecommenders.find((r) => r.id === view.actualId)
            : null;
        const selectedBook =
          view.type === "book"
            ? initialBooks.find(
                (book) =>
                  book.id === view.actualId || book.title === view.actualId
              )
            : null;

        const tabTitle = selectedBook
          ? selectedBook.title
          : selectedRecommender
            ? selectedRecommender.full_name
            : "";

        return (
          <button
            key={`tab-${view.id}-${index}`}
            className={`hidden md:block fixed ${
              hoveredTabId === view.id ? "bg-accent" : "bg-background"
            } border-border border border-b-0 px-3 py-2 text-text truncate h-[32px] w-[150px] text-sm text-right whitespace-nowrap cursor-pointer ${
              isNavigating ? "" : "transition-colors duration-300 ease-in-out"
            }`}
            style={{
              top: `${position}px`,
              left: `calc(50% + ${visibleIndex * tabConfig.horizontalOffset}px)`,
              transform: "translateX(-100%) translateX(-31px) rotate(-90deg)",
              transformOrigin: "top right",
              zIndex,
            }}
            onClick={(e) => {
              e.preventDefault();
              handleTabClick(view);
            }}
            onMouseEnter={() => setHoveredTabId(view.id)}
            onMouseLeave={() => setHoveredTabId(null)}
          >
            {tabTitle}
          </button>
        );
      })}
    </div>
  );
}
