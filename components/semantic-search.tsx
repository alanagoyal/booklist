"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const embeddingCacheRef = useRef<Map<string, { embedding: number[], timestamp: number }>>(new Map());

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

  // Embedding cache helpers (30 minute TTL)
  const EMBEDDING_CACHE_TTL = useMemo(() => 30 * 60 * 1000, []); // 30 minutes
  
  const getCachedEmbedding = useCallback((query: string): number[] | null => {
    const cached = embeddingCacheRef.current.get(query);
    if (cached && Date.now() - cached.timestamp < EMBEDDING_CACHE_TTL) {
      return cached.embedding;
    }
    if (cached) {
      embeddingCacheRef.current.delete(query); // Remove expired cache
    }
    return null;
  }, [EMBEDDING_CACHE_TTL]);

  const setCachedEmbedding = useCallback((query: string, embedding: number[]) => {
    embeddingCacheRef.current.set(query, {
      embedding,
      timestamp: Date.now()
    });
    // Keep cache size reasonable (max 100 entries)
    if (embeddingCacheRef.current.size > 100) {
      const firstKey = embeddingCacheRef.current.keys().next().value;
      if (firstKey) {
        embeddingCacheRef.current.delete(firstKey);
      }
    }
  }, []);

  // Instant text search (no debounce for immediate feedback)
  const instantTextSearch = useCallback(async (searchValue: string) => {
    if (!searchValue.trim()) {
      onSearchResults(new Set());
      setIsSearching(false);
      setIsPending(false);
      return;
    }

    // Check cache first
    const cachedResults = getFromCache(searchValue);
    if (cachedResults) {
      onSearchResults(cachedResults);
      setIsPending(false);
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setIsSearching(true);
    try {
      // Text-only search for instant results (no embedding needed)
      const response = await fetch("/booklist/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: searchValue,
          embedding: null, // No embedding for instant text search
          viewMode
        }),
        signal
      });

      if (signal.aborted) return;
      
      if (!response.ok) throw new Error("Search failed");
      const results: Array<{ id: string }> = await response.json();
      const resultSet = new Set(results.map(item => item.id));
      onSearchResults(resultSet);
      
      // Don't cache text-only results, let semantic search override
      setIsPending(false);
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      console.error("Text search error:", e);
      onSearchResults(new Set());
      setIsPending(false);
    }
  }, [viewMode, onSearchResults, setIsSearching]);

  // Enhanced semantic search (debounced for performance)
  const debouncedSemanticSearch = useMemo(
    () =>
      debounce(async (searchValue: string) => {
        if (!searchValue.trim()) return;

        // Check cache first
        const cachedResults = getFromCache(searchValue);
        if (cachedResults) {
          onSearchResults(cachedResults);
          setIsSearching(false);
          setIsPending(false);
          return;
        }

        // Cancel any ongoing request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        
        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;

        try {
          // Check for cached embedding first
          let embedding = getCachedEmbedding(searchValue);
          
          if (!embedding) {
            // Generate new embedding if not cached
            embedding = await generateEmbedding(searchValue, signal);
            setCachedEmbedding(searchValue, embedding);
          }

          // Check if request was cancelled
          if (signal.aborted) return;

          const response = await fetch("/booklist/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              query: searchValue,
              embedding,
              viewMode
            }),
            signal
          });

          // Check if request was cancelled after fetch
          if (signal.aborted) return;

          if (!response.ok) throw new Error("Search failed");
          const results: Array<{ id: string }> = await response.json();
          const resultSet = new Set(results.map(item => item.id));
          onSearchResults(resultSet);
          setInCache(searchValue, resultSet);
        } catch (e) {
          // Don't log errors for aborted requests
          if (e instanceof Error && e.name === 'AbortError') return;
          console.error("Semantic search error:", e);
          // Don't clear results here - keep text search results visible
        } finally {
          // Only update state if request wasn't aborted
          if (!signal.aborted) {
            setIsSearching(false);
            setIsPending(false);
          }
        }
      }, 150), // Fast debounce for semantic enhancement
    [viewMode, onSearchResults, setIsSearching, getCachedEmbedding, setCachedEmbedding]
  );

  // Combined search function with progressive enhancement
  const handleSearch = useCallback((searchValue: string) => {
    // Update URL immediately
    const current = new URLSearchParams(window.location.search);
    if (searchValue.trim()) {
      current.set(`${viewMode}_search`, searchValue);
    } else {
      current.delete(`${viewMode}_search`);
    }
    window.history.replaceState({}, "", `?${current.toString()}`);

    // Instant text search for immediate feedback
    instantTextSearch(searchValue);
    
    // Enhanced semantic search after short delay
    debouncedSemanticSearch(searchValue);
  }, [viewMode, instantTextSearch, debouncedSemanticSearch]);

  // Handle initial value
  useEffect(() => {
    if (initialValue.trim()) {
      const cachedResults = getFromCache(initialValue);
      if (cachedResults) {
        onSearchResults(cachedResults);
      } else {
        // If no cache, trigger a search
        handleSearch(initialValue);
      }
    }
  }, [initialValue, handleSearch, onSearchResults]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSemanticSearch.cancel();
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedSemanticSearch]);

  const handleClear = () => {
    // Set isSearching temporarily to prevent "no results" flash
    setIsSearching(true);
    
    setValue("");
    onSearchResults(new Set());
    inputRef.current?.focus();

    // Update URL
    const current = new URLSearchParams(searchParams.toString());
    current.delete(`${viewMode}_search`);
    router.replace(`?${current.toString()}`, { scroll: false });
    
    // Reset isSearching after URL update has time to process
    setTimeout(() => {
      setIsSearching(false);
    }, 100);
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
        <Search className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 flex items-center">
        <input
          ref={inputRef}
          type="text"
          placeholder={currentText}
          className="flex-1 h-10 focus:outline-none bg-background border-b border-border text-text selection:bg-main selection:text-mtext focus:outline-none rounded-none"
          value={value}
          onChange={(e) => {
            const newValue = e.target.value;
            setValue(newValue);
            if (newValue.trim()) {
              setIsPending(true);
            } else {
              setIsPending(false);
            }
            handleSearch(newValue);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSearch(value);
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
              className="text-muted-foreground transition-colors duration-200 md:hover:text-text"
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
