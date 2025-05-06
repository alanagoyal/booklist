"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import debounce from "lodash/debounce";

type SearchBoxProps = {
  value: string;
  onSearch: (query: string) => void;
  searching: boolean;
  viewMode: "books" | "recommenders";
  placeholderTexts: string[];
};

export function SearchBox({
  value,
  onSearch,
  searching,
  viewMode,
  placeholderTexts,
}: SearchBoxProps) {
  const [localInput, setLocalInput] = useState(value);
  const [typedPlaceholder, setTypedPlaceholder] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  // Animation timing constants
  const TYPING_SPEED = 30;
  const ERASING_SPEED = 15;
  const PAUSE_AFTER_TYPING = 1000;
  const PAUSE_BEFORE_NEXT = 250;

  // Create a debounced search function
  const debouncedSearch = useRef(
    debounce((query: string) => {
      if (query.length === 0 || query.length >= 3) {
        onSearch(query);
      }
    }, 500)
  ).current;

  // Handle input changes
  const handleInputChange = (value: string) => {
    setLocalInput(value);
    debouncedSearch(value);
  };

  // Handle immediate search (e.g., on Enter)
  const handleImmediateSearch = () => {
    debouncedSearch.cancel();
    onSearch(localInput);
  };

  // Handle clear
  const handleClear = () => {
    setLocalInput("");
    debouncedSearch.cancel();
    onSearch("");
  };

  // Placeholder animation logic
  useEffect(() => {
    // Only animate when there's no input
    if (localInput) return;

    const currentPlaceholder = placeholderTexts[placeholderIndex];
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      if (typedPlaceholder.length < currentPlaceholder.length) {
        timeout = setTimeout(() => {
          setTypedPlaceholder(
            currentPlaceholder.slice(0, typedPlaceholder.length + 1)
          );
        }, TYPING_SPEED);
      } else {
        timeout = setTimeout(() => {
          setIsTyping(false);
        }, PAUSE_AFTER_TYPING);
      }
    } else {
      if (typedPlaceholder.length > 0) {
        timeout = setTimeout(() => {
          setTypedPlaceholder(typedPlaceholder.slice(0, -1));
        }, ERASING_SPEED);
      } else {
        timeout = setTimeout(() => {
          setPlaceholderIndex((prev) => (prev + 1) % placeholderTexts.length);
          setIsTyping(true);
        }, PAUSE_BEFORE_NEXT);
      }
    }

    return () => clearTimeout(timeout);
  }, [
    typedPlaceholder,
    isTyping,
    placeholderIndex,
    placeholderTexts,
    localInput,
  ]);

  return (
    <div className="flex items-center h-10 w-full">
      <div className="flex items-center h-10 px-3 border-b border-border">
        <Search className="w-4 h-4 text-text/70" />
      </div>
      <div className="flex-1 flex items-center">
        <input
          type="text"
          placeholder={typedPlaceholder}
          className="flex-1 h-10 focus:outline-none bg-background border-b border-border text-text text-base sm:text-sm placeholder:text-sm selection:bg-main selection:text-mtext focus:outline-none rounded-none"
          value={localInput}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleImmediateSearch();
            }
          }}
          disabled={false}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          autoFocus
        />
        <div className="flex items-center h-10 px-3 border-b border-border">
          {searching ? (
            <div className="w-3 h-3 border-2 border-text/70 rounded-full animate-spin border-t-transparent" />
          ) : localInput ? (
            <button
              onClick={handleClear}
              className="text-text/70 transition-colors duration-200 md:hover:text-text"
              disabled={searching}
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
