"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { BookCounter } from "@/components/book-counter";
import { FormattedBook, FormattedRecommender } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import BookDetail from "@/components/book-detail";
import RecommenderDetail from "@/components/recommender-detail";
import BookGrid from "./book-grid";
import RecommenderGrid from "./recommender-grid";
import { LayoutList } from "lucide-react";

export function BookList({
  initialBooks,
  initialRecommenders,
}: {
  initialBooks: FormattedBook[];
  initialRecommenders: FormattedRecommender[];
}) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<"books" | "recommenders">(() => {
    // Initialize from URL param, default to 'books'
    return (searchParams.get("view") as "books" | "recommenders") || "books";
  });
  const [filteredCount, setFilteredCount] = useState(initialBooks.length);
  const [viewHistory, setViewHistory] = useState<
    Array<{ id: string; actualId: string; type: "book" | "recommender" }>
  >([]);
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
    }
    // Don't clear history when viewId is null - only handleClose should modify history
  }, [searchParams, initialRecommenders]);

  // Keep viewMode in sync with URL
  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "books" || view === "recommenders") {
      setViewMode(view);
    }
  }, [searchParams]);

  // Set mounted state to true after initial render
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Handle filtered data change
  const handleFilteredDataChange = useCallback((count: number) => {
    setFilteredCount(count);
  }, []);

  // Update URL when viewMode changes
  const toggleViewMode = useCallback(() => {
    const newView = viewMode === "books" ? "recommenders" : "books";
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newView);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [viewMode, router, searchParams]);

  // Tab layout configuration - centralized in one place
  const tabConfig = {
    height: 100, // Height allocated per tab
    baseTopOffset: 82, // Starting position from top
    bottomMargin: 100, // Increased margin to prevent overflow in production
    width: 150, // Width of tab
    horizontalOffset: 4, // Horizontal offset between tabs
  };

  // Calculate visible tabs and their positions
  const tabPositions = useMemo(() => {
    if (!mounted) return [];

    // Skip the most recent view (it's displayed as the main content)
    const tabsToPosition = viewHistory.slice(0, -1);
    if (tabsToPosition.length === 0) return [];

    const availableHeight =
      window.innerHeight - tabConfig.baseTopOffset - tabConfig.bottomMargin;
    const maxVisibleTabs = Math.max(
      1,
      Math.floor(availableHeight / tabConfig.height)
    );

    // If we have more tabs than can fit, only show the most recent ones
    const startIndex = Math.max(0, tabsToPosition.length - maxVisibleTabs);

    return tabsToPosition.map((view, index) => {
      // Calculate if this tab should be visible
      const shouldShow = index >= startIndex;

      // Calculate position from the top (relative to visible tabs)
      const positionIndex = index - startIndex;
      const calculatedPosition =
        positionIndex * tabConfig.height + tabConfig.baseTopOffset;

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
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background">
        <button
          onClick={toggleViewMode}
          className="flex items-center gap-2 text-text/70 hover:text-text transition-colors duration-200"
        >
          <LayoutList size={16} />
          <span className="text-sm">
            {viewMode === "books" ? "View by Recommender" : "View by Book"}
          </span>
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {viewMode === "books" ? (
          <BookGrid
            data={initialBooks}
            onFilteredDataChange={handleFilteredDataChange}
          />
        ) : (
          <RecommenderGrid
            data={initialRecommenders}
            onFilteredDataChange={handleFilteredDataChange}
          />
        )}
      </div>
      <BookCounter
        total={
          viewMode === "books"
            ? initialBooks.length
            : initialRecommenders.length
        }
        filtered={filteredCount}
        viewMode={viewMode}
      />

      {/* Render detail views */}
      {viewHistory.map((view, index) => {
        const isLast = index === viewHistory.length - 1;
        const selectedRecommender =
          view.type === "recommender"
            ? initialRecommenders.find((r) => r.id === view.actualId)
            : null;
        const selectedBook =
          view.type === "book"
            ? (initialBooks.find(
                (book) =>
                  book.id === view.actualId || book.title === view.actualId
              ) as FormattedBook & {
                _recommendation_count: number;
                _percentile: number;
              })
            : null;

        return (
          <div
            key={`${view.id}-${index}`}
            className="absolute inset-0"
            style={{
              transform: `translateX(${isMobile ? 0 : index * 8}px)`,
              zIndex: 20 + index,
              width: `calc(100% - ${isMobile ? 0 : index * 8}px)`,
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

        const selectedRecommender =
          view.type === "recommender"
            ? initialRecommenders.find((r) => r.id === view.actualId)
            : null;
        const selectedBook =
          view.type === "book"
            ? (initialBooks.find(
                (book) =>
                  book.id === view.actualId || book.title === view.actualId
              ) as FormattedBook & {
                _recommendation_count: number;
                _percentile: number;
              })
            : null;

        const tabTitle = selectedBook
          ? selectedBook.title
          : selectedRecommender
            ? selectedRecommender.full_name
            : "";

        return (
          <button
            key={`tab-${view.id}-${index}`}
            className="hidden md:block fixed bg-background border-border border px-3 py-2 text-text/70 truncate h-[32px] w-[150px] text-sm text-right whitespace-nowrap cursor-pointer transition-colors duration-200"
            style={{
              top: `${position}px`,
              left: `calc(50% + ${index * tabConfig.horizontalOffset}px)`,
              transform: "translateX(-100%) translateX(-31px) rotate(-90deg)",
              transformOrigin: "top right",
              zIndex,
            }}
            onClick={(e) => {
              e.preventDefault();

              // When clicking a tab, we want to truncate the view history to this point
              // This means we'll remove all views above the clicked one
              const newViewHistory = viewHistory.slice(0, index + 1);

              // Update URL to show only the clicked view
              const params = new URLSearchParams(searchParams.toString());
              params.set("key", view.id); // Use the original ID with timestamp
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
