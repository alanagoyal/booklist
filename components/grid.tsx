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
  ListFilter,
  Check,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { bookCountManager } from "./book-counter";
import { useVirtualizer } from "@tanstack/react-virtual";

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
  onFilteredDataChange?: (count: number) => void;
  onRowClick?: (row: T) => void;
};

export function DataGrid<T extends Record<string, any>>({
  data,
  columns,
  getRowClassName,
  onFilteredDataChange,
  onRowClick,
}: DataGridProps<T>) {
  // Hooks
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isDropdownClosing, setIsDropdownClosing] = useState(false);
  const [searchState, setSearchState] = useState(() => {
    const view = searchParams?.get("view") || "books";
    const query = searchParams?.get(`${view}_search`) || "";
    const cachedResults = searchParams?.get(`${view}_search_results`);
    return {
      query,
      inputValue: query,
      results: cachedResults
        ? new Set(cachedResults.split(","))
        : new Set<string>(),
      isSearching: false,
    };
  });

  // Get current view and sort configs directly from URL
  const viewMode =
    (searchParams.get("view") as "books" | "recommenders") || "books";
  const directionParam = searchParams?.get(`${viewMode}_dir`);
  const sortConfig = {
    field:
      searchParams?.get(`${viewMode}_sort`) ||
      (viewMode === "books" ? "recommenders" : "recommendations"),
    direction:
      directionParam === "asc" || directionParam === "desc"
        ? directionParam
        : "desc",
  };

  // Initialize filters from URL params
  const [filters, setFilters] = useState<{ [key: string]: string }>(() => {
    const params = Object.fromEntries(searchParams.entries());
    const filterParams: { [key: string]: string } = {};
    Object.entries(params).forEach(([key, value]) => {
      if (
        !key.includes("sort") &&
        !key.includes("dir") &&
        key !== "key" &&
        key !== "view" &&
        !key.includes("search")
      ) {
        filterParams[key] = value;
      }
    });
    return filterParams;
  });

  // Refs
  const gridRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const resizeTimeout = useRef<number | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // Memoize active filters to prevent unnecessary recalculations
  const activeFilters = useMemo(() => {
    return Object.entries(filters)
      .filter(([_, value]) => value)
      .map(([field]) => field);
  }, [filters]);

  // Memoize filtered data separately from sorting for better performance
  const filteredData = useMemo(() => {
    // Start with the base data
    let filtered = data;

    // Handle semantic search
    if (searchState.query) {
      // Keep showing old results while searching
      if (searchState.isSearching) {
        return filtered;
      }
      // Return empty array if we have no results and search is complete
      if (searchState.results.size === 0) {
        return [];
      }
      // Only filter by results if we have them
      filtered = filtered.filter((item) =>
        searchState.results.has((item as any).id)
      );
    }

    // Then apply column filters
    if (Object.values(filters).some(Boolean)) {
      const lowercaseFilters = Object.fromEntries(
        Object.entries(filters).map(([key, value]) => [
          key,
          value?.toLowerCase(),
        ])
      );

      // Get list of valid filter fields from columns
      const validFilterFields = columns.map((col) => String(col.field));

      filtered = filtered.filter((item) => {
        return Object.entries(lowercaseFilters).every(
          ([field, filterValue]) => {
            if (!filterValue) return true;

            // Skip filters that don't correspond to any column
            if (!validFilterFields.includes(field)) return true;

            // Special handling for description fields
            if (field === "book_description") {
              return String(item.description || "")
                .toLowerCase()
                .includes(filterValue);
            }

            if (field === "recommender_description") {
              return String(item.description || "")
                .toLowerCase()
                .includes(filterValue);
            }

            // Filter by recommender full name
            if (field === "recommenders") {
              const recommendations = (item as any).recommendations || [];
              const recommenderNames = recommendations
                .filter((rec: any) => rec.recommender)
                .map((rec: any) => rec.recommender.full_name.toLowerCase());
              return recommenderNames.some((name: string) =>
                name.includes(filterValue)
              );
            }

            // Filter by recommendation title
            if (field === "recommendations") {
              const recommendations = (item as any).recommendations || [];
              const recommendationTitles = recommendations.map((rec: any) =>
                rec.title.toLowerCase()
              );
              return recommendationTitles.some((title: string) =>
                title.includes(filterValue)
              );
            }

            // Default case: simple string includes check
            const itemValue = String(
              item[field as keyof T] || ""
            ).toLowerCase();
            return itemValue.includes(filterValue);
          }
        );
      });
    }

    return filtered;
  }, [
    data,
    filters,
    columns,
    searchState.query,
    searchState.results,
    searchState.isSearching,
  ]);

  // Handle search
  const handleSearch = useCallback(
    async (query: string) => {
      if (!query) {
        console.log("Empty query, clearing results");
        setSearchState((prev) => ({
          ...prev,
          query: "",
          inputValue: "",
          results: new Set(),
          isSearching: false,
        }));
        return;
      }

      console.log("Fetching search results for:", query);
      setSearchState((prev) => ({ ...prev, isSearching: true }));

      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            viewMode: searchParams.get("view") || "books",
          }),
        });

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }

        const results = await response.json();
        console.log("Search results:", results.length, "items");

        setSearchState((prev) => ({
          ...prev,
          query,
          results: new Set(results.map((item: any) => item.id)),
          isSearching: false,
        }));
      } catch (error) {
        console.error("Search error:", error);
        setSearchState((prev) => ({
          ...prev,
          isSearching: false,
          // Keep the query but clear results on error
          results: new Set(),
        }));
      }
    },
    [searchParams]
  );

  // Update URL when search state changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const viewMode = searchParams.get("view") || "books";

    if (searchState.query) {
      params.set(`${viewMode}_search`, searchState.query);
      if (searchState.results.size > 0) {
        params.set(
          `${viewMode}_search_results`,
          Array.from(searchState.results).join(",")
        );
      }
    } else {
      params.delete(`${viewMode}_search`);
      params.delete(`${viewMode}_search_results`);
    }

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchState.query, searchState.results, router, searchParams]);

  // Sync with URL changes
  useEffect(() => {
    const viewMode = searchParams.get("view") || "books";
    const urlQuery = searchParams?.get(`${viewMode}_search`) || "";
    const cachedResults = searchParams?.get(`${viewMode}_search_results`);

    if (urlQuery !== searchState.query) {
      setSearchState((prev) => ({
        ...prev,
        query: urlQuery,
        inputValue: urlQuery,
        results: cachedResults
          ? new Set(cachedResults.split(","))
          : prev.results,
      }));
    }
  }, [searchParams]);

  // Update filtered count whenever filteredData changes
  useEffect(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(filteredData.length);
    }
  }, [filteredData, onFilteredDataChange]);

  // Notify parent of filtered data changes
  useEffect(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(filteredData.length);
      bookCountManager.updateCount();
    }
  }, [filteredData.length, onFilteredDataChange]);

  // Memoize sorted data separately
  const filteredAndSortedData = useMemo(() => {
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

  // Update state when URL params change
  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries());
    const filterParams: { [key: string]: string } = {};
    Object.entries(params).forEach(([key, value]) => {
      if (
        !key.includes("sort") &&
        !key.includes("dir") &&
        key !== "key" &&
        key !== "view" &&
        !key.includes("search")
      ) {
        filterParams[key] = value;
      }
    });
    setFilters(filterParams);
  }, [searchParams]);

  // Update URL when sort/filter changes
  useEffect(() => {
    const currentParams = new URLSearchParams(searchParams.toString());
    const newParams = new URLSearchParams(currentParams.toString());

    // Initialize default parameters if they don't exist
    if (!currentParams.has("view")) {
      newParams.set("view", "books");
    }

    // Update filter params
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });

    const queryString = newParams.toString();
    const newPath = queryString ? `/?${queryString}` : "/";

    // Only update URL if params have changed
    if (newParams.toString() !== currentParams.toString()) {
      router.replace(newPath, { scroll: false });
    }
  }, [filters, router, searchParams]);

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

  // Filter handlers
  const handleFilterChange = useCallback((field: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Sort handlers
  const handleSort = useCallback(
    (field: string, direction: SortDirection) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      const view = (params.get("view") as "books" | "recommenders") || "books";

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
            <div className="px-4 py-2">
              <div className="relative">
                <input
                  type="text"
                  ref={(el) =>
                    void (inputRefs.current[String(column.field)] = el)
                  }
                  className="w-full px-2 py-1 border border-border bg-background text-text text-base sm:text-sm placeholder:text-sm selection:bg-main selection:text-mtext focus:outline-none rounded-none"
                  placeholder="Search"
                  value={filters[String(column.field)] || ""}
                  onChange={(e) =>
                    handleFilterChange(String(column.field), e.target.value)
                  }
                  onKeyDown={(e) => {
                    console.log("Key down:", e.key);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                {filters[String(column.field)] && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text/70 transition-colors duration-200 md:hover:text-text p-2 -mr-2"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleFilterChange(String(column.field), "");
                    }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    },
    [
      openDropdown,
      isDropdownClosing,
      sortConfig,
      filters,
      handleSort,
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
              {activeFilters.includes(String(column.field)) && (
                <ListFilter className="w-3 h-3 text-text/70 md:group-hover:hidden" />
              )}
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
    [activeFilters, sortConfig, handleDropdownClick, renderDropdownMenu]
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

  // Rows
  const renderRow = useCallback(
    (row: T, virtualRow: any) => {
      return (
        <div
          key={virtualRow.index}
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
    },
    [columns, getRowClassName, handleRowClick, renderCell]
  );

  // Row virtualizer
  const rowVirtualizer = useVirtualizer({
    count: filteredAndSortedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // Adjust based on your actual row height
  });

  return (
    <div className="h-full flex flex-col">
      {/* Search input - fixed at top */}
      <div className="bg-background">
        <div className="flex items-center">
          <input
            type="text"
            placeholder={viewMode === 'books' ? "Find the perfect book..." : "Find the perfect person..."}
            className="flex-1 h-10 p-2 focus:outline-none bg-background text-text border-b border-border font-base selection:bg-main selection:text-mtext"
            value={searchState.inputValue}
            onChange={(e) => {
              setSearchState((prev) => ({
                ...prev,
                inputValue: e.target.value,
              }));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSearch(searchState.inputValue);
              }
            }}
            disabled={searchState.isSearching}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          {/* Clear button or loading spinner */}
          <div className="flex items-center h-10 px-3 border-b border-border">
            {searchState.isSearching ? (
              <div className="w-3 h-3 border-2 border-text/70 rounded-full animate-spin border-t-transparent" />
            ) : searchState.inputValue ? (
              <button
                onClick={() => handleSearch("")}
                className="text-text/70 transition-colors duration-200 md:hover:text-text"
                disabled={searchState.isSearching}
              >
                <X className="w-3 h-3" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

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

          {filteredAndSortedData.length === 0 ? (
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
                const row = filteredAndSortedData[virtualRow.index];
                return (
                  <div
                    key={virtualRow.index}
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
