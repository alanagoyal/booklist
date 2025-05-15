"use client";

import { useRef } from "react";
import { Filter, X } from "lucide-react";

interface ColumnFilterProps {
  field: string;
  value: string;
  onChange: (field: string, value: string) => void;
  inputRef?: (el: HTMLInputElement | null) => void;
}

export function ColumnFilter({
  field,
  value,
  onChange,
  inputRef,
}: ColumnFilterProps) {
  const internalRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center p-2">
      <div className="flex items-center gap-2 w-full">
        <Filter className="w-3 h-3 shrink-0" />
        <input
          ref={(el) => {
            // Update both refs
            internalRef.current = el;
            inputRef?.(el);
          }}
          type="text"
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          placeholder={`Filter by ${field}`}
          className="flex-1 min-w-0 bg-background text-text text-sm focus:outline-none selection:bg-main selection:text-mtext"
        />
        {value && (
          <button
            onClick={() => {
              onChange(field, "");
              internalRef.current?.focus();
            }}
            className="text-text/70 transition-colors duration-200 md:hover:text-text shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
