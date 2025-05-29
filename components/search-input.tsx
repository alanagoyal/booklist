"use client";

import { X } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export function SearchInput({ value, onChange, onClear, onKeyDown, placeholder = "Search...", disabled = false }: SearchInputProps) {
  return (
    <div className="flex items-center w-full bg-background border border-border">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`flex-1 p-3 bg-background text-text text-base focus:outline-none ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        onKeyDown={onKeyDown}
        disabled={disabled}
      />
      {value && (
        <button
          onClick={onClear}
          className="px-3 text-muted-foreground transition-colors duration-200 md:hover:text-text"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
