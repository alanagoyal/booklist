"use client";

import React, { useState, useRef, useEffect } from "react";
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

  const [sortConfig, setSortConfig] = useState<{
    field: string;
    direction: SortDirection;
  }>(() => {
    const saved = localStorage.getItem('gridSortConfig');
    return saved ? JSON.parse(saved) : {
      field: "",
      direction: null,
    };
  });

  const [filters, setFilters] = useState<{ [key: string]: string }>(() => {
    const saved = localStorage.getItem('gridFilters');
    return saved ? JSON.parse(saved) : {};
  });

  const [activeFilters, setActiveFilters] = useState<string[]>(() => {
    const saved = localStorage.getItem('gridActiveFilters');
    return saved ? JSON.parse(saved) : [];
  });

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const isClosingDropdown = useRef(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openDropdown) {
        const dropdownElement = dropdownRefs.current[openDropdown];
        if (
          dropdownElement &&
          !dropdownElement.contains(event.target as Node)
        ) {
          isClosingDropdown.current = true;
          setOpenDropdown(null);
          setTimeout(() => {
            isClosingDropdown.current = false;
          }, 0);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdown]);

  useEffect(() => {
    localStorage.setItem('gridSortConfig', JSON.stringify(sortConfig));
    localStorage.setItem('gridFilters', JSON.stringify(filters));
    localStorage.setItem('gridActiveFilters', JSON.stringify(activeFilters));
  }, [sortConfig, filters, activeFilters]);

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

  const toggleDropdown = (field: string) => {
    setOpenDropdown(openDropdown === field ? null : field);
    if (openDropdown !== field) {
      setTimeout(() => {
        inputRefs.current[field]?.focus();
      }, 0);
    }
  };

  const toggleRowExpand = (rowIndex: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  };

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

  return (
    <div className="h-full overflow-auto">
      <div className="min-w-full inline-block align-middle">
        {/* Header section */}
        <div className="sticky top-0 min-w-full bg-background z-50">
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
                    onClick={() => toggleDropdown(String(column.field))}
                    className="flex items-center gap-1 hover:bg-accent/50 transition-colors duration-200"
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
                  <div className="absolute top-full left-0 right-0 bg-background border border-border shadow-lg z-50">
                    <div className="py-1">
                      {String(column.field) === "recommender" && (
                        <button
                          className="w-full px-4 py-2 text-left hover:bg-accent/50 transition-colors duration-200 flex items-center justify-between"
                          onClick={() => handleSort(String(column.field), "most")}
                        >
                          <div className="flex items-center gap-2">
                            <ArrowDown className="w-3 h-3 text-text/70" />
                            <span className="text-text">Sort by most recommended</span>
                          </div>
                          {sortConfig.field === String(column.field) &&
                            sortConfig.direction === "most" && (
                              <Check className="w-3 h-3 text-text/70" />
                            )}
                        </button>
                      )}
                      <button
                        className="w-full px-4 py-2 text-left hover:bg-accent/50 transition-colors duration-200 flex items-center justify-between"
                        onClick={() => handleSort(String(column.field), "asc")}
                      >
                        <div className="flex items-center gap-2">
                          <ArrowUp className="w-3 h-3 text-text/70" />
                          <span className="text-text">Sort ascending</span>
                        </div>
                        {sortConfig.field === String(column.field) &&
                          sortConfig.direction === "asc" && (
                            <Check className="w-3 h-3 text-text/70" />
                          )}
                      </button>
                      <button
                        className="w-full px-4 py-2 text-left hover:bg-accent/50 transition-colors duration-200 flex items-center justify-between"
                        onClick={() => handleSort(String(column.field), "desc")}
                      >
                        <div className="flex items-center gap-2">
                          <ArrowDown className="w-3 h-3 text-text/70" />
                          <span className="text-text">Sort descending</span>
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
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-text/70 hover:text-text transition-colors duration-200"
                              onClick={(e) => {
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

        {/* Table body */}
        <div className="overflow-auto">
          {filteredAndSortedData.map((row, rowIndex) => {
            const isExpanded = expandedRows.has(rowIndex);

            return (
              <div
                key={rowIndex}
                className={`grid cursor-pointer hover:bg-accent/50 transition-colors duration-200 ${
                  getRowClassName?.(row) || ""
                }`}
                style={{
                  gridTemplateColumns: `repeat(${columns.length}, minmax(200px, 1fr))`,
                }}
                onClick={() => {
                  if (!isClosingDropdown.current) {
                    toggleRowExpand(rowIndex);
                  }
                }}
              >
                {columns.map((column) => (
                  <div
                    key={String(column.field)}
                    className="px-3 py-2 border-b border-grid-border"
                    onClick={(e) => {
                      if (
                        (e.target as HTMLElement).closest("a, button, input")
                      ) {
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
          })}
        </div>
      </div>
    </div>
  );
}
