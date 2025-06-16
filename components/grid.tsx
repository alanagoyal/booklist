"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  ChevronDown,
  Check,
  ArrowUp,
  ArrowDown,
  X,
  ListFilter,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SearchBox } from "./semantic-search";
import { countManager } from "@/components/counter";
import { ColumnFilter } from "./column-filter";

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
  const [searchResults, setSearchResults] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [debouncedFilters, setDebouncedFilters] = useState<
    Record<string, string>
  >({});

  // Get current view and sort configs directly from URL
  const viewMode = (searchParams.get("view") as "books" | "people") || "books";
  const directionParam = searchParams?.get(`${viewMode}_dir`);

  // Search state derived values
  const searchQuery = useMemo(
    () => searchParams?.get(`${viewMode}_search`)?.trim() || "",
    [searchParams, viewMode]
  );
  const hasSearchQuery = useMemo(() => Boolean(searchQuery), [searchQuery]);
  const hasNoSearchResults = useMemo(
    () => searchResults.size === 0,
    [searchResults]
  );

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
  const filterInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>(
    {}
  );
  const resizeTimeout = useRef<number | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // Initial search value from URL
  const initialSearchValue = useMemo(() => {
    const view = searchParams?.get("view") || "books";
    return searchParams?.get(`${view}_search`) || "";
  }, [searchParams]);

  // Data filtering
  const filteredData = useMemo(() => {
    let filtered = data;

    // Apply search filter first
    if (hasSearchQuery && !hasNoSearchResults) {
      filtered = filtered.filter((item) => searchResults.has(item.id));
    }

    // Then apply column filters
    const activeFilters = Object.entries(debouncedFilters).filter(
      ([field, value]) => {
        // Only include filters relevant to current view
        if (field === "book_description" && viewMode !== "books") return false;
        if (field === "recommender_description" && viewMode !== "people")
          return false;
        return Boolean(value);
      }
    );

    if (activeFilters.length > 0) {
      filtered = filtered.filter((item) => {
        return activeFilters.every(([field, filterValue]) => {
          const value = filterValue?.toLowerCase() || "";
          if (!value) return true;

          // Special handling for description fields
          if (
            (field === "book_description" && viewMode === "books") ||
            (field === "recommender_description" && viewMode === "people")
          ) {
            return String(item.description || "")
              .toLowerCase()
              .includes(value);
          }

          // Filter by recommender full name
          if (field === "recommenders") {
            const recommendations = (item as any).recommendations || [];
            const recommenderNames = recommendations
              .filter((rec: any) => rec.recommender)
              .map((rec: any) => rec.recommender.full_name.toLowerCase());
            return recommenderNames.some((name: string) =>
              name.includes(value)
            );
          }

          // Filter by recommendation title
          if (field === "recommendations") {
            const recommendations = (item as any).recommendations || [];
            const recommendationTitles = recommendations.map((rec: any) =>
              rec.title.toLowerCase()
            );
            return recommendationTitles.some((title: string) =>
              title.includes(value)
            );
          }

          const itemValue = String(item[field as keyof T] || "").toLowerCase();
          return itemValue.includes(value);
        });
      });
    }

    return filtered;
  }, [
    data,
    searchResults,
    hasSearchQuery,
    hasNoSearchResults,
    debouncedFilters,
    viewMode,
  ]);

  const hasNoFilteredResults = useMemo(
    () => filteredData.length === 0,
    [filteredData]
  );
  const showNoResultsMessage = useMemo(
    () =>
      !isSearching &&
      hasSearchQuery &&
      hasNoSearchResults &&
      hasNoFilteredResults,
    [isSearching, hasSearchQuery, hasNoSearchResults, hasNoFilteredResults]
  );

  // Sort data after filtering
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];

    if (sortConfig.field) {
      sorted.sort((a, b) => {
        // Handle recommender sorting
        if (sortConfig.field === "recommenders") {
          // Sort by number of recommenders (popularity)
          const aRecs = (a as any).recommendations?.length || 0;
          const bRecs = (b as any).recommendations?.length || 0;
          return sortConfig.direction === "desc"
            ? bRecs - aRecs
            : aRecs - bRecs;
        }

        // Handle recommendations sorting
        if (sortConfig.field === "recommendations") {
          const aCount = (a as any).recommendations?.length || 0;
          const bCount = (b as any).recommendations?.length || 0;
          return sortConfig.direction === "desc"
            ? bCount - aCount
            : aCount - bCount;
        }

        // Handle numeric fields
        if (sortConfig.field === "_book_count") {
          const aNum = Number(a[sortConfig.field as keyof T]) || 0;
          const bNum = Number(b[sortConfig.field as keyof T]) || 0;
          return sortConfig.direction === "desc" ? bNum - aNum : aNum - bNum;
        }

        // Special handling for description fields
        if (
          sortConfig.field === "book_description" ||
          sortConfig.field === "recommender_description"
        ) {
          const aValue = String(a.description || "").toLowerCase();
          const bValue = String(b.description || "").toLowerCase();
          return sortConfig.direction === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        // Default case: handle null/undefined and use localeCompare for strings
        const aValue = a[sortConfig.field as keyof T];
        const bValue = b[sortConfig.field as keyof T];

        // Handle null/undefined
        if (aValue === bValue) return 0;
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        // Convert to strings and compare
        const aString = String(aValue).toLowerCase();
        const bString = String(bValue).toLowerCase();

        return sortConfig.direction === "asc"
          ? aString.localeCompare(bString)
          : bString.localeCompare(aString);
      });
    }

    return sorted;
  }, [filteredData, sortConfig.field, sortConfig.direction]);

  // Update counter
  useEffect(() => {
    countManager.updateCount(viewMode, filteredData.length);
  }, [filteredData.length, viewMode]);

  // Initialize filters from URL on mount only
  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const newFilters: Record<string, string> = {};

    // Get filter values from URL parameters
    columns.forEach((column) => {
      const field = String(column.field);
      const value = params.get(field);
      if (value) {
        newFilters[field] = value;
      }
    });

    // Handle description fields
    const bookDesc = params.get("book_description");
    const recommenderDesc = params.get("recommender_description");
    if (bookDesc) newFilters["book_description"] = bookDesc;
    if (recommenderDesc)
      newFilters["recommender_description"] = recommenderDesc;

    setFilters(newFilters);
    setDebouncedFilters(newFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - intentionally omitting dependencies to avoid re-initializing filters

  // Fast debounce for UI responsiveness
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 150); // Fast update for UI

    return () => clearTimeout(timeoutId);
  }, [filters]);

  // Slower debounce for URL syncing (shareable links)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");

      // Remove all existing filter params
      const validFilterFields = columns.map((col) => String(col.field));
      validFilterFields.push("book_description", "recommender_description");
      validFilterFields.forEach((field) => params.delete(field));

      // Add new filter params
      Object.entries(filters).forEach(([field, value]) => {
        if (value) {
          params.set(field, value);
        }
      });

      // Only update URL if it actually changed
      const newUrl = `?${params.toString()}`;
      const currentUrl = `?${searchParams?.toString() ?? ""}`;
      if (newUrl !== currentUrl) {
        router.push(newUrl);
      }
    }, 1000); // Slower update for URL (1 second)

    return () => clearTimeout(timeoutId);
  }, [filters, searchParams, router, columns]);

  // Handle filter input changes
  const handleFilterChange = useCallback(
    (field: string, value: string) => {
      // Map description field to the correct URL parameter
      const urlField =
        field === "description"
          ? viewMode === "books"
            ? "book_description"
            : "recommender_description"
          : field;

      setFilters((prev) => ({
        ...prev,
        [urlField]: value,
      }));
    },
    [viewMode]
  );

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

      // Don't trigger row click if clicking on interactive elements
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
          filterInputRefs.current[field]?.focus();
        }, 100); // Increased timeout to ensure dropdown is fully rendered
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
              className="w-full p-2 text-left text-text transition-colors duration-200 md:hover:bg-accent/50 flex items-center justify-between"
              onClick={(e) => {
                e.preventDefault();
                handleSort(String(column.field), "asc");
              }}
            >
              <div className="flex items-center gap-2">
                <ArrowUp className="w-3 h-3 text-muted-foreground" />
                <span>Sort ascending</span>
              </div>
              {sortConfig.field === String(column.field) &&
                sortConfig.direction === "asc" && (
                  <Check className="w-3 h-3 text-muted-foreground" />
                )}
            </button>
            <button
              className="w-full p-2 text-left text-text transition-colors duration-200 md:hover:bg-accent/50 flex items-center justify-between"
              onClick={(e) => {
                e.preventDefault();
                handleSort(String(column.field), "desc");
              }}
            >
              <div className="flex items-center gap-2">
                <ArrowDown className="w-3 h-3 text-muted-foreground" />
                <span>Sort descending</span>
              </div>
              {sortConfig.field === String(column.field) &&
                sortConfig.direction === "desc" && (
                  <Check className="w-3 h-3 text-muted-foreground" />
                )}
            </button>
            <ColumnFilter
              field={String(column.field)}
              header={column.header}
              value={filters[String(column.field)] || ""}
              onChange={handleFilterChange}
              inputRef={(el) =>
                (filterInputRefs.current[String(column.field)] = el)
              }
            />
          </div>
        </div>
      );
    },
    [
      openDropdown,
      isDropdownClosing,
      sortConfig,
      handleSort,
      filters,
      handleFilterChange,
    ]
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
              {debouncedFilters[String(column.field)] && (
                <ListFilter className="w-3 h-3 text-muted-foreground md:group-hover:hidden" />
              )}
              <div>
                {sortConfig.field === String(column.field) && (
                  <div className="md:group-hover:hidden">
                    {sortConfig.direction === "asc" ? (
                      <ArrowUp className="w-4 h-4 text-muted-foreground p-0.5" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-muted-foreground p-0.5" />
                    )}
                  </div>
                )}
                <ChevronDown className="w-4 h-4 text-muted-foreground transition-colors duration-200 rounded p-0.5 md:group-hover:bg-accent/50 hidden md:group-hover:block" />
              </div>
            </div>
          </div>
          {renderDropdownMenu(column)}
        </div>
      );
    },
    [sortConfig, handleDropdownClick, renderDropdownMenu, debouncedFilters]
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
    <div className="flex flex-col h-full text-base sm:text-sm">
      {/* Search box */}
      <SearchBox
        initialValue={initialSearchValue}
        onSearchResults={setSearchResults}
        viewMode={viewMode}
        isMobileView={isMobileView}
        setIsSearching={setIsSearching}
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
          {showNoResultsMessage ? (
            <div className="fixed left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 text-center px-4">
              <div className="text-muted-foreground">
                No matching results found
              </div>
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
