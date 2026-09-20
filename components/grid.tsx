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
  ListFilter,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { VirtualRows, HEADER_HEIGHT, type ColumnDef } from "./virtual-rows";
import { SearchBox } from "./semantic-search";
import { Counter } from "@/components/counter";
import { ColumnFilter } from "./column-filter";

type SortDirection = "asc" | "desc";

type DataGridProps<T extends Record<string, any> & { id: string }> = {
  data: T[];
  columns: ColumnDef<T>[];
  getRowClassName?: (row: T) => string;
  onRowClick?: (row: T) => void;
};

export function DataGrid<T extends Record<string, any> & { id: string }>({
  data,
  columns,
  getRowClassName,
  onRowClick,
}: DataGridProps<T>) {
  // Hooks
  const searchParams = useSearchParams();

  // State
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [searchResults, setSearchResults] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const filterParams = JSON.stringify(Object.fromEntries(columns.map(column => [
    String(column.field), searchParams.get(String(column.field)) || "",
  ])));
  const filters = useMemo<Record<string, string>>(() => JSON.parse(filterParams), [filterParams]);
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

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
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const filterInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>(
    {}
  );
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);

  // Initial search value from URL
  const initialSearchValue = useMemo(() => {
    const view = searchParams?.get("view") || "books";
    return searchParams?.get(`${view}_search`) || "";
  }, [searchParams]);

  // Data filtering
  const filteredData = useMemo(() => {
    let filtered = data;

    // Apply search filter first
    if (hasSearchQuery) {
      if (isSearching) {
        // While searching, show original data to avoid flashing blank
        filtered = data;
      } else if (hasNoSearchResults) {
        // If search is complete but no results, show empty
        filtered = [];
      } else {
        // If we have search results, filter to only those results
        filtered = filtered.filter((item) => searchResults.has(item.id));
      }
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
              .filter(Boolean)
              .map((rec: any) => rec.full_name.toLowerCase());
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
    isSearching,
  ]);

  const showNoResultsMessage = !isSearching && filteredData.length === 0;

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

  // Fast debounce for UI responsiveness
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 150); // Fast update for UI

    return () => clearTimeout(timeoutId);
  }, [filters]);

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

      const params = new URLSearchParams(window.location.search);
      if (value) params.set(urlField, value);
      else params.delete(urlField);
      window.history.replaceState(null, "", `?${params}`);
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

      window.history.replaceState(null, "", `?${params}`);
      setOpenDropdown(null);
    },
    [searchParams]
  );

  // Focus after the menu mounts without moving the scroll container.
  useEffect(() => {
    if (openDropdown) filterInputRefs.current[openDropdown]?.focus({ preventScroll: true });
  }, [openDropdown]);

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
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  // Dropdown handlers
  const handleDropdownClick = useCallback(
    (field: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setOpenDropdown((prev) => (prev === field ? null : field));
    },
    []
  );

  // Dropdown menu
  const renderDropdownMenu = useCallback(
    (column: ColumnDef<T>) => {
      if (openDropdown !== String(column.field)) return null;

      return (
        <div
          className="absolute top-full -left-px -right-px bg-background border border-border shadow-lg z-50"
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
    <div className="flex flex-col h-full min-h-0 text-base sm:text-sm leading-5">
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
        ref={setScrollElement}
        className="min-h-0 flex-1 overflow-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
      >
        <div className="inline-block min-w-full">
          <div className="sticky top-0 z-10 bg-background">
            {/* Column headers */}
            <div
              className="grid"
              style={{
                height: HEADER_HEIGHT,
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
            <VirtualRows rows={sortedData} scrollElement={scrollElement} columns={columns}
              getRowClassName={getRowClassName} onRowClick={openDropdown ? undefined : onRowClick} />
          )}
        </div>
      </div>
      <Counter total={data.length} filteredCount={filteredData.length} viewMode={viewMode} />
    </div>
  );
}
