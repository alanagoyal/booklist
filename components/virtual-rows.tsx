"use client";

import { memo, useCallback, useLayoutEffect, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export type ColumnDef<T> = {
  field: keyof T;
  header: string;
  cell?: (props: { row: { original: T } }) => ReactNode;
};

export const ROW_HEIGHT = 56;
export const HEADER_HEIGHT = 37;

type RowData = Record<string, any> & { id: string };
type RowProps<T extends RowData> = {
  row: T;
  top: number;
  columns: ColumnDef<T>[];
  getRowClassName?: (row: T) => string;
  onRowClick?: (row: T) => void;
};

const Row = memo(function Row<T extends RowData>({
  row,
  top,
  columns,
  getRowClassName,
  onRowClick,
}: RowProps<T>) {
  return (
    <div
      data-row-id={row.id}
      className={`grid overflow-hidden ${getRowClassName?.(row) ?? ""}`}
      style={{
        gridTemplateColumns: `repeat(${columns.length}, minmax(200px, 1fr))`,
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: ROW_HEIGHT,
        lineHeight: "20px",
        transform: `translateY(${top}px)`,
      }}
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest("a, button, input"))
          onRowClick?.(row);
      }}
    >
      {columns.map((column) => (
        <div
          key={String(column.field)}
          className="min-w-0 overflow-hidden px-3 py-2"
        >
          <div className="whitespace-pre-line text-text selection:bg-main selection:text-mtext line-clamp-2">
            {column.cell
              ? column.cell({ row: { original: row } })
              : row[column.field]}
          </div>
        </div>
      ))}
    </div>
  );
}) as <T extends RowData>(props: RowProps<T>) => ReactNode;

type Props<T extends RowData> = Omit<RowProps<T>, "row" | "top"> & {
  rows: T[];
  scrollElement: HTMLDivElement | null;
};

export const VirtualRows = memo(function VirtualRows<T extends RowData>({
  rows,
  scrollElement,
  ...rowProps
}: Props<T>) {
  const getItemKey = useCallback((index: number) => rows[index].id, [rows]);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElement,
    getItemKey,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    scrollMargin: HEADER_HEIGHT,
    // Render real rows in the initial HTML and use the same initial window for
    // hydration. The virtualizer measures the actual viewport after mounting.
    initialRect: { width: 0, height: 800 },
  });

  useLayoutEffect(() => {
    scrollElement?.scrollTo({ top: 0 });
  }, [rows, scrollElement]);

  return (
    <div
      className="relative"
      data-row-count={rows.length}
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualizer.getVirtualItems().map((item) => (
        <Row
          key={item.key}
          row={rows[item.index]}
          top={item.start - HEADER_HEIGHT}
          {...rowProps}
        />
      ))}
    </div>
  );
}) as <T extends RowData>(props: Props<T>) => ReactNode;
