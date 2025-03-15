"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import {
  ChevronDown,
  ListFilter,
  Check,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

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
};

export function DataGrid<T extends Record<string, any>>({ 
  data, 
  columns, 
  getRowClassName 
}: DataGridProps<T>) {
  const { theme } = useTheme();
  const gridRef = useRef<HTMLDivElement>(null);
  const [virtualState, setVirtualState] = useState({
    startIndex: 0,
    endIndex: 50, // Initial viewport size
    expandedRows: {} as Record<number, boolean>,
    visibleRows: [] as T[]
  });

  const [mounted, setMounted] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    field: string;
    direction: SortDirection;
  }>({
    field: "",
    direction: null,
  });

  const [filters, setFilters] = useState<{ [key: string]: string }>({});
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isDropdownClosing, setIsDropdownClosing] = useState(false);
  
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Compute filtered and sorted data first
  const filteredAndSortedData = React.useMemo(() => {
    let result = data.filter((item) => {
      return Object.entries(filters).every(([field, filterValue]) => {
        if (!filterValue) return true;
        const value = item[field as keyof T];
        return String(value)
          .toLowerCase()
          .includes(filterValue.toLowerCase());
      });
    });

    if (sortConfig.direction) {
      result = [...result].sort((a, b) => {
        const aValue = a[sortConfig.field as keyof T];
        const bValue = b[sortConfig.field as keyof T];

        if (aValue === bValue) return 0;
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (sortConfig.direction === "most" && sortConfig.field === "recommender") {
          const aCount = String(aValue).split(',').filter(r => r.trim()).length;
          const bCount = String(bValue).split(',').filter(r => r.trim()).length;
          return bCount - aCount;
        }

        const comparison = aValue < bValue ? -1 : 1;
        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [data, filters, sortConfig]);

  // Handle hydration and localStorage
  useEffect(() => {
    const savedSortConfig = localStorage.getItem('gridSortConfig');
    const savedFilters = localStorage.getItem('gridFilters');
    const savedActiveFilters = localStorage.getItem('gridActiveFilters');

    if (savedSortConfig) setSortConfig(JSON.parse(savedSortConfig));
    if (savedFilters) setFilters(JSON.parse(savedFilters));
    if (savedActiveFilters) setActiveFilters(JSON.parse(savedActiveFilters));
    
    setMounted(true);
  }, []);

  // Save state changes to localStorage
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('gridSortConfig', JSON.stringify(sortConfig));
    localStorage.setItem('gridFilters', JSON.stringify(filters));
    localStorage.setItem('gridActiveFilters', JSON.stringify(activeFilters));
  }, [sortConfig, filters, activeFilters, mounted]);

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

  const updateVisibleRows = useCallback(() => {
    const container = gridRef.current;
    if (!container) return;

    const containerHeight = container.clientHeight;
    const rowHeight = 32; // Fixed row height
    const bufferRows = 20; // Increased buffer for smoother scrolling
    const scrollTop = container.scrollTop;
    const currentIndex = Math.floor(scrollTop / rowHeight);
    
    const visibleRowCount = Math.ceil(containerHeight / rowHeight);
    const startIndex = Math.max(0, currentIndex - bufferRows);
    const endIndex = Math.min(filteredAndSortedData.length, currentIndex + visibleRowCount + bufferRows * 2);

    setVirtualState(prev => ({
      ...prev,
      startIndex,
      endIndex,
      visibleRows: filteredAndSortedData.slice(startIndex, endIndex)
    }));
  }, [filteredAndSortedData]);

  // Update visible rows when filtered data changes
  useEffect(() => {
    updateVisibleRows();
  }, [filteredAndSortedData, updateVisibleRows]);

  const handleScroll = useCallback(() => {
    requestAnimationFrame(updateVisibleRows);
  }, [updateVisibleRows]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      updateVisibleRows();
    });

    const container = gridRef.current;
    if (container) {
      observer.observe(container);
    }

    return () => observer.disconnect();
  }, [updateVisibleRows]);

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

  const handleDropdownClick = useCallback((field: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDropdownClosing) return;
    setOpenDropdown(prev => prev === field ? null : field);
  }, [isDropdownClosing]);

  const handleSort = (field: string, direction: SortDirection) => {
    const newSortConfig = {
      field:
        sortConfig.field === field && sortConfig.direction === direction
          ? ""
          : field,
      direction:
        sortConfig.field === field && sortConfig.direction === direction
          ? null
          : direction,
    };
    setSortConfig(newSortConfig);
    setOpenDropdown(null);
  };

  const handleFilterChange = (field: string, value: string) => {
    const newFilters = {
      ...filters,
      [field]: value,
    };
    setFilters(newFilters);

    if (value && !activeFilters.includes(field)) {
      setActiveFilters([...activeFilters, field]);
    } else if (!value && activeFilters.includes(field)) {
      setActiveFilters(activeFilters.filter((f) => f !== field));
    }
  };

  // Only render visible rows
  const renderedRows = virtualState.visibleRows.map((row, idx) => {
    const rowIndex = virtualState.startIndex + idx;
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
        {columns.map((column) => (
          <div
            key={String(column.field)}
            className="px-3 py-2 border-b border-grid-border"
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
                  !isExpanded && column.isExpandable
                    ? "line-clamp-2"
                    : ""
                }`}
              >
                {row[column.field]}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  });

  return (
    <div 
      ref={gridRef}
      className="h-full overflow-auto"
      onScroll={handleScroll}
    >
      <div 
        className={`min-w-full inline-block align-middle transition-opacity duration-200 ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Header */}
        <div 
          className="sticky top-0 min-w-full bg-background z-50"
        >
          {/* Column headers */}
          <div
            className="grid h-10 items-center"
            style={{
              gridTemplateColumns: `repeat(${columns.length}, minmax(200px, 1fr))`,
            }}
          >
            {columns.map((column) => (
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
                      ) : (
                        <ArrowDown className="w-3 h-3 text-text/70" />
                      ))}
                    <ChevronDown className="w-4 h-4 text-text/70" />
                  </button>
                </div>

                {/* Dropdown Menu */}
                {openDropdown === String(column.field) && (
                  <div 
                    className="absolute top-full left-0 right-0 bg-background border border-border shadow-lg z-50 transition-all duration-200"
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
                            <ArrowDown className="w-3 h-3 text-text/70" />
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
                            className="w-full px-2 py-1 border border-border bg-background text-text selection:bg-main selection:text-mtext focus:outline-none"
                            placeholder="Search"
                            value={filters[String(column.field)] || ""}
                            onChange={(e) =>
                              handleFilterChange(String(column.field), e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                          {filters[String(column.field)] && (
                            <button
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-text/70 transition-colors duration-200 md:hover:text-text"
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
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Virtualized Rows */}
        <div 
          className="relative" 
          style={{ 
            height: `${filteredAndSortedData.length * 32}px`,
            willChange: 'transform',
            contain: 'strict'
          }}
        >
          <div 
            className="absolute top-0 left-0 w-full"
            style={{ 
              transform: `translateY(${virtualState.startIndex * 32}px)`,
              willChange: 'transform',
              contain: 'content'
            }}
          >
            {renderedRows}
          </div>
        </div>
      </div>
    </div>
  );
}
