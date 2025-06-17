"use client";

import { useState, useCallback, useEffect, Suspense, useMemo } from "react";
import { SearchInput } from "./search-input";
import { supabase } from "@/utils/supabase/client";
import { FIELD_VALUES } from "@/utils/constants";
import { useRouter, useSearchParams } from "next/navigation";
import type { Book, FormattedRecommender } from "@/types";
import useSWR from "swr";
import fetcher, { fetchRecommenders } from "../utils/fetcher";
import { CardStack } from "./card-stack";

interface SearchResult {
  id: string;
  name: string;
  subtitle?: string;
  isInGrid: boolean;
}

interface SearchDropdownProps {
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
  isOpen: boolean;
  loading?: boolean;
  selectedIndex: number;
}

interface RecommendedBook extends Book {
  score: number;
  genres?: string[] | string;
  amazon_url?: string;
  match_reasons: {
    similar_to_favorites: boolean;
    recommended_by_inspiration: boolean;
    recommended_by_similar_people: boolean;
    genre_match: boolean;
    recommended_by_similar_type: boolean;
  };
}

// Step configuration
interface StepConfig {
  title: string;
  maxSelections: number;
  minSelections: number;
  hasSearch: boolean;
  searchPlaceholder?: string;
  getItems?: () => any[];
  getSelectedIds: () => string[];
  isSelected: (id: string) => boolean;
  onSelect: (item: any) => void;
  getDisplayText: (item: any) => string;
  canProceed: () => boolean;
  nextAction?: () => void;
}

export function Recommendations() {
  return (
    <Suspense>
      <RecommendationsContent />
    </Suspense>
  );
}

interface SearchDropdownProps {
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
  isOpen: boolean;
  loading?: boolean;
  selectedIndex: number;
}

