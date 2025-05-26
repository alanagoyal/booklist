"use client";

import { X } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function SearchInput({ value, onChange, onClear, onKeyDown, placeholder = "Search..." }: SearchInputProps) {
  return (
    <div className="flex items-center w-full bg-background border border-border">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 p-3 bg-background text-text text-base focus:outline-none"
        onKeyDown={onKeyDown}
      />
      {value && (
        <button
          onClick={onClear}
          className="px-3 text-text/70 transition-colors duration-200 md:hover:text-text"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
