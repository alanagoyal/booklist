'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { ChevronDown, ListFilter, Check, X } from 'lucide-react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';

type SortDirection = 'asc' | 'desc' | null;

type ColumnDef = {
  field: string;
  header: string;
  width?: number;
  cell?: (props: { row: { original: any } }) => React.ReactNode;
};

type DataItem = {
  [key: string]: any;
};

type DataGridProps = {
  data: DataItem[];
  columns: ColumnDef[];
  getRowClassName?: (row: DataItem) => string;
};

export function DataGrid({ data, columns, getRowClassName }: DataGridProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [sortConfig, setSortConfig] = useState<{ field: string; direction: SortDirection }>(() => ({
    field: searchParams.get('sortField') || '',
    direction: (searchParams.get('sortDir') as SortDirection) || null,
  }));

  const [filters, setFilters] = useState<{ [key: string]: string }>(() => {
    const urlFilters: { [key: string]: string } = {};
    columns.forEach(column => {
      const filterValue = searchParams.get(`filter_${column.field}`);
      if (filterValue) {
        urlFilters[column.field] = filterValue;
      }
    });
    return urlFilters;
  });

  const [activeFilters, setActiveFilters] = useState<string[]>(() => 
    Object.keys(filters).filter(key => filters[key])
  );

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openDropdown) {
        const dropdownElement = dropdownRefs.current[openDropdown];
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const updateUrlParams = (newSortConfig: typeof sortConfig, newFilters: typeof filters) => {
    const params = new URLSearchParams(searchParams);
    
    // Update sort parameters
    if (newSortConfig.field && newSortConfig.direction) {
      params.set('sortField', newSortConfig.field);
      params.set('sortDir', newSortConfig.direction);
    } else {
      params.delete('sortField');
      params.delete('sortDir');
    }

    // Update filter parameters
    Object.entries(newFilters).forEach(([field, value]) => {
      if (value) {
        params.set(`filter_${field}`, value);
      } else {
        params.delete(`filter_${field}`);
      }
    });

    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleSort = (field: string, direction: SortDirection) => {
    const newSortConfig = { field, direction };
    setSortConfig(newSortConfig);
    updateUrlParams(newSortConfig, filters);
    setOpenDropdown(null);
  };

  const handleFilterChange = (field: string, value: string) => {
    const newFilters = {
      ...filters,
      [field]: value
    };
    setFilters(newFilters);
    updateUrlParams(sortConfig, newFilters);
    
    if (value && !activeFilters.includes(field)) {
      setActiveFilters([...activeFilters, field]);
    } else if (!value && activeFilters.includes(field)) {
      setActiveFilters(activeFilters.filter(f => f !== field));
    }
  };

  const toggleDropdown = (field: string) => {
    setOpenDropdown(openDropdown === field ? null : field);
  };

  const filteredAndSortedData = React.useMemo(() => {
    // First apply filters
    let result = data.filter(item => {
      return Object.entries(filters).every(([field, filterValue]) => {
        if (!filterValue) return true;
        const value = item[field];
        return value?.toString().toLowerCase().includes(filterValue.toLowerCase());
      });
    });

    // Then apply sorting
    if (sortConfig.direction) {
      result = [...result].sort((a, b) => {
        const aValue = a[sortConfig.field];
        const bValue = b[sortConfig.field];

        if (aValue === bValue) return 0;
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        const comparison = aValue < bValue ? -1 : 1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, sortConfig, filters]);

  return (
    <div className="h-dvh w-full text-sm flex flex-col">
      {/* Title - always visible, no scroll */}
      <div className="bg-background border-b">
        <div className="h-16 px-3 py-2 flex justify-between items-center">
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="font-bold font-display text-xl cursor-pointer"
          >
            BOOKLIST
          </button>
        </div>
      </div>

      {/* Scrollable container for both header and body */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-full inline-block align-middle">
          {/* Header section */}
          <div className="sticky top-0 min-w-full bg-background z-50">
            {/* Column headers */}
            <div className="grid h-10 items-center" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(200px, 1fr))` }}>
              {columns.map((column) => (
                <div
                  key={column.field}
                  className="px-3 py-2 border-b select-none relative"
                  ref={el => void (dropdownRefs.current[column.field] = el)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{column.header}</span>
                    <button
                      onClick={() => toggleDropdown(column.field)}
                      className="flex items-center gap-1 hover:bg-accent rounded p-1"
                    >
                      {activeFilters.includes(column.field) && (
                        <ListFilter className="w-3 h-3" />
                      )}
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Dropdown Menu */}
                  {openDropdown === column.field && (
                    <div className="absolute top-full left-0 right-0 bg-background border shadow-lg z-50">
                      <div className="py-1">
                        <button
                          className="w-full px-4 py-2 text-left hover:bg-accent/50 flex items-center justify-between"
                          onClick={() => handleSort(column.field, 'asc')}
                        >
                          sort ascending
                          {sortConfig.field === column.field && sortConfig.direction === 'asc' && (
                            <Check className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          className="w-full px-4 py-2 text-left hover:bg-accent/50 flex items-center justify-between"
                          onClick={() => handleSort(column.field, 'desc')}
                        >
                          sort descending
                          {sortConfig.field === column.field && sortConfig.direction === 'desc' && (
                            <Check className="w-3 h-3" />
                          )}
                        </button>
                        <div className="px-4 py-2">
                          <div className="relative">
                            <input
                              type="text"
                              className="w-full px-2 py-1 border rounded bg-background pr-7"
                              placeholder="search"
                              value={filters[column.field] || ''}
                              onChange={(e) => handleFilterChange(column.field, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {filters[column.field] && (
                              <button
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground/70"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFilterChange(column.field, '');
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
          <div>
            {filteredAndSortedData.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className={`grid transition-colors ${getRowClassName?.(row) || ''}`}
                style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(200px, 1fr))` }}
              >
                {columns.map((column) => (
                  <div key={column.field} className="px-3 py-2 border-b">
                    {column.cell ? column.cell({ row: { original: row } }) : row[column.field]}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
