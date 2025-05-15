"use client";

import { useRef } from "react";
import { X } from "lucide-react";

interface ColumnFilterProps {
  field: string;
  value: string;
  onChange: (field: string, value: string) => void;
  inputRef?: (el: HTMLInputElement | null) => void;
}

export function ColumnFilter({ field, value, onChange, inputRef }: ColumnFilterProps) {
  const internalRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center px-4 py-2 border-t border-border">
      <input
        ref={(el) => {
          // Update both refs
          internalRef.current = el;
          inputRef?.(el);
        }}
        type="text"
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        placeholder="Filter..."
        className="flex-1 bg-background text-text text-sm focus:outline-none selection:bg-main selection:text-mtext"
      />
      {value && (
        <button
          onClick={() => {
            onChange(field, "");
            internalRef.current?.focus();
          }}
          className="text-text/70 transition-colors duration-200 md:hover:text-text"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
