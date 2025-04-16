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
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

type SortDirection = "asc" | "desc" | null;

type ColumnDef<T> = {
  field: keyof T;
  header: string;
  width?: number;
  cell?: (props: {
    row: { original: T };
  }) => React.ReactNode;
};

type DataGridProps<T extends Record<string, any>> = {
  data: T[];
  columns: ColumnDef<T>[];
  getRowClassName?: (row: T) => string;
  onFilteredDataChange?: (count: number) => void;
  onRowClick?: (row: T) => void;
};

type SortConfig = {
  field: string;
  direction: SortDirection;
};

export function DataGrid<T extends Record<string, any>>({ 
  data, 
  columns, 
  getRowClassName,
  onFilteredDataChange,
  onRowClick,
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
  const ROW_HEIGHT = 56; // Approximate height of each row
  const listRef = useRef<List>(null);

  // Memoize active filters to prevent unnecessary recalculations
  const activeFilters = useMemo(() => {
    return Object.entries(filters)
      .filter(([_, value]) => value)
      .map(([key]) => key);
  }, [filters]);

  // Memoize filtered data to prevent unnecessary recalculations
  const filteredData = useMemo(() => {
    if (activeFilters.length === 0) {
      return data;
    }

    return data.filter(item => {
      return activeFilters.every(field => {
        const filterValue = filters[field]?.toLowerCase();
        if (!filterValue) return true;
        
        // Filter by recommender full name
        if (field === 'recommenders') {
          const recommendations = (item as any).recommendations || [];
          const recommenderNames = recommendations
            .filter((rec: any) => rec.recommender)
            .map((rec: any) => rec.recommender.full_name.toLowerCase());
          return recommenderNames.some((name: string) => name.includes(filterValue));
        }
        
        const fieldValue = String(item[field as keyof T] || "").toLowerCase();
        return fieldValue.includes(filterValue);
      });
    });
  }, [data, filters, activeFilters]);

  // Update filtered count for parent components
  useEffect(() => {
    onFilteredDataChange?.(filteredData.length);
    bookCountManager.update(data.length, filteredData.length);
  }, [filteredData.length, data.length, onFilteredDataChange]);

  // Memoize sorted data to prevent unnecessary recalculations
  const filteredAndSortedData = useMemo(() => {
    if (!sortConfig.field || !sortConfig.direction) {
      return filteredData;
    }

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.field as keyof T];
      const bValue = b[sortConfig.field as keyof T];
      
      // Special handling for recommenders column - sort by popularity
      if (sortConfig.field === 'recommenders') {
        // Sort by number of recommenders (popularity)
        const aRecs = (a as any).recommendations?.length || 0;
        const bRecs = (b as any).recommendations?.length || 0;
        const sortDirection = sortConfig.direction === "asc" ? 1 : -1;
        return (bRecs - aRecs) * sortDirection;
      }
      
      // Handle null or undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      
      // Handle different value types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      // Default numeric comparison
      return sortConfig.direction === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [filteredData, sortConfig.field, sortConfig.direction]);

  const handleRowClick = useCallback((e: React.MouseEvent, row: T) => {
    const target = e.target as HTMLElement;
    
    // Don't trigger row click if:
    // 1. Clicking inside a dropdown menu or dropdown trigger
    // 2. Clicking on interactive elements
    // 3. A dropdown is open or closing
    if (
      target.closest('[data-dropdown]') ||
      target.closest('a, button, input') ||
      openDropdown ||
      isDropdownClosing
    ) {
      return;
    }
    
    onRowClick?.(row);
  }, [onRowClick, openDropdown, isDropdownClosing]);

  // Cell renderer - maintains exact same styling as before
  const renderCell = useCallback(({ column, row }: { column: ColumnDef<T>; row: T }) => {
    return (
      <div
        key={String(column.field)}
        className="px-3 py-2"
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

  // Row renderer optimized for virtualization
  const renderRow = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const row = filteredAndSortedData[index];
    
    return (
      <div
        key={index}
        className={`grid transition-colors duration-200 ${
          getRowClassName?.(row) || ""
        }`}
        style={{
          ...style,
          gridTemplateColumns: `repeat(${columns.length}, minmax(200px, 1fr))`,
          width: '100%'
        }}
        onClick={(e) => handleRowClick(e, row)}
      >
        {columns.map(column => renderCell({ column, row }))}
      </div>
    );
  }, [columns, filteredAndSortedData, getRowClassName, handleRowClick, renderCell]);

  // Sync horizontal scroll between header and list
  useEffect(() => {
    if (gridRef.current) {
      const handleGridScroll = () => {
        if (headerRef.current && gridRef.current) {
          headerRef.current.style.transform = `translateX(-${gridRef.current.scrollLeft}px)`;
        }
      };
      
      gridRef.current.addEventListener('scroll', handleGridScroll);
      return () => {
        gridRef.current?.removeEventListener('scroll', handleGridScroll);
      };
    }
  }, []);

  // Clean up scroll timeout
  useEffect(() => {
    return () => {
      if (scrollTimeout.current) {
        cancelAnimationFrame(scrollTimeout.current);
      }
    };
  }, []);

  // Handle dropdown interactions
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
                className="w-full px-2 py-1 border border-border bg-background text-text text-base sm:text-sm placeholder:text-sm selection:bg-main selection:text-mtext focus:outline-none"
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
              <ChevronDown className="w-4 h-4 text-text/70 transition-colors duration-200 p-0.5 md:group-hover:bg-accent/50 hidden md:group-hover:block" />
            </div>
          </div>
        </div>
        {renderDropdownMenu(column)}
      </div>
    );
  }, [activeFilters, sortConfig, handleDropdownClick, renderDropdownMenu]);

  // Memoize grid styles with opacity transition for hydration
  const gridStyles = useMemo(() => ({
    opacity: mounted ? 1 : 0,
    transition: "opacity 200ms ease-in-out",
  }), [mounted]);

  // Content styles for virtualization
  const contentStyles = useMemo(() => ({
    opacity: mounted ? 1 : 0,
    transition: "opacity 200ms ease-in-out",
  }), [mounted]);

  // Virtualized list with AutoSizer
  const renderedRows = useMemo(() => {
    return (
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            height={height}
            width={width}
            itemCount={filteredAndSortedData.length}
            itemSize={ROW_HEIGHT}
            overscanCount={20}
            className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          >
            {renderRow}
          </List>
        )}
      </AutoSizer>
    );
  }, [filteredAndSortedData.length, renderRow]);

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
      className="h-full flex flex-col overflow-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
      style={gridStyles}
    >
      <div className="sticky top-0 z-10 bg-background">
        <div
          ref={headerRef}
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${columns.length}, minmax(200px, 1fr))`,
          }}
        >
          {columns.map(renderHeader)}
        </div>
      </div>
      <div className="flex-1 overflow-hidden" style={contentStyles}>
        {renderedRows}
      </div>
    </div>
  );
}