function SearchDropdown({
  results,
  onSelect,
  isOpen,
  loading,
  selectedIndex,
}: SearchDropdownProps) {
  if (!isOpen) return null;

  const sortedResults = [...results].sort((a, b) => {
    if (a.isInGrid === b.isInGrid) return 0;
    return a.isInGrid ? 1 : -1;
  });

  return (
    <div className="absolute z-10 w-full border-x border-b border-border bg-background max-h-60 overflow-auto text-base">
      {loading ? (
        <div className="p-3 text-muted-foreground">Searching...</div>
      ) : sortedResults.length === 0 ? (
        <div className="p-3 text-muted-foreground">No results found</div>
      ) : (
        sortedResults.map((result, index) => (
          <div
            key={result.id}
            onClick={() => onSelect(result)}
            className={`p-3 cursor-pointer transition-colors duration-200 ${
              index === selectedIndex
                ? "bg-[hsl(var(--background-l3))] md:hover:bg-[hsl(var(--background-l3-hover))]"
                : "bg-background md:hover:bg-accent/50"
            }`}
          >
            <div className="text-text whitespace-pre-line line-clamp-2">
              {result.name}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Reusable grid item component
interface GridItemProps {
  item: any;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
  getDisplayText: (item: any) => string;
}

function GridItem({
  item,
  isSelected,
  isDisabled,
  onClick,
  getDisplayText,
}: GridItemProps) {
  return (
    <div
      onClick={isDisabled ? undefined : onClick}
      className={`p-3 ${
        isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } border border-border transition-colors duration-200 whitespace-pre-line line-clamp-2 ${
        isSelected
          ? "bg-[hsl(var(--background-l3))] md:hover:bg-[hsl(var(--background-l3-hover))]"
          : "bg-background md:hover:bg-accent/50"
      }`}
    >
      {getDisplayText(item)}
    </div>
  );
}

// Reusable searchable grid component
interface SearchableGridProps {
  config: StepConfig;
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  selectedIndex: number;
  onSearch: (query: string) => void;
  onSearchClear: () => void;
  onSearchResultSelect: (result: SearchResult) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

function SearchableGrid({
  config,
  searchQuery,
  searchResults,
  isSearching,
  selectedIndex,
  onSearch,
  onSearchClear,
  onSearchResultSelect,
  onKeyDown,
}: SearchableGridProps) {
  const items = config.getItems?.() || [];
  const selectedIds = config.getSelectedIds();

  return (
    <div className="space-y-2">
      {config.hasSearch && (
        <div className="relative">
          <SearchInput
            key={`search-${config.title}`}
            value={searchQuery}
            onChange={onSearch}
            onClear={onSearchClear}
            placeholder={config.searchPlaceholder}
            disabled={selectedIds.length >= config.maxSelections}
            autoFocus={true}
            onKeyDown={onKeyDown}
          />
          <SearchDropdown
            results={searchResults}
            onSelect={onSearchResultSelect}
            isOpen={searchQuery.length > 0}
            loading={isSearching}
            selectedIndex={selectedIndex}
          />
        </div>
      )}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 gap-2 ${config.hasSearch ? "mt-4" : ""} text-base`}
      >
        {items.map((item) => (
          <GridItem
            key={item.id}
            item={item}
            isSelected={config.isSelected(item.id)}
            isDisabled={
              selectedIds.length >= config.maxSelections &&
              !config.isSelected(item.id)
            }
            onClick={() => config.onSelect(item)}
            getDisplayText={config.getDisplayText}
          />
        ))}
      </div>
    </div>
  );
}

function RecommendationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize with undefined to prevent flash of step 1
  const [step, setStep] = useState<number>();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<string[]>([]);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<FormattedRecommender[]>(
    []
  );
  const [selectedBooks, setSelectedBooks] = useState<Book[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedBook[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Initialize state from localStorage and update URL on mount
  useEffect(() => {
    if (typeof window === "undefined" || isInitialized) return;

    // Load saved state
    const savedUserType = localStorage.getItem("userType");
    const savedGenres = localStorage.getItem("selectedGenres");
    const savedPeopleIds = localStorage.getItem("selectedPeopleIds");
    const savedBookIds = localStorage.getItem("selectedBookIds");
    const savedPeople = localStorage.getItem("selectedPeople");
    const savedBooks = localStorage.getItem("selectedBooks");
    const savedRecommendations = localStorage.getItem("recommendations");
    const savedCardIndex = localStorage.getItem("currentCardIndex");

    if (savedUserType) setUserType(savedUserType);
    if (savedGenres) setSelectedGenres(JSON.parse(savedGenres));
    if (savedPeopleIds) setSelectedPeopleIds(JSON.parse(savedPeopleIds));
    if (savedBookIds) setSelectedBookIds(JSON.parse(savedBookIds));
    if (savedPeople) setSelectedPeople(JSON.parse(savedPeople));
    if (savedBooks) setSelectedBooks(JSON.parse(savedBooks));
    if (savedRecommendations)
      setRecommendations(JSON.parse(savedRecommendations));
    if (savedCardIndex) setCurrentCardIndex(parseInt(savedCardIndex));

    // Get step from URL or default to 1
    const stepParam = searchParams.get("step");
    const initialStep = stepParam ? parseInt(stepParam) : 1;
    setStep(initialStep);

    setIsInitialized(true);
  }, [searchParams, isInitialized]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized) return;
    if (userType) localStorage.setItem("userType", userType);
    else localStorage.removeItem("userType");
  }, [userType, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    if (selectedGenres.length > 0)
      localStorage.setItem("selectedGenres", JSON.stringify(selectedGenres));
    else localStorage.removeItem("selectedGenres");
  }, [selectedGenres, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    if (selectedPeopleIds.length > 0)
      localStorage.setItem(
        "selectedPeopleIds",
        JSON.stringify(selectedPeopleIds)
      );
    else localStorage.removeItem("selectedPeopleIds");
  }, [selectedPeopleIds, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    if (selectedBookIds.length > 0)
      localStorage.setItem("selectedBookIds", JSON.stringify(selectedBookIds));
    else localStorage.removeItem("selectedBookIds");
  }, [selectedBookIds, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    if (selectedPeople.length > 0)
      localStorage.setItem("selectedPeople", JSON.stringify(selectedPeople));
    else localStorage.removeItem("selectedPeople");
  }, [selectedPeople, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    if (selectedBooks.length > 0)
      localStorage.setItem("selectedBooks", JSON.stringify(selectedBooks));
    else localStorage.removeItem("selectedBooks");
  }, [selectedBooks, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    if (recommendations.length > 0)
      localStorage.setItem("recommendations", JSON.stringify(recommendations));
    else localStorage.removeItem("recommendations");
  }, [recommendations, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem("currentCardIndex", currentCardIndex.toString());
  }, [currentCardIndex, isInitialized]);

  // Update URL when step changes
  useEffect(() => {
    if (!isInitialized || step === undefined) return;
    const params = new URLSearchParams(window.location.search);
    params.set("step", step.toString());
    router.replace(`?${params.toString()}`);
  }, [step, router, isInitialized]);

  // Only fetch data when needed
  const { data: books } = useSWR<Book[]>(
    step !== undefined ? "/booklist/data/books-essential.json" : null,
    fetcher
  );
  const { data: recommenders } = useSWR<FormattedRecommender[]>(
    step !== undefined ? "/booklist/data/recommenders.json" : null,
    fetchRecommenders
  );

  const handleGenreToggle = useCallback((genre: string) => {
    setSelectedGenres((prev) => {
      const isSelected = prev.includes(genre);

      if (isSelected) {
        const next = prev.filter((g) => g !== genre);
        return next;
      } else if (prev.length < 3) {
        const next = [...prev, genre];
        return next;
      }
      return prev;
    });
  }, []);

  // Create grid items with proper deduplication
  const getGridPeople = useCallback(() => {
    if (!recommenders) return [];

    // Get first 18 suggested people
    const suggested = recommenders.slice(0, 18);
    const suggestedIds = new Set(suggested.map((p) => p.id));

    // Add any selected people that aren't in suggestions
    const additionalSelected = selectedPeople.filter(
      (p) => !suggestedIds.has(p.id)
    );

    return [...additionalSelected, ...suggested];
  }, [recommenders, selectedPeople]);

  const getGridBooks = useCallback(() => {
    if (!books) return [];

    // Get first 18 suggested books
    const suggested = books.slice(0, 18);
    const suggestedIds = new Set(suggested.map((b) => b.id));

    // Add any selected books that aren't in suggestions
    const additionalSelected = selectedBooks.filter(
      (b) => !suggestedIds.has(b.id)
    );

    return [...additionalSelected, ...suggested];
  }, [books, selectedBooks]);

  const memoizedGridIds = useMemo(() => {
    return {
      people: new Set(getGridPeople().map((p) => p.id)),
      books: new Set(getGridBooks().map((b) => b.id)),
    };
  }, [getGridPeople, getGridBooks]);

  // Optimize search data with indexing for faster lookups
  const memoizedSearchData = useMemo(() => {
    if (!recommenders || !books) return { people: [], books: [] };

    return {
      people: recommenders.map((person: FormattedRecommender) => ({
        id: person.id,
        searchText: `${person.full_name} ${person.type || ""}`.toLowerCase(),
        name: `${person.full_name}${person.type ? ` (${person.type})` : ""}`,
        tokens: `${person.full_name} ${person.type || ""}`
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean),
      })),
      books: books.map((book: Book) => ({
        id: book.id,
        searchText: `${book.title} ${book.author}`.toLowerCase(),
        name: `${book.title} by ${book.author}`,
        tokens: `${book.title} ${book.author}`
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean),
      })),
    };
  }, [recommenders, books]);

  // Optimized search with better performance
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setIsSearching(true);
      setSelectedIndex(-1);

      const trimmedQuery = query.trim();
      if (!trimmedQuery || trimmedQuery.length < 2) {
        // Require at least 2 characters to search
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      const queryTokens = trimmedQuery
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      const MAX_RESULTS = 50; // Limit results to improve performance

      if (step === 3) {
        // More efficient search algorithm using filter and token matching
        const results = memoizedSearchData.people
          .filter((person) => {
            // If query has multiple words, check if all words are present
            if (queryTokens.length > 1) {
              return queryTokens.every((token) =>
                person.tokens.some((t) => t.startsWith(token))
              );
            }
            // For single word queries, check if any token starts with it
            return (
              person.tokens.some((token) => token.startsWith(queryTokens[0])) ||
              person.searchText.includes(queryTokens[0])
            );
          })
          .slice(0, MAX_RESULTS) // Limit results
          .map((person) => ({
            id: person.id,
            name: person.name,
            isInGrid: memoizedGridIds.people.has(person.id),
          }));

        setSearchResults(results);
      } else if (step === 4) {
        // Similar optimized approach for books
        const results = memoizedSearchData.books
          .filter((book) => {
            // If query has multiple words, check if all words are present
            if (queryTokens.length > 1) {
              return queryTokens.every((token) =>
                book.tokens.some((t) => t.startsWith(token))
              );
            }
            // For single word queries, check if any token starts with it
            return (
              book.tokens.some((token) => token.startsWith(queryTokens[0])) ||
              book.searchText.includes(queryTokens[0])
            );
          })
          .slice(0, MAX_RESULTS) // Limit results
          .map((book) => ({
            id: book.id,
            name: book.name,
            isInGrid: memoizedGridIds.books.has(book.id),
          }));

        setSearchResults(results);
      }

      setIsSearching(false);
    },
    [step, memoizedSearchData, memoizedGridIds]
  );

  // Increase debounce time to reduce search frequency
  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const handleSearchResultSelect = (result: SearchResult) => {
    setSearchQuery(""); // Close dropdown

    if (step === 3 && recommenders) {
      // Don't proceed if we already have 3 people selected and this one isn't already selected
      if (
        selectedPeopleIds.length >= 3 &&
        !selectedPeopleIds.includes(result.id)
      ) {
        return;
      }

      // Select the person if not already selected
      const person = recommenders.find((p) => p.id === result.id);
      if (
        person &&
        !selectedPeopleIds.includes(result.id) &&
        selectedPeopleIds.length < 3
      ) {
        handlePersonSelect(person);
      }
    } else if (step === 4 && books) {
      // Don't proceed if we already have 3 books selected and this one isn't already selected
      if (selectedBookIds.length >= 3 && !selectedBookIds.includes(result.id)) {
        return;
      }

      // Select the book if not already selected
      const book = books.find((b) => b.id === result.id);
      if (
        book &&
        !selectedBookIds.includes(result.id) &&
        selectedBookIds.length < 3
      ) {
        handleBookSelect(book);
      }
    }
  };

  const handlePersonSelect = (person: FormattedRecommender): void => {
    setSelectedPeopleIds((prev) => {
      const isSelected = prev.includes(person.id);

      if (isSelected) {
        const next = prev.filter((id) => id !== person.id);
        return next;
      } else if (prev.length < 3) {
        const next = [...prev, person.id];
        return next;
      }
      return prev;
    });
    setSelectedPeople((prev) => {
      const isSelected = prev.some((p) => p.id === person.id);

      if (isSelected) {
        const next = prev.filter((p) => p.id !== person.id);
        return next;
      } else if (prev.length < 3) {
        const next = [...prev, person];
        return next;
      }
      return prev;
    });
  };

  const handleBookSelect = (book: Book): void => {
    setSelectedBookIds((prev) => {
      const isSelected = prev.includes(book.id);

      if (isSelected) {
        const next = prev.filter((id) => id !== book.id);
        return next;
      } else if (prev.length < 3) {
        const next = [...prev, book.id];
        return next;
      }
      return prev;
    });
    setSelectedBooks((prev) => {
      const isSelected = prev.some((b) => b.id === book.id);

      if (isSelected) {
        const next = prev.filter((b) => b.id !== book.id);
        return next;
      } else if (prev.length < 3) {
        const next = [...prev, book];
        return next;
      }
      return prev;
    });
  };

  const getRecommendations = async (): Promise<void> => {
    if (!userType) {
      console.error("User type is required");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc(
        "get_personalized_recommendations",
        {
          p_user_type: userType,
          p_genres: selectedGenres,
          p_inspiration_ids: selectedPeopleIds,
          p_favorite_book_ids: selectedBookIds,
          p_limit: 10,
        }
      );

      if (error) throw error;
      setRecommendations(data);
      setStep(5);
    } catch (error) {
      console.error("Error getting recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookClick = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("key", `${id}--${Date.now()}`);
      params.set("view", "books");
      router.push(`/?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Scroll to top function
  const scrollToTop = () => {
    // Find the scrollable container (the page content div with overflow-y-auto)
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.scrollTo(0, 0);
    } else {
      // Fallback to window scroll if container not found
      window.scrollTo(0, 0);
    }
  };

  // Navigation button configuration
  const getNavigationConfig = (currentStep: number) => {
    const config = stepConfigs[currentStep];
    const hasBack = currentStep > 1;
    const hasNext = currentStep < 5;

    return {
      hasBack,
      hasNext,
      canProceed: config?.canProceed() ?? false,
      nextLabel:
        currentStep === 4 ? (loading ? "Thinking..." : "Next") : "Next",
      onBack: () => {
        setStep(currentStep - 1);
        scrollToTop();
      },
      onNext: () => {
        if (config?.nextAction) {
          config.nextAction();
        } else {
          setStep(currentStep + 1);
        }
        scrollToTop();
      },
    };
  };

  const stepConfigs: Record<number, StepConfig> = {
    1: {
      title: "What is your profession?",
      maxSelections: 1,
      minSelections: 1,
      hasSearch: false,
      getItems: () => FIELD_VALUES.type.map((type) => ({ id: type, type })),
      getSelectedIds: () => (userType ? [userType] : []),
      isSelected: (id: string) => userType === id,
      onSelect: (item: any) => {
        const newType = userType === item.id ? null : item.id;
        setUserType(newType);
      },
      getDisplayText: (item: any) => item.id,
      canProceed: () => !!userType,
    },
    2: {
      title: "What genres interest you?",
      maxSelections: 3,
      minSelections: 1,
      hasSearch: false,
      getItems: () =>
        FIELD_VALUES.genres.map((genre) => ({ id: genre, genre })),
      getSelectedIds: () => selectedGenres,
      isSelected: (id: string) => selectedGenres.includes(id),
      onSelect: (item: any) => handleGenreToggle(item.id),
      getDisplayText: (item: any) => item.id,
      canProceed: () => selectedGenres.length > 0,
    },
    3: {
      title: "Whose reading tastes do you admire?",
      maxSelections: 3,
      minSelections: 1,
      hasSearch: true,
      searchPlaceholder: "Search for more people...",
      getItems: () => getGridPeople(),
      getSelectedIds: () => selectedPeopleIds,
      isSelected: (id: string) => selectedPeopleIds.includes(id),
      onSelect: handlePersonSelect,
      getDisplayText: (person: FormattedRecommender) =>
        `${person.full_name}${person.type ? ` (${person.type})` : ""}`,
      canProceed: () => selectedPeopleIds.length > 0,
    },
    4: {
      title: "What's on your bookshelf?",
      maxSelections: 3,
      minSelections: 1,
      hasSearch: true,
      searchPlaceholder: "Search for more books...",
      getItems: () => getGridBooks(),
      getSelectedIds: () => selectedBookIds,
      isSelected: (id: string) => selectedBookIds.includes(id),
      onSelect: handleBookSelect,
      getDisplayText: (book: Book) => book.title,
      canProceed: () => selectedBookIds.length > 0,
      nextAction: getRecommendations,
    },
  };

  // Render progress bar displaying completion percentage
  const renderProgressBar = () => {
    if (!isInitialized || step === undefined) {
      return null;
    }

    return (
      <div className="w-full h-2 bg-accent/30 border border-border md:mb-8">
        <div
          className={`h-full bg-[hsl(var(--background-l3))] hover:bg-[hsl(var(--background-l3-hover))] transition-all duration-200 ${currentProgress < 100 ? "border-r" : ""} border-border`}
          style={{ width: `${currentProgress}%` }}
        />
      </div>
    );
  };

  const renderStep = () => {
    // Don't render anything until we've initialized
    if (!isInitialized || step === undefined) {
      return null;
    }

    const config = stepConfigs[step];

    if (config) {
      // Steps 1-4: Quiz steps
      const selectedIds = config.getSelectedIds();

      return (
        <>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
            <h2 className="text-xl font-base flex items-center">
              {config.title}
              <span className="text-sm text-muted-foreground ml-2 px-2">
                ({selectedIds.length}/{config.maxSelections} selected)
              </span>
            </h2>
          </div>

          {config.hasSearch ? (
            <SearchableGrid
              config={config}
              searchQuery={searchQuery}
              searchResults={searchResults}
              isSearching={isSearching}
              selectedIndex={selectedIndex}
              onSearch={handleSearch}
              onSearchClear={() => {
                setSearchQuery("");
                setSearchResults([]);
                setIsSearching(false);
                setSelectedIndex(-1);
              }}
              onSearchResultSelect={handleSearchResultSelect}
              onKeyDown={handleSearchKeyDown}
            />
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-base">
                {config
                  .getItems?.()
                  .map((item) => (
                    <GridItem
                      key={item.id}
                      item={item}
                      isSelected={config.isSelected(item.id)}
                      isDisabled={
                        selectedIds.length >= config.maxSelections &&
                        !config.isSelected(item.id)
                      }
                      onClick={() => config.onSelect(item)}
                      getDisplayText={config.getDisplayText}
                    />
                  ))}
              </div>
            </div>
          )}
        </>
      );
    }

    // Step 5: Results
    if (step === 5) {
      return (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-base">
              We found the following for you
            </h2>
          </div>
          <CardStack
            recommendations={recommendations}
            userType={userType}
            onBookClick={handleBookClick}
          />
        </>
      );
    }

    return null;
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (
      searchResults.length === 0 ||
      (step === 3 && selectedPeopleIds.length >= 3) ||
      (step === 4 && selectedBookIds.length >= 3)
    )
      return;

    const sortedResults = [...searchResults].sort((a, b) => {
      if (a.isInGrid === b.isInGrid) return 0;
      return a.isInGrid ? 1 : -1;
    });

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < sortedResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (
      e.key === "Enter" &&
      selectedIndex >= 0 &&
      selectedIndex < sortedResults.length
    ) {
      e.preventDefault();
      handleSearchResultSelect(sortedResults[selectedIndex]);
    }
  };

  const renderNavigationButtons = () => {
    if (!isInitialized || step === undefined) {
      return null;
    }

    if (step === 5) {
      return (
        <div className="w-full mt-8 md:flex md:justify-end md:gap-4 md:h-[30px] md:items-center md:w-auto md:mt-0">
          <button
            onClick={() => {
              setStep(1);
              setUserType(null);
              setSelectedGenres([]);
              setSelectedPeopleIds([]);
              setSelectedBookIds([]);
              setRecommendations([]);
              setCurrentCardIndex(0);
              setSelectedPeople([]);
              setSelectedBooks([]);
              localStorage.removeItem("userType");
              localStorage.removeItem("selectedGenres");
              localStorage.removeItem("selectedPeopleIds");
              localStorage.removeItem("selectedBookIds");
              localStorage.removeItem("recommendations");
              localStorage.removeItem("currentCardIndex");
              localStorage.removeItem("selectedPeople");
              localStorage.removeItem("selectedBooks");
              scrollToTop();
            }}
            className="w-full justify-center px-6 py-3 bg-background text-text border border-border text-center transition-colors duration-200 cursor-pointer flex items-center gap-1 md:w-auto md:justify-start md:px-4 md:py-2 md:hover:bg-accent/50"
          >
            Start Over
          </button>
        </div>
      );
    }

    const navConfig = getNavigationConfig(step);

    return (
      <div
        className={`flex gap-4 h-[30px] items-center ${
          navConfig.hasBack ? "justify-between" : "justify-end"
        }`}
      >
        {navConfig.hasBack && (
          <button
            onClick={navConfig.onBack}
            className="bg-background text-text px-4 py-2 border border-border text-center transition-colors duration-200 md:hover:bg-accent/50"
          >
            Back
          </button>
        )}
        {navConfig.hasNext && (
          <button
            onClick={navConfig.onNext}
            disabled={!navConfig.canProceed}
            className={`text-center px-4 py-2 border border-border bg-background text-text transition-colors duration-200 ${
              !navConfig.canProceed
                ? "cursor-not-allowed opacity-60"
                : "md:hover:bg-accent/50 text-text"
            }`}
          >
            {navConfig.nextLabel}
          </button>
        )}
      </div>
    );
  };

  const totalSteps = 5;
  const currentProgress = step ? (step / totalSteps) * 100 : 0;

  // Clear search query when step changes
  useEffect(() => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    setSelectedIndex(-1);
  }, [step]);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center justify-between mt-8 mb-4">
        <h1 className="text-3xl leading-none font-bold">Recommendations</h1>
        {/* Show navigation buttons inline on medium and larger screens */}
        <div className="hidden md:block">{renderNavigationButtons()}</div>
      </div>
      {/* On small screens, progress bar below the heading */}
      <div className="md:hidden mb-4">{renderProgressBar()}</div>
      <div className="space-y-4">
        {/* On larger screens, progress bar is here */}
        <div className="hidden md:block">{renderProgressBar()}</div>
        {renderStep()}
      </div>
      {/* On small screens, navigation buttons below the content */}
      <div className="md:hidden mt-4">{renderNavigationButtons()}</div>
    </div>
  );
}
