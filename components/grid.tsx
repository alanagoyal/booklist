"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { ChevronDown, Check, ArrowUp, ArrowDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SearchBox } from "./search-box";
import { debounce } from "lodash";
import { generateEmbedding } from "@/utils/embeddings";
import { countManager } from "@/components/counter";

type SortDirection = "asc" | "desc";

type ColumnDef<T> = {
  field: keyof T;
  header: string;
  width?: number;
  cell?: (props: { row: { original: T } }) => React.ReactNode;
};

type DataGridProps<T extends Record<string, any>> = {
  data: T[];
  columns: ColumnDef<T>[];
  getRowClassName?: (row: T) => string;
  onRowClick?: (row: T) => void;
};

export function DataGrid<T extends Record<string, any>>({
  data,
  columns,
  getRowClassName,
  onRowClick,
}: DataGridProps<T>) {
  // Hooks
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isDropdownClosing, setIsDropdownClosing] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [inputValue, setInputValue] = useState(() => {
    const view = searchParams?.get("view") || "books";
    return searchParams?.get(`${view}_search`) || "";
  });
  const [searchResults, setSearchResults] = useState<Set<string>>(
    new Set<string>()
  );
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Get current view and sort configs directly from URL
  const viewMode = (searchParams.get("view") as "books" | "people") || "books";
  const directionParam = searchParams?.get(`${viewMode}_dir`);
  const sortConfig = useMemo(
    () => ({
      field:
        searchParams?.get(`${viewMode}_sort`) ||
        (viewMode === "books" ? "recommenders" : "recommendations"),
      direction:
        directionParam === "asc" || directionParam === "desc"
          ? directionParam
          : "desc",
    }),
    [searchParams, viewMode, directionParam]
  );

  // Refs
  const gridRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const resizeTimeout = useRef<number | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // Debounced search handler
  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query.trim()) {
          setSearchResults(new Set());
          setIsSearching(false);
          setIsPending(false);
          return;
        }
        setIsSearching(true);
        try {
          const embedding = await generateEmbedding(query);
          const response = await fetch("/api/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query,
              embedding,
              viewMode,
            }),
          });
          const data = await response.json();
          setSearchResults(new Set(data.map((item: any) => item.id)));
        } catch (error) {
          console.error("Error searching:", error);
        } finally {
          setIsSearching(false);
          setIsPending(false);
        }
      }, 1000), 
    [viewMode]
  );

  // Add cleanup
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // Search handler
  const handleSearchChange = (value: string) => {
    setInputValue(value);
    if (value.trim()) {
      setIsPending(true);
    } else {
      setIsPending(false);
    }
    debouncedSearch(value);
  };

  // Data filtering
  const filteredData = useMemo(() => {
    // If no search is active, return all data
    if (!inputValue.trim()) {
      return data;
    }

    // Only filter if we actually have results back
    if (!isSearching && !isPending) {
      return data.filter((item) => searchResults.has(item.id));
    }

    // Show existing filtered data while searching
    return data;
  }, [data, searchResults, inputValue, isSearching, isPending]);

  // Update counter
  useEffect(() => {
    countManager.updateCount(viewMode, filteredData.length);
  }, [filteredData.length, viewMode]);

  // Sort handlers
  const handleSort = useCallback(
    (field: string, direction: SortDirection) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      const view = (params.get("view") as "books" | "people") || "books";

      // Get current sort params
      const currentField = params.get(`${view}_sort`);
      const currentDir = params.get(`${view}_dir`);

      // If clicking the same sort option that's currently active, disable sorting
      if (currentField === field && currentDir === direction) {
        params.delete(`${view}_sort`);
        params.delete(`${view}_dir`);
      } else {
        // Otherwise apply the new sort
        params.set(`${view}_sort`, field);
        if (direction) {
          params.set(`${view}_dir`, direction);
        } else {
          params.delete(`${view}_dir`);
        }
      }

      router.replace(`?${params.toString()}`, { scroll: false });
      setOpenDropdown(null);
    },
    [router, searchParams]
  );

  // Data sorting
  const sortedData = useMemo(() => {
    const field = sortConfig.field;
    const direction = sortConfig.direction;

    return [...filteredData].sort((a, b) => {
      // Special handling for description fields
      if (field === "book_description" || field === "recommender_description") {
        const aValue = String(a.description || "").toLowerCase();
        const bValue = String(b.description || "").toLowerCase();
        return direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Handle recommender sorting
      if (field === "recommenders") {
        // Sort by number of recommenders (popularity)
        const aRecs = (a as any).recommendations?.length || 0;
        const bRecs = (b as any).recommendations?.length || 0;
        const sortDirection = direction === "desc" ? 1 : -1;
        return (bRecs - aRecs) * sortDirection;
      }

      if (field === "recommendations") {
        const aCount = (a as any).recommendations?.length || 0;
        const bCount = (b as any).recommendations?.length || 0;
        const sortDirection = direction === "desc" ? 1 : -1;
        return (bCount - aCount) * sortDirection;
      }

      if (a[field as keyof T] === b[field as keyof T]) return 0;
      if (a[field as keyof T] === null || a[field as keyof T] === undefined)
        return 1;
      if (b[field as keyof T] === null || b[field as keyof T] === undefined)
        return -1;

      const sortDirection = direction === "asc" ? 1 : -1;
      return a[field as keyof T] < b[field as keyof T]
        ? -sortDirection
        : sortDirection;
    });
  }, [filteredData, sortConfig]);

  // Keep resize observer for header width syncing
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (resizeTimeout.current) {
        cancelAnimationFrame(resizeTimeout.current);
      }
      resizeTimeout.current = requestAnimationFrame(() => {
        // Update header width if needed
        if (gridRef.current?.firstElementChild && headerRef.current) {
          headerRef.current.style.width = `${gridRef.current.firstElementChild.clientWidth}px`;
        }
      });
    });

    const container = gridRef.current;
    if (container) {
      observer.observe(container);
    }

    return () => {
      observer.disconnect();
      if (resizeTimeout.current) {
        cancelAnimationFrame(resizeTimeout.current);
      }
    };
  }, []);

  // Clean up resize timeout
  useEffect(() => {
    return () => {
      if (resizeTimeout.current) {
        cancelAnimationFrame(resizeTimeout.current);
      }
    };
  }, []);

  // Handle dropdown interactions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!openDropdown) return;

      const dropdownElement = dropdownRefs.current[openDropdown];
      const target = e.target as HTMLElement;

      if (
        !dropdownElement?.contains(target) &&
        !target.closest("[data-dropdown]")
      ) {
        setIsDropdownClosing(true);
        setOpenDropdown(null);
        // Reset after dropdown close animation
        setTimeout(() => {
          setIsDropdownClosing(false);
        }, 200); // Match transition-all duration-200
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  // Event handlers
  const handleRowClick = useCallback(
    (e: React.MouseEvent, row: T) => {
      const target = e.target as HTMLElement;

      // Don't trigger row click if:
      // 1. Clicking inside a dropdown menu or dropdown trigger
      // 2. Clicking on interactive elements
      // 3. A dropdown is open or closing
      if (
        target.closest("[data-dropdown]") ||
        target.closest("a, button, input") ||
        openDropdown ||
        isDropdownClosing
      ) {
        return;
      }

      onRowClick?.(row);
    },
    [onRowClick, openDropdown, isDropdownClosing]
  );

  // Dropdown handlers
  const handleDropdownClick = useCallback(
    (field: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (isDropdownClosing) return;

      const isOpening = openDropdown !== field;
      setOpenDropdown((prev) => (prev === field ? null : field));

      // Focus input when opening dropdown
      if (isOpening) {
        // Use setTimeout to ensure the dropdown is rendered before focusing
        setTimeout(() => {
          inputRefs.current[field]?.focus();
        }, 0);
      }
    },
    [isDropdownClosing, openDropdown]
  );

  // Dropdown menu
  const renderDropdownMenu = useCallback(
    (column: ColumnDef<T>) => {
      if (openDropdown !== String(column.field)) return null;

      return (
        <div
          className="absolute top-full -left-px -right-px bg-background border border-border shadow-lg z-50 transition-all duration-200"
          style={{
            opacity: isDropdownClosing ? 0 : 1,
            transform: isDropdownClosing ? "translateY(-4px)" : "translateY(0)",
          }}
        >
          <div>
            <button
              className="w-full px-4 py-2 text-left text-text transition-colors duration-200 md:hover:bg-accent/50 flex items-center justify-between"
              onClick={(e) => {
                e.preventDefault();
                handleSort(String(column.field), "asc");
              }}
            >
              <div className="flex items-center gap-2">
                <ArrowUp className="w-3 h-3 text-text/70" />
                <span>Sort ascending</span>
              </div>
              {sortConfig.field === String(column.field) &&
                sortConfig.direction === "asc" && (
                  <Check className="w-3 h-3 text-text/70" />
                )}
            </button>
            <button
              className="w-full px-4 py-2 text-left text-text transition-colors duration-200 md:hover:bg-accent/50 flex items-center justify-between"
              onClick={(e) => {
                e.preventDefault();
                handleSort(String(column.field), "desc");
              }}
            >
              <div className="flex items-center gap-2">
                <ArrowDown className="w-3 h-3 text-text/70" />
                <span>Sort descending</span>
              </div>
              {sortConfig.field === String(column.field) &&
                sortConfig.direction === "desc" && (
                  <Check className="w-3 h-3 text-text/70" />
                )}
            </button>
          </div>
        </div>
      );
    },
    [openDropdown, isDropdownClosing, sortConfig, handleSort]
  );

  // Header
  const renderHeader = useCallback(
    (column: ColumnDef<T>) => {
      return (
        <div
          key={String(column.field)}
          className="px-3 py-2 border-b border-border select-none relative cursor-pointer transition-colors duration-200 group"
          ref={(el) => void (dropdownRefs.current[String(column.field)] = el)}
          data-dropdown={String(column.field)}
          onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            // Don't trigger dropdown toggle if clicking on a button or input
            if (target.closest("button, input")) {
              return;
            }
            handleDropdownClick(String(column.field), e);
          }}
        >
          <div className="flex items-center justify-between flex-shrink-0">
            <span className="font-base text-text">{column.header}</span>
            <div className="flex items-center gap-1">
              <div>
                {sortConfig.field === String(column.field) && (
                  <div className="md:group-hover:hidden">
                    {sortConfig.direction === "asc" ? (
                      <ArrowUp className="w-4 h-4 text-text/70 p-0.5" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-text/70 p-0.5" />
                    )}
                  </div>
                )}
                <ChevronDown className="w-4 h-4 text-text/70 transition-colors duration-200 rounded p-0.5 md:group-hover:bg-accent/50 hidden md:group-hover:block" />
              </div>
            </div>
          </div>
          {renderDropdownMenu(column)}
        </div>
      );
    },
    [sortConfig, handleDropdownClick, renderDropdownMenu]
  );

  // Cells
  const renderCell = useCallback(
    ({ column, row }: { column: ColumnDef<T>; row: T }) => {
      return (
        <div key={String(column.field)} className="px-3 py-2">
          {column.cell ? (
            <div className="whitespace-pre-line transition-all duration-200 text-text selection:bg-main selection:text-mtext line-clamp-2">
              {column.cell({ row: { original: row } })}
            </div>
          ) : (
            <div className="whitespace-pre-line transition-all duration-200 text-text selection:bg-main selection:text-mtext line-clamp-2">
              {row[column.field]}
            </div>
          )}
        </div>
      );
    },
    []
  );

  // Row virtualizer
  const rowVirtualizer = useVirtualizer({
    count: sortedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // Adjust based on your actual row height
  });

  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileView(window.innerWidth < 768); // md breakpoint
    };

    // Initial check
    checkScreenSize();

    // Add resize listener
    window.addEventListener("resize", checkScreenSize);

    // Cleanup
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Search box */}
      <SearchBox
        value={inputValue}
        onSearch={handleSearchChange}
        isSearching={isSearching}
        isPending={isPending}
        viewMode={viewMode}
        isMobileView={isMobileView}
      />
      {/* Scrollable grid content */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
      >
        <div className="inline-block min-w-full">
          <div className="sticky top-0 z-10 bg-background">
            {/* Column headers */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${columns.length}, minmax(200px, 1fr))`,
              }}
            >
              {columns.map(renderHeader)}
            </div>
          </div>
          {sortedData.length === 0 && inputValue.trim() && !isSearching && !isPending ? (
            <div className="fixed left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 text-center px-4">
              <div className="text-text/70">No results match this search</div>
            </div>
          ) : (
            <div
              className="relative"
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = sortedData[virtualRow.index];

                // Use a stable key based on the row's unique identifier to
                // ensure React remounts DOM nodes when the underlying data
                // changes (e.g. after filtering). This prevents stale styles
                // from lingering when different data occupies the same
                // virtual index.
                const rowKey = (row as any).id ?? `row-${virtualRow.index}`;

                return (
                  <div
                    key={rowKey}
                    className={`grid transition-colors duration-200 ${
                      getRowClassName?.(row) || ""
                    }`}
                    style={{
                      gridTemplateColumns: `repeat(${columns.length}, minmax(200px, 1fr))`,
                      position: "absolute",
                      top: `${virtualRow.start}px`,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                    }}
                    onClick={(e) => handleRowClick(e, row)}
                  >
                    {columns.map((column) => renderCell({ column, row }))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
