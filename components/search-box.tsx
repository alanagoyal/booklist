"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import debounce from "lodash/debounce";

type SearchBoxProps = {
  value: string;
  onSearch: (query: string) => void;
  isSearching: boolean;
  viewMode: "books" | "people";
  isMobileView: boolean;
};

// Placeholders
const booksPlaceholders = [
  "A book that will help me develop better taste",
  "A dystopian science fiction novel with a little comedy",
  "A historical fiction novel that takes place during the Industrial Revolution",
  'A crime novel with "The White Lotus"-level character development',
  "A biography or memoir of an underrated world leader",
];

const peoplePlaceholders = [
  "An artist or designer with great taste",
  "A journalist or influencer with controversial views",
  "A scientist or researcher who flies under the radar",
  "A chef or food critic who's seen it all",
  "An entrepreneur or executive who writes code",
];

// Shorter placeholders for mobile
const booksPlaceholdersMobile = [
  "A book on developing taste",
  "A dystopian sci-fi novel",
  "A fascinating historical fiction",
  'A mystery like "The White Lotus"',
  "A biography of a world leader",
];

  const peoplePlaceholdersMobile = [
  "An artist or designer with taste",
  "A controversial journalist",
  "An underrated scientist",
  "A renowned chef or food critic",
  "A technical entrepreneur",
];

export function SearchBox({
  value,
  onSearch,
  isSearching,
  viewMode,
  isMobileView,
}: SearchBoxProps) {

  // Input ref for auto-focus
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onSearch("");
    inputRef.current?.focus();
  };

  // Animation timing constants (in milliseconds)
  const TYPING_SPEED = 50;    // Time between typing each character
  const ERASING_SPEED = 50;    // Time between erasing each character
  const PAUSE_DURATION = 500; // How long to pause when text is fully typed

  // Animation state
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [currentText, setCurrentText] = useState("");

  useEffect(() => {
    const placeholders = viewMode === "books" 
      ? (isMobileView ? booksPlaceholdersMobile : booksPlaceholders)
      : (isMobileView ? peoplePlaceholdersMobile : peoplePlaceholders);
    
    const currentPlaceholder = placeholders[placeholderIndex];
    
    if (isTyping) {
      if (currentText.length < currentPlaceholder.length) {
        const timeoutId = setTimeout(() => {
          setCurrentText(currentPlaceholder.slice(0, currentText.length + 1));
        }, TYPING_SPEED);
        return () => clearTimeout(timeoutId);
      } else {
        const timeoutId = setTimeout(() => setIsTyping(false), PAUSE_DURATION);
        return () => clearTimeout(timeoutId);
      }
    } else {
      if (currentText.length > 0) {
        const timeoutId = setTimeout(() => {
          setCurrentText(currentText.slice(0, -1));
        }, ERASING_SPEED);
        return () => clearTimeout(timeoutId);
      } else {
        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        setIsTyping(true);
        setCurrentText(placeholders[(placeholderIndex + 1) % placeholders.length][0]);
        return undefined;
      }
    }
  }, [currentText, isTyping, placeholderIndex, viewMode, isMobileView]);

  return (
    <div className="flex items-center h-10 w-full">
      <div className="flex items-center h-10 px-3 pb-1 border-b border-border">
        <Search className="w-4 h-4 text-text/70" />
      </div>
      <div className="flex-1 flex items-center">
        <input
          ref={inputRef}
          type="text"
          placeholder={currentText}
          className="flex-1 h-10 focus:outline-none bg-background border-b border-border text-text text-base sm:text-sm selection:bg-main selection:text-mtext focus:outline-none rounded-none"
          value={value}
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSearch(value);
            }
          }}
          disabled={false}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          autoFocus
        />
        <div className="flex items-center h-10 px-3 border-b border-border">
          {value ? (
            <button
              onClick={handleClear}
              className="text-text/70 transition-colors duration-200 md:hover:text-text"
              disabled={isSearching}
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
