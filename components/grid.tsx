'use client';

import React, { useState } from 'react';
import { ThemeToggle } from './theme-toggle';

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
};

export function DataGrid({ data, columns }: DataGridProps) {
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: SortDirection }>({
    field: '',
    direction: null,
  });
  const [filters, setFilters] = useState<{ [key: string]: string }>({});

  const handleSort = (field: string) => {
    setSortConfig(current => ({
      field,
      direction: current.field === field 
        ? (current.direction === null ? 'desc' : current.direction === 'desc' ? 'asc' : null)
        : 'desc'
    }));
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(current => ({
      ...current,
      [field]: value
    }));
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
    <div className="w-full text-sm relative">
      <div className="sticky top-0 bg-background z-10">
        {/* Title */}
        <div className="px-3 py-2 border-b flex justify-between items-center">
          <span>booklist</span>
          <ThemeToggle />
        </div>
        {/* Filters */}
        <div className="grid" style={{ gridTemplateColumns: columns.map(col => col.width ? `${col.width}fr` : '1fr').join(' ') }}>
          {columns.map((column) => (
            <div key={`filter-${column.field}`} className="px-3 py-2 border-b relative">
              <input
                type="text"
                className="w-full bg-transparent outline-none text-sm truncate"
                placeholder={`search ${column.header.toLowerCase()}`}
                value={filters[column.field] || ''}
                onChange={(e) => handleFilterChange(column.field, e.target.value)}
              />
              {filters[column.field] && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => handleFilterChange(column.field, '')}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="grid" style={{ gridTemplateColumns: columns.map(col => col.width ? `${col.width}fr` : '1fr').join(' ') }}>
          {columns.map((column) => (
            <div
              key={column.field}
              className="px-3 py-2 border-b font-medium cursor-pointer select-none flex items-center justify-between"
              onClick={() => handleSort(column.field)}
            >
              <span>{column.header.toLowerCase()}</span>
              <span className="ml-1">
                {sortConfig.field === column.field ? (
                  sortConfig.direction === 'desc' ? '↓' :
                  sortConfig.direction === 'asc' ? '↑' : 
                  '↕'
                ) : '↕'}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Body */}
      <div>
        {filteredAndSortedData.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="grid"
            style={{ gridTemplateColumns: columns.map(col => col.width ? `${col.width}fr` : '1fr').join(' ') }}
          >
            {columns.map((column) => {
              const value = row[column.field];
              return (
                <div
                  key={`${rowIndex}-${column.field}`}
                  className="px-3 py-2 border-b"
                >
                  {column.cell ? column.cell({ row: { original: row } }) : value}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
