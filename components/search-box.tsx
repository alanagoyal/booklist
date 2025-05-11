"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";
import debounce from "lodash/debounce";
import { generateEmbedding } from "@/utils/embeddings";
import { useRouter, useSearchParams } from "next/navigation";

type SearchBoxProps = {
  initialValue?: string;
  onSearchResults: (results: Set<string>) => void;
  setIsSearching: (isSearching: boolean) => void;
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
  initialValue = "",
  onSearchResults,
  setIsSearching,
  viewMode,
  isMobileView,
}: SearchBoxProps) {
  // Hooks
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [value, setValue] = useState(initialValue);
  const [isPending, setIsPending] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);

  // Cache helpers
  const getFromCache = (query: string): Set<string> | undefined => {
    try {
      const cached = localStorage.getItem(`search_${query}`);
      return cached ? new Set(JSON.parse(cached)) : undefined;
    } catch (e) {
      return undefined;
    }
  };

  const setInCache = (query: string, results: Set<string>) => {
    try {
      localStorage.setItem(`search_${query}`, JSON.stringify([...results]));
    } catch (e) {
      // Ignore storage errors
    }
  };

  // Combined debounced search and URL update
  const debouncedSearchAndUpdate = useMemo(
    () =>
      debounce(async (searchValue: string) => {
        // Update URL
        const current = new URLSearchParams(window.location.search);
        if (searchValue.trim()) {
          current.set(`${viewMode}_search`, searchValue);
        } else {
          current.delete(`${viewMode}_search`);
        }
        window.history.replaceState({}, "", `?${current.toString()}`);

        // Check cache first
        const cachedResults = getFromCache(searchValue);
        if (searchValue.trim() && cachedResults) {
          onSearchResults(cachedResults);
          setIsPending(false);
          return;
        }

        // Perform search if there's a value
        if (searchValue.trim()) {
          setIsSearching(true);
          try {
            const embedding = await generateEmbedding(searchValue);
            const response = await fetch("/api/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                query: searchValue,
                embedding,
                viewMode
              }),
            });
            if (!response.ok) throw new Error("Search failed");
            const results: Array<{ id: string }> = await response.json();
            const resultSet = new Set(results.map(item => item.id));
            onSearchResults(resultSet);
            setInCache(searchValue, resultSet);
          } catch (e) {
            console.error("Search error:", e);
            onSearchResults(new Set());
          } finally {
            setIsSearching(false);
            setIsPending(false);
          }
        } else {
          onSearchResults(new Set());
          setIsSearching(false);
          setIsPending(false);
        }
      }, 500),
    [viewMode, onSearchResults, setIsSearching, setIsPending]
  );

  // Handle initial value
  useEffect(() => {
    if (initialValue.trim()) {
      const cachedResults = getFromCache(initialValue);
      if (cachedResults) {
        onSearchResults(cachedResults);
      } else {
        // If no cache, trigger a search
        debouncedSearchAndUpdate(initialValue);
      }
    }
  }, [initialValue, debouncedSearchAndUpdate, onSearchResults]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSearchAndUpdate.cancel();
    };
  }, [debouncedSearchAndUpdate]);

  const handleClear = () => {
    setValue("");
    onSearchResults(new Set());
    inputRef.current?.focus();

    // Update URL
    const current = new URLSearchParams(searchParams.toString());
    current.delete(`${viewMode}_search`);
    router.replace(`?${current.toString()}`, { scroll: false });
  };

  // Animation timing constants (in milliseconds)
  const TYPING_SPEED = 50; // Time between typing each character
  const ERASING_SPEED = 50; // Time between erasing each character
  const PAUSE_DURATION = 500; // How long to pause when text is fully typed

  // Animation state
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [currentText, setCurrentText] = useState("");

  useEffect(() => {
    const placeholders =
      viewMode === "books"
        ? isMobileView
          ? booksPlaceholdersMobile
          : booksPlaceholders
        : isMobileView
          ? peoplePlaceholdersMobile
          : peoplePlaceholders;

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
        setCurrentText(
          placeholders[(placeholderIndex + 1) % placeholders.length][0]
        );
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
          onChange={(e) => {
            const newValue = e.target.value;
            setValue(newValue);
            if (newValue.trim()) {
              setIsPending(true);
            } else {
              setIsPending(false);
            }
            debouncedSearchAndUpdate(newValue);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              debouncedSearchAndUpdate(value);
            }
          }}
          disabled={false}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          autoFocus
        />
        <div className="flex items-center h-10 px-3 border-b border-border">
          {isPending ? (
            <div className="w-3 h-3 border-2 border-text/70 rounded-full animate-spin border-t-transparent" />
          ) : value ? (
            <button
              onClick={handleClear}
              className="text-text/70 transition-colors duration-200 md:hover:text-text"
              disabled={false}
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
