'use client';

import React, { useState } from 'react';

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

  const handleSort = (field: string) => {
    setSortConfig(current => ({
      field,
      direction: current.field === field 
        ? (current.direction === null ? 'desc' : current.direction === 'desc' ? 'asc' : null)
        : 'desc'
    }));
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig.direction) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  return (
    <div className="w-full text-sm">
      {/* Header */}
      <div className="grid" style={{ gridTemplateColumns: columns.map(col => col.width ? `${col.width}fr` : '1fr').join(' ') }}>
        {columns.map((column) => (
          <div
            key={column.field}
            className="px-3 py-2 border-b-2 font-medium cursor-pointer select-none flex items-center justify-between"
            onClick={() => handleSort(column.field)}
          >
            <span>{column.header}</span>
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
      
      {/* Body */}
      <div>
        {sortedData.map((row, rowIndex) => (
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
