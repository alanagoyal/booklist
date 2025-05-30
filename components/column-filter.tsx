"use client";

import { useRef } from "react";
import { Filter, X } from "lucide-react";
import { FIELD_VALUES } from "@/utils/constants";

interface ColumnFilterProps {
  field: string;
  header: string;
  value: string;
  onChange: (field: string, value: string) => void;
  inputRef?: (el: HTMLInputElement | null) => void;
}

export function ColumnFilter({
  field,
  header,
  value,
  onChange,
  inputRef,
}: ColumnFilterProps) {
  const internalRef = useRef<HTMLInputElement>(null);
  const enumValues = FIELD_VALUES[field as keyof typeof FIELD_VALUES];

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
          placeholder={`Filter by ${header.toLowerCase()}`}
          className="flex-1 min-w-0 bg-background text-text text-base sm:text-sm focus:outline-none selection:bg-main selection:text-mtext"
        />
        {value ? (
          <button
            onClick={() => {
              onChange(field, "");
              internalRef.current?.focus();
            }}
            className="text-muted-foreground transition-colors duration-200 md:hover:text-text shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        ) : enumValues ? (
          <button 
            className="inline-flex items-center justify-center rounded-full text-muted-foreground md:hover:text-text transition-colors duration-200 cursor-help shrink-0"
            title={`${enumValues.join(", ")}`}
            onClick={(e) => e.stopPropagation()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
