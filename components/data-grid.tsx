'use client';

import React from 'react';

type ColumnDef = {
  field: string;
  header: string;
  width?: number;
};

type DataItem = {
  [key: string]: any;
};

type DataGridProps = {
  data: DataItem[];
  columns: ColumnDef[];
};

export function DataGrid({ data, columns }: DataGridProps) {
  return (
    <div className="w-full text-sm">
      {/* Header */}
      <div className="grid" style={{ gridTemplateColumns: columns.map(col => col.width ? `${col.width}fr` : '1fr').join(' ') }}>
        {columns.map((column) => (
          <div
            key={column.field}
            className="px-3 py-2 border-b-2 font-medium"
          >
            {column.header}
          </div>
        ))}
      </div>
      
      {/* Body */}
      <div>
        {data.map((row, rowIndex) => (
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
                  {value}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
