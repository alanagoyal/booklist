"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ChevronDown,
  ListFilter,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  Award,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { bookCountManager } from './book-counter';

type SortDirection = "asc" | "desc" | null;

type ColumnDef<T> = {
  field: keyof T;
  header: string;
  width?: number;
  cell?: (props: {
    row: { original: T };
  }) => React.ReactNode;
  isExpandable?: boolean;
};

type DataGridProps<T extends Record<string, any>> = {
  data: T[];
  columns: ColumnDef<T>[];
  getRowClassName?: (row: T) => string;
  onFilteredDataChange?: (count: number) => void;
};

type SortConfig = {
  field: string;
  direction: SortDirection;
};

type VirtualState<T> = {
  startIndex: number;
  endIndex: number;
  visibleRows: T[];
};

export function DataGrid<T extends Record<string, any>>({ 
  data, 
  columns, 
  getRowClassName,
  onFilteredDataChange,
}: DataGridProps<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gridRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Update state when URL params change
  useEffect(() => {
    const field = searchParams.get('sort') || "recommenders";
    const direction = searchParams.get('dir') as SortDirection || "asc";
    setSortConfig({ field, direction });

    const params = Object.fromEntries(searchParams.entries());
    const filterParams: { [key: string]: string } = {};
    Object.entries(params).forEach(([key, value]) => {
      if (key !== 'sort' && key !== 'dir' && key !== 'view') {
        filterParams[key] = value;
      }
    });
    setFilters(filterParams);
  }, [searchParams]);

  // Initialize state with URL params or defaults
  const [sortConfig, setSortConfig] = useState<SortConfig>(() => {
    const field = searchParams.get('sort') || "recommenders";
    const direction = searchParams.get('dir') as SortDirection || "asc";
    return { field, direction };
  });
  
  const [filters, setFilters] = useState<{ [key: string]: string }>(() => {
    const params = Object.fromEntries(searchParams.entries());
    const filterParams: { [key: string]: string } = {};
    Object.entries(params).forEach(([key, value]) => {
      if (key !== 'sort' && key !== 'dir') {
        filterParams[key] = value;
      }
    });
    return filterParams;
  });

  // Update URL when sort/filter changes
  useEffect(() => {
    if (!mounted) return;
    
    const currentParams = new URLSearchParams(searchParams.toString());
    const newParams = new URLSearchParams(currentParams.toString());

    // Update sort params
    if (sortConfig.field) {
      newParams.set('sort', sortConfig.field);
      if (sortConfig.direction) {
        newParams.set('dir', sortConfig.direction);
      } else {
        newParams.delete('dir');
      }
    } else {
      newParams.delete('sort');
      newParams.delete('dir');
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
    const newPath = queryString ? `/?${queryString}` : '/';
    
    // Only update URL if params have changed
    if (newParams.toString() !== currentParams.toString()) {
      router.push(newPath, { scroll: false });
    }
  }, [sortConfig, filters, mounted, router, searchParams]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isDropdownClosing, setIsDropdownClosing] = useState(false);
  
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const scrollTimeout = useRef<number | null>(null);
  const resizeTimeout = useRef<number | null>(null);

  // Constants for virtualization
  const ROW_HEIGHT = 32;
  const OVERSCAN_COUNT = 5;
  const MIN_BATCH_SIZE = 25;

  // Memoize active filters to prevent unnecessary recalculations
  const activeFilters = useMemo(() => {
    return Object.entries(filters)
      .filter(([_, value]) => value)
      .map(([field]) => field);
  }, [filters]);

  // Memoize filtered data separately from sorting for better performance
  const filteredData = useMemo(() => {
    if (!Object.values(filters).some(Boolean)) return data;
    
    const lowercaseFilters = Object.fromEntries(
      Object.entries(filters).map(([key, value]) => [key, value?.toLowerCase()])
    );

    return data.filter((item) => {
      return Object.entries(lowercaseFilters).every(([field, filterValue]) => {
        if (!filterValue) return true;

        // Filter by recommender full name
        if (field === 'recommenders') {
          const recommendations = (item as any).recommendations || [];
          const recommenderNames = recommendations
            .filter((rec: any) => rec.recommender)
            .map((rec: any) => rec.recommender.full_name.toLowerCase());
          return recommenderNames.some((name: string) => name.includes(filterValue));
        }

        const value = String(item[field as keyof T] || '').toLowerCase();
   
        return value.includes(filterValue);
      });
    });
  }, [data, filters]);

  // Notify parent of filtered data changes
  useEffect(() => {
    onFilteredDataChange?.(filteredData.length);
  }, [filteredData, onFilteredDataChange]);

  // Update filtered data count
  useEffect(() => {
    bookCountManager.update(data.length, filteredData.length);
  }, [data.length, filteredData.length]);

  // Memoize sorted data separately
  const filteredAndSortedData = useMemo(() => {
    if (!sortConfig.field || !sortConfig.direction) return filteredData;
    
    const field = sortConfig.field;
    const direction = sortConfig.direction;
    
    return [...filteredData].sort((a, b) => {
      const aValue = a[field as keyof T];
      const bValue = b[field as keyof T];

      if (field === 'recommenders') {
        // Sort by number of recommenders (popularity)
        const aRecs = (a as any).recommendations?.length || 0;
        const bRecs = (b as any).recommendations?.length || 0;
        const sortDirection = direction === "asc" ? 1 : -1;
        return (bRecs - aRecs) * sortDirection;
      }

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const sortDirection = direction === "asc" ? 1 : -1;
      return aValue < bValue ? -sortDirection : sortDirection;
    });
  }, [filteredData, sortConfig.field, sortConfig.direction]);

  // Add virtualState to component state
  const [virtualState, setVirtualState] = useState<VirtualState<T>>({
    startIndex: 0,
    endIndex: 50,
    visibleRows: []
  });

  // Memoize visible rows calculation
  const visibleRows = useMemo(() => {
    const startIndex = virtualState.startIndex;
    const endIndex = virtualState.endIndex;
    return filteredAndSortedData.slice(startIndex, endIndex);
  }, [filteredAndSortedData, virtualState.startIndex, virtualState.endIndex]);

  const handleRowClick = useCallback((rowIndex: number, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-dropdown], button, input, a')) return;
    if (openDropdown || isDropdownClosing) return;
  }, [openDropdown, isDropdownClosing]);

  // Optimize cell rendering with useCallback
  const renderCell = useCallback(({ 
    column, 
    row 
  }: { 
    column: ColumnDef<T>, 
    row: T 
  }) => {
    return (
      <div
        key={String(column.field)}
        className="px-3 py-2"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("a, button, input")) {
            e.stopPropagation();
          }
        }}
      >
        {column.cell ? (
          <div
            className="whitespace-pre-line transition-all duration-200 text-text selection:bg-main selection:text-mtext line-clamp-2"
          >
            {column.cell({ row: { original: row } })}
          </div>
        ) : (
          <div
            className="whitespace-pre-line transition-all duration-200 text-text selection:bg-main selection:text-mtext line-clamp-2"
          >
            {row[column.field]}
          </div>
        )}
      </div>
    );
  }, []);

  // Optimize row rendering with useCallback
  const renderRow = useCallback((row: T, rowIndex: number) => {
    return (
      <div
        key={rowIndex}
        className={`grid transition-colors duration-200 ${
          getRowClassName?.(row) || ""
        }`}
        style={{
          gridTemplateColumns: `repeat(${columns.length}, minmax(200px, 1fr))`,
        }}
        onClick={(e) => handleRowClick(rowIndex, e)}
      >
        {columns.map(column => renderCell({ column, row }))}
      </div>
    );
  }, [columns, getRowClassName, handleRowClick, renderCell]);

  // Memoize rendered rows
  const renderedRows = useMemo(() => {
    return visibleRows.map((row, idx) => {
      const rowIndex = virtualState.startIndex + idx;
      return renderRow(row, rowIndex);
    });
  }, [visibleRows, renderRow, virtualState.startIndex]);

  const updateVisibleRows = useCallback(() => {
    const container = gridRef.current;
    if (!container) return;

    const containerHeight = container.clientHeight;
    const totalHeight = filteredAndSortedData.length * ROW_HEIGHT;
    
    // Calculate viewport
    const scrollTop = Math.max(0, Math.min(container.scrollTop, totalHeight - containerHeight));
    const viewportStart = Math.floor(scrollTop / ROW_HEIGHT);
    const viewportItemCount = Math.ceil(containerHeight / ROW_HEIGHT);
    
    // Add overscan and ensure minimum batch size
    const overscanStart = Math.max(0, viewportStart - OVERSCAN_COUNT);
    const overscanEnd = Math.min(
      filteredAndSortedData.length,
      viewportStart + viewportItemCount + OVERSCAN_COUNT
    );
    
    // Ensure we render at least MIN_BATCH_SIZE items for smooth scrolling
    const batchSize = Math.max(
      overscanEnd - overscanStart,
      MIN_BATCH_SIZE
    );
    
    const startIndex = Math.max(0, Math.min(
      overscanStart,
      filteredAndSortedData.length - batchSize
    ));
    
    const endIndex = Math.min(
      startIndex + batchSize,
      filteredAndSortedData.length
    );

    setVirtualState(prev => {
      if (prev.startIndex === startIndex && prev.endIndex === endIndex) {
        return prev;
      }

      return {
        ...prev,
        startIndex,
        endIndex,
        visibleRows: filteredAndSortedData.slice(startIndex, endIndex)
      };
    });
  }, [filteredAndSortedData]);

  // Optimize scroll handling with debounce for rapid scrolling
  const handleScroll = useCallback(() => {
    // Use RAF for smooth scrolling
    if (!scrollTimeout.current) {
      scrollTimeout.current = requestAnimationFrame(() => {
        updateVisibleRows();
        scrollTimeout.current = null;
      });
    }
  }, [updateVisibleRows]);

  // Optimize resize handling
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (resizeTimeout.current) {
        cancelAnimationFrame(resizeTimeout.current);
      }
      resizeTimeout.current = requestAnimationFrame(updateVisibleRows);
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
  }, [updateVisibleRows]);

  // Clean up scroll timeout
  useEffect(() => {
    return () => {
      if (scrollTimeout.current) {
        cancelAnimationFrame(scrollTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    const updateHeaderWidth = () => {
      if (gridRef.current?.firstElementChild && headerRef.current) {
        headerRef.current.style.width = `${gridRef.current.firstElementChild.clientWidth}px`;
      }
    };

    const resizeObserver = new ResizeObserver(updateHeaderWidth);
    if (gridRef.current?.firstElementChild) {
      resizeObserver.observe(gridRef.current.firstElementChild);
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!openDropdown) return;

      const dropdownElement = dropdownRefs.current[openDropdown];
      const target = e.target as HTMLElement;
      
      if (!dropdownElement?.contains(target) && !target.closest('[data-dropdown]')) {
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

  const handleDropdownClick = useCallback((field: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDropdownClosing) return;
    
    const isOpening = openDropdown !== field;
    setOpenDropdown(prev => prev === field ? null : field);
    
    // Focus input when opening dropdown
    if (isOpening) {
      // Use setTimeout to ensure the dropdown is rendered before focusing
      setTimeout(() => {
        inputRefs.current[field]?.focus();
      }, 0);
    }
  }, [isDropdownClosing, openDropdown]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSort = (field: string, direction: SortDirection) => {
    setSortConfig(prevConfig => {
      // If clicking the same sort option that's currently active, disable sorting
      if (prevConfig.field === field && prevConfig.direction === direction) {
        return { field: "", direction: null };
      }
      // Otherwise apply the new sort
      return {
        field,
        direction,
      };
    });
    setOpenDropdown(null);
  };

  // Update visible rows when filtered data changes
  useEffect(() => {
    updateVisibleRows();
  }, [filteredAndSortedData, updateVisibleRows]);

  // Memoize grid styles with opacity transition for hydration
  const gridStyles = useMemo(() => ({
    opacity: mounted ? 1 : 0,
    transition: "opacity 200ms ease-in-out",
  }), [mounted]);

  const contentStyles = useMemo(() => ({
    position: "relative" as const,
    height: `${filteredAndSortedData.length * ROW_HEIGHT + 128}px`, // Add header height to total content height
    opacity: mounted ? 1 : 0,
    transition: "opacity 200ms ease-in-out",
  }), [filteredAndSortedData.length, mounted]);

  const rowsStyles = useMemo(() => ({
    position: "absolute" as const,
    top: `${virtualState.startIndex * ROW_HEIGHT}px`,
    left: 0,
    right: 0,
  }), [virtualState.startIndex]);

  // Optimize dropdown menu rendering with useCallback
  const renderDropdownMenu = useCallback((column: ColumnDef<T>) => {
    if (openDropdown !== String(column.field)) return null;

    return (
      <div 
        className="absolute top-full -left-px -right-px bg-background border border-border shadow-lg z-50 transition-all duration-200"
        style={{
          opacity: isDropdownClosing ? 0 : 1,
          transform: isDropdownClosing ? 'translateY(-4px)' : 'translateY(0)',
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
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenDropdown(null);
                  }
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
  }, [openDropdown, isDropdownClosing, sortConfig, filters, handleSort, handleFilterChange]);

  // Optimize header rendering with useCallback
  const renderHeader = useCallback((column: ColumnDef<T>) => {
    return (
      <div
        key={String(column.field)}
        className="px-3 py-2 border-b border-border select-none relative cursor-pointer transition-colors duration-200 group"
        ref={(el) => void (dropdownRefs.current[String(column.field)] = el)}
        data-dropdown={String(column.field)}
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          // Don't trigger dropdown toggle if clicking on a button or input
          if (target.closest('button, input')) {
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
                  {sortConfig.direction === 'asc' ? (
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
  }, [activeFilters, sortConfig, handleDropdownClick, renderDropdownMenu]);

  // Don't render content until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-text/70">Loading...</div>
      </div>
    );
  }

  return (
    <div 
      ref={gridRef}
      className="h-full overflow-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
      onScroll={handleScroll}
      style={gridStyles}
    >
      <div className="inline-block min-w-full">
        <div className="sticky top-0 z-10 bg-background">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${columns.length}, minmax(200px, 1fr))`,
            }}
          >
            {columns.map(renderHeader)}
          </div>
        </div>
        <div style={contentStyles}>
          <div style={rowsStyles}>{renderedRows}</div>
        </div>
      </div>
    </div>
  );
}
