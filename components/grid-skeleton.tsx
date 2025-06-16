"use client";

import React from "react";

type GridSkeletonProps = {
  rowCount?: number;
  columnCount?: number;
};

export function GridSkeleton({ rowCount = 30, columnCount = 5 }: GridSkeletonProps) {

  return (
    <div className="flex flex-col h-full">
      {/* Search box skeleton */}
      <div className="flex items-center h-10 px-3 pb-1 border-b border-border">
        <div className="w-4 h-4 bg-background/70 animate-pulse"></div>
      </div>
      
      {/* Scrollable grid content */}
      <div
        className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
      >
        <div className="inline-block min-w-full">
          <div className="sticky top-0 z-10 bg-background">
            {/* Column headers */}
            <div
              className="grid h-[37px]"
              style={{
                gridTemplateColumns: `repeat(${columnCount}, minmax(200px, 1fr))`,
              }}
            >
              {Array.from({ length: columnCount }).map((_, index) => (
                <div key={index} className="p-3 border-b border-border">
                  <div className="bg-background/70 animate-pulse rounded-none w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
          
          <div
            className="relative"
            style={{
              height: `${rowCount * 56}px`,
            }}
          >
            {Array.from({ length: rowCount }).map((_, index) => {
              // Calculate bucket based on position in the grid (darkest at top, lightest at bottom)
              // For first 20% of rows use bucket 5, next 20% use bucket 4, etc.
              const position = index / rowCount;
              let bucket = 5;
              
              if (position >= 0.8) bucket = 0;
              else if (position >= 0.6) bucket = 1;
              else if (position >= 0.4) bucket = 2;
              else if (position >= 0.2) bucket = 3;
              else if (position >= 0.1) bucket = 4;
              
              // Get background color class based on bucket
              const getBgClass = (bucket: number) => {
                switch (bucket) {
                  case 0:
                    return "bg-[hsl(var(--background-l1))] dark:bg-[hsl(var(--background-l1))]";
                  case 1:
                    return "bg-[hsl(var(--background-l2))] dark:bg-[hsl(var(--background-l2))]";
                  case 2:
                    return "bg-[hsl(var(--background-l3))] dark:bg-[hsl(var(--background-l3))]";
                  case 3:
                    return "bg-[hsl(var(--background-l4))] dark:bg-[hsl(var(--background-l4))]";
                  case 4:
                    return "bg-[hsl(var(--background-l5))] dark:bg-[hsl(var(--background-l5))]";
                  case 5:
                    return "bg-[hsl(var(--background-l6))] dark:bg-[hsl(var(--background-l6))]";
                  default:
                    return "bg-[hsl(var(--background-l1))] dark:bg-[hsl(var(--background-l1))]";
                }
              };
              
              return (
                <div
                  key={index}
                  className={`grid transition-colors duration-200 ${getBgClass(bucket)} animate-pulse`}
                  style={{
                    gridTemplateColumns: `repeat(${columnCount}, minmax(200px, 1fr))`,
                    position: "absolute",
                    top: `${index * 56}px`,
                    left: 0,
                    width: "100%",
                    height: "56px",
                  }}
                >
                  {Array.from({ length: columnCount }).map((_, colIndex) => (
                    <div key={colIndex} className="px-3 py-2 h-[56px]">
                      {/* Empty div to maintain cell structure */}
                      <div className="h-full w-full"></div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
