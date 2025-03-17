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
import { bookCountManager } from './book-counter';

type SortDirection = "asc" | "desc" | "most" | null;

type ColumnDef<T> = {
  field: keyof T;
  header: string;
  width?: number;
  cell?: (props: {
    row: { original: T; isExpanded: boolean };
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
  expandedRows: Record<number, boolean>;
  visibleRows: T[];
};

export function DataGrid<T extends Record<string, any>>({ 
  data, 
  columns, 
  getRowClassName,
  onFilteredDataChange
}: DataGridProps<T>) {
  const gridRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Initialize state with consistent defaults for SSR
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: "", direction: null });
  const [filters, setFilters] = useState<{ [key: string]: string }>({});
  const [virtualState, setVirtualState] = useState<VirtualState<T>>({
    startIndex: 0,
    endIndex: 50,
    expandedRows: {},
    visibleRows: []
  });

  // Load saved state on client-side only
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedSortConfig = localStorage.getItem('gridSortConfig');
      if (savedSortConfig) {
        setSortConfig(JSON.parse(savedSortConfig));
      }

      const savedFilters = localStorage.getItem('gridFilters');
      if (savedFilters) {
        setFilters(JSON.parse(savedFilters));
      }
    } catch (e) {
      console.error('Failed to load saved grid state:', e);
    }

    setMounted(true);
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (!mounted) return;
    
    try {
      localStorage.setItem('gridSortConfig', JSON.stringify(sortConfig));
      localStorage.setItem('gridFilters', JSON.stringify(filters));
    } catch (e) {
      console.error('Failed to save grid state:', e);
    }
  }, [sortConfig, filters, mounted]);

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
        const value = String(item[field as keyof T]).toLowerCase();
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

      if (direction === "most") {
        const aCount = typeof aValue === "string" ? aValue.split(",").filter(Boolean).length : 0;
        const bCount = typeof bValue === "string" ? bValue.split(",").filter(Boolean).length : 0;
        return bCount - aCount;
      }

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const sortDirection = direction === "asc" ? 1 : -1;
      return aValue < bValue ? -sortDirection : sortDirection;
    });
  }, [filteredData, sortConfig.field, sortConfig.direction]);

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

    setVirtualState(prev => ({
      ...prev,
      expandedRows: {
        ...prev.expandedRows,
        [rowIndex]: !prev.expandedRows[rowIndex]
      }
    }));
  }, [openDropdown, isDropdownClosing]);

  // Optimize cell rendering with useCallback
  const renderCell = useCallback(({ 
    column, 
    row, 
    isExpanded 
  }: { 
    column: ColumnDef<T>, 
    row: T, 
    isExpanded: boolean 
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
            className={`whitespace-pre-line transition-all duration-200 text-text selection:bg-main selection:text-mtext ${
              !isExpanded ? "line-clamp-2" : ""
            }`}
          >
            {column.cell({ row: { original: row, isExpanded } })}
          </div>
        ) : (
          <div
            className={`whitespace-pre-line transition-all duration-200 text-text selection:bg-main selection:text-mtext ${
              !isExpanded ? "line-clamp-2" : ""
            }`}
          >
            {row[column.field]}
          </div>
        )}
      </div>
    );
  }, []);

  // Optimize row rendering with useCallback
  const renderRow = useCallback((row: T, rowIndex: number) => {
    const isExpanded = virtualState.expandedRows[rowIndex];
    return (
      <div
        key={rowIndex}
        className={`grid cursor-pointer transition-colors duration-200 md:hover:bg-accent/50 ${
          getRowClassName?.(row) || ""
        }`}
        style={{
          gridTemplateColumns: `repeat(${columns.length}, minmax(200px, 1fr))`,
        }}
        onClick={(e) => handleRowClick(rowIndex, e)}
      >
        {columns.map(column => renderCell({ column, row, isExpanded }))}
      </div>
    );
  }, [columns, virtualState.expandedRows, getRowClassName, handleRowClick, renderCell]);

  // Memoize rendered rows
  const renderedRows = useMemo(() => {
    return visibleRows.map((row, idx) => {
      const rowIndex = virtualState.startIndex + idx;
      return renderRow(row, rowIndex);
    });
  }, [visibleRows, virtualState.startIndex, renderRow]);

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
        endIndex
      };
    });
  }, [filteredAndSortedData.length]);

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
    const newSortConfig = {
      field,
      direction: sortConfig.field === field && sortConfig.direction === direction ? null : direction,
    };
    setSortConfig(newSortConfig);
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
    height: `${filteredAndSortedData.length * ROW_HEIGHT + 48}px`, // Add header height to total content height
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
        className="absolute top-full -left-px right-0 bg-background border border-border shadow-lg z-50 transition-all duration-200"
        style={{
          opacity: isDropdownClosing ? 0 : 1,
          transform: isDropdownClosing ? 'translateY(-4px)' : 'translateY(0)',
        }}
      >
        <div className="py-1">
          {String(column.field) === "recommender" && (
            <button
              className="w-full px-4 py-2 text-left text-text transition-colors duration-200 md:hover:bg-accent/50 flex items-center justify-between"
              onClick={(e) => {
                e.preventDefault();
                handleSort(String(column.field), "most");
              }}
            >
              <div className="flex items-center gap-2">
                <Award className="w-3 h-3 text-text/70" />
                <span>Sort by most recommended</span>
              </div>
              {sortConfig.field === String(column.field) &&
                sortConfig.direction === "most" && (
                  <Check className="w-3 h-3 text-text/70" />
                )}
            </button>
          )}
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
        className="px-3 py-2 border-b border-border select-none relative"
        ref={(el) => void (dropdownRefs.current[String(column.field)] = el)}
      >
        <div className="flex items-center justify-between">
          <span className="font-base text-text">{column.header}</span>
          <button
            data-dropdown={String(column.field)}
            onMouseDown={(e) => handleDropdownClick(String(column.field), e)}
            className="flex items-center gap-1 transition-colors duration-200 md:hover:bg-accent/50"
          >
            {activeFilters.includes(String(column.field)) && (
              <ListFilter className="w-3 h-3 text-text/70" />
            )}
            {sortConfig.field === String(column.field) &&
              (sortConfig.direction === "asc" ? (
                <ArrowUp className="w-3 h-3 text-text/70" />
              ) : sortConfig.direction === "most" ? (
                <Award className="w-3 h-3 text-text/70" />
              ) : (
                <ArrowDown className="w-3 h-3 text-text/70" />
              ))}
            <ChevronDown className="w-4 h-4 text-text/70" />
          </button>
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
