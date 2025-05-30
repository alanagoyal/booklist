"use client";

import { useState, useCallback, useEffect, Suspense, useMemo } from "react";
import { SearchInput } from "./search-input";
import { supabase } from "@/utils/supabase/client";
import { FIELD_VALUES } from "@/utils/constants";
import { useRouter, useSearchParams } from "next/navigation";
import type { Book, FormattedRecommender } from "@/types";
import useSWR from "swr";
import fetcher, { fetchRecommenders } from "../utils/fetcher";
import { ArrowLeftRight } from "lucide-react";
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

  // We need to export the sorted results so the parent component can use them
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
                ? "bg-accent/70 md:hover:bg-accent"
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
  const [extraGridItems, setExtraGridItems] = useState<string[]>([]);
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
    const savedExtraGridItems = localStorage.getItem("extraGridItems");
    const savedRecommendations = localStorage.getItem("recommendations");
    const savedCardIndex = localStorage.getItem("currentCardIndex");

    // Initialize state from localStorage
    if (savedUserType) setUserType(savedUserType);
    if (savedGenres) setSelectedGenres(JSON.parse(savedGenres));
    if (savedPeopleIds) setSelectedPeopleIds(JSON.parse(savedPeopleIds));
    if (savedBookIds) setSelectedBookIds(JSON.parse(savedBookIds));
    if (savedExtraGridItems) setExtraGridItems(JSON.parse(savedExtraGridItems));
    if (savedCardIndex) setCurrentCardIndex(parseInt(savedCardIndex));

    // Check for recommendations last
    if (savedRecommendations) {
      setRecommendations(JSON.parse(savedRecommendations));
      setStep(5);
    } else {
      // If no recommendations, check URL for step
      const urlStep = searchParams.get("step");
      setStep(urlStep ? parseInt(urlStep) : 1);
    }

    setIsInitialized(true);
  }, [searchParams, isInitialized]);

  // Update URL when step changes
  useEffect(() => {
    if (!isInitialized || step === undefined) return;
    const params = new URLSearchParams(window.location.search);
    params.set("step", step.toString());
    router.replace(`?${params.toString()}`);
  }, [step, router, isInitialized]);

  // Save form state to localStorage
  useEffect(() => {
    if (!isInitialized) return;

    if (userType) {
      localStorage.setItem("userType", userType);
    } else {
      localStorage.removeItem("userType");
    }

    if (selectedGenres.length) {
      localStorage.setItem("selectedGenres", JSON.stringify(selectedGenres));
    } else {
      localStorage.removeItem("selectedGenres");
    }

    if (selectedPeopleIds.length) {
      localStorage.setItem(
        "selectedPeopleIds",
        JSON.stringify(selectedPeopleIds)
      );
    } else {
      localStorage.removeItem("selectedPeopleIds");
    }

    if (selectedBookIds.length) {
      localStorage.setItem("selectedBookIds", JSON.stringify(selectedBookIds));
    } else {
      localStorage.removeItem("selectedBookIds");
    }

    if (extraGridItems.length) {
      localStorage.setItem("extraGridItems", JSON.stringify(extraGridItems));
    } else {
      localStorage.removeItem("extraGridItems");
    }

    if (recommendations.length) {
      localStorage.setItem("recommendations", JSON.stringify(recommendations));
      localStorage.setItem("currentCardIndex", currentCardIndex.toString());
    } else {
      localStorage.removeItem("recommendations");
      localStorage.removeItem("currentCardIndex");
    }
  }, [
    userType,
    selectedGenres,
    selectedPeopleIds,
    selectedBookIds,
    extraGridItems,
    recommendations,
    currentCardIndex,
    isInitialized,
  ]);

  // Only fetch data when needed
  const { data: books } = useSWR<Book[]>(
    step !== undefined ? "/data/books-essential.json" : null,
    fetcher
  );
  const { data: recommenders } = useSWR<FormattedRecommender[]>(
    step !== undefined ? "/data/recommenders.json" : null,
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

  const gridItems = useCallback(
    (items: any[]) => {
      const baseItems = items.slice(0, 18);
      const extraItems = items.filter((item) =>
        extraGridItems.includes(item.id)
      );
      return [...extraItems, ...baseItems];
    },
    [extraGridItems]
  );

  const memoizedGridIds = useMemo(() => {
    if (!recommenders || !books) return { people: new Set(), books: new Set() };
    return {
      people: new Set(gridItems(recommenders).map((p) => p.id)),
      books: new Set(gridItems(books).map((b) => b.id)),
    };
  }, [recommenders, books, gridItems]);

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

  // Memoize search results to prevent unnecessary re-renders
  const memoizedSearchResults = useMemo(() => searchResults, [searchResults]);

  const handleSearchResultSelect = (result: SearchResult) => {
    setSearchQuery(""); // Close dropdown

    if (step === 3 && recommenders) {
      // Don't proceed if we already have 3 people selected and this one isn't already selected
      if (selectedPeopleIds.length >= 3 && !selectedPeopleIds.includes(result.id)) {
        return;
      }
      
      const gridPeople = gridItems(recommenders);
      const suggestedPeople = gridPeople
        .slice(0, 18)
        .some((p) => p.id === result.id);

      if (!suggestedPeople && !extraGridItems.includes(result.id)) {
        setExtraGridItems((prev) => [...prev, result.id]);
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
      
      const gridBooks = gridItems(books);
      const suggestedBooks = gridBooks
        .slice(0, 18)
        .some((b) => b.id === result.id);

      if (!suggestedBooks && !extraGridItems.includes(result.id)) {
        setExtraGridItems((prev) => [...prev, result.id]);
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
        return prev.filter((id) => id !== person.id);
      } else if (prev.length < 3) {
        return [...prev, person.id];
      }
      return prev;
    });
  };

  const handleBookSelect = (book: Book): void => {
    setSelectedBookIds((prev) => {
      const isSelected = prev.includes(book.id);
      if (isSelected) {
        return prev.filter((id) => id !== book.id);
      } else if (prev.length < 3) {
        return [...prev, book.id];
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

  const renderStep = () => {
    // Don't render anything until we've initialized
    if (!isInitialized || step === undefined) {
      return null;
    }

    switch (step) {
      case 1:
        return (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
              <h2 className="text-xl font-base">What is your profession?</h2>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-base">
                {FIELD_VALUES.type.map((type) => (
                  <div
                    key={type}
                    onClick={() => (userType === null || userType === type) ? setUserType(userType === type ? null : type) : null}
                    className={`p-3 ${(userType !== null && userType !== type) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} border border-border transition-colors duration-200 whitespace-pre-line line-clamp-2 ${
                      type === userType
                        ? "bg-accent/70 md:hover:bg-accent"
                        : "bg-background md:hover:bg-accent/50"
                    }`}
                  >
                    {type}
                  </div>
                ))}
              </div>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
              <h2 className="text-xl font-base">What genres interest you?</h2>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-base">
                {FIELD_VALUES.genres.map((genre) => (
                  <div
                    key={genre}
                    onClick={() => selectedGenres.length < 3 || selectedGenres.includes(genre) ? handleGenreToggle(genre) : null}
                    className={`p-3 ${selectedGenres.length >= 3 && !selectedGenres.includes(genre) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} border border-border transition-colors duration-200 whitespace-pre-line line-clamp-2 ${
                      selectedGenres.includes(genre)
                        ? "bg-accent/70 md:hover:bg-accent"
                        : "bg-background md:hover:bg-accent/50"
                    }`}
                  >
                    {genre}
                  </div>
                ))}
              </div>
            </div>
          </>
        );

      case 3:
        if (!recommenders) return null;

        return (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
              <h2 className="text-xl font-base">
                Whose reading tastes do you admire?
              </h2>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <SearchInput
                  key={step}
                  value={searchQuery}
                  onChange={handleSearch}
                  onClear={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setIsSearching(false);
                    setSelectedIndex(-1);
                  }}
                  placeholder="Search for more people..."
                  disabled={selectedPeopleIds.length >= 3}
                  autoFocus={true}
                  onKeyDown={(e) => {
                    if (searchResults.length === 0 || selectedPeopleIds.length >= 3) return;

                    // Create sorted results array to match what's displayed in the dropdown
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
                  }}
                />
                <SearchDropdown
                  results={searchResults}
                  onSelect={handleSearchResultSelect}
                  isOpen={searchQuery.length > 0}
                  loading={isSearching}
                  selectedIndex={selectedIndex}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 text-base">
                {recommenders &&
                  gridItems(recommenders).map((person) => (
                    <div
                      key={person.id}
                      onClick={() => selectedPeopleIds.length < 3 || selectedPeopleIds.includes(person.id) ? handlePersonSelect(person) : null}
                      className={`p-3 ${selectedPeopleIds.length >= 3 && !selectedPeopleIds.includes(person.id) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} border border-border transition-colors duration-200 whitespace-pre-line line-clamp-2 ${
                        selectedPeopleIds.includes(person.id)
                          ? "bg-accent/70 md:hover:bg-accent"
                          : "bg-background md:hover:bg-accent/50"
                      }`}
                    >
                      {person.full_name}
                      {person.type ? ` (${person.type})` : ""}
                    </div>
                  ))}
              </div>
            </div>
          </>
        );

      case 4:
        if (!books) return null;

        return (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
              <h2 className="text-xl font-base">
                What&apos;s on your bookshelf?
              </h2>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <SearchInput
                  key={step}
                  value={searchQuery}
                  onChange={handleSearch}
                  onClear={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setIsSearching(false);
                    setSelectedIndex(-1);
                  }}
                  placeholder="Search for more books..."
                  disabled={selectedBookIds.length >= 3}
                  autoFocus={true}
                  onKeyDown={(e) => {
                    if (searchResults.length === 0 || selectedBookIds.length >= 3) return;

                    // Create sorted results array to match what's displayed in the dropdown
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
                  }}
                />
                <SearchDropdown
                  results={searchResults}
                  onSelect={handleSearchResultSelect}
                  isOpen={searchQuery.length > 0}
                  loading={isSearching}
                  selectedIndex={selectedIndex}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 text-base">
                {books &&
                  gridItems(books).map((book) => (
                    <div
                      key={book.id}
                      onClick={() => selectedBookIds.length < 3 || selectedBookIds.includes(book.id) ? handleBookSelect(book) : null}
                      className={`p-3 ${selectedBookIds.length >= 3 && !selectedBookIds.includes(book.id) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} border border-border transition-colors duration-200 whitespace-pre-line line-clamp-2 ${
                        selectedBookIds.includes(book.id)
                          ? "bg-accent/70 md:hover:bg-accent"
                          : "bg-background md:hover:bg-accent/50"
                      }`}
                    >
                      {book.title}
                    </div>
                  ))}
              </div>
            </div>
          </>
        );

      case 5:
        return (
          <>
            <div className="flex items-center justify-between">
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

      default:
        return null;
    }
  };

  const renderNavigationButtons = () => {
    if (!isInitialized || step === undefined) {
      return null;
    }

    switch (step) {
      case 1:
        return (
          <div className="flex justify-end gap-4 h-10">
            <button
              onClick={() => setStep(2)}
              disabled={!userType}
              className={`w-[135px] text-right h-10 ${
                !userType
                  ? "cursor-not-allowed text-muted-foreground"
                  : "md:hover:underline text-text"
              }`}
            >
              {userType ? "Next (1/1 selected)" : "Next (0/1 selected)"}
            </button>
          </div>
        );

      case 2:
        return (
          <div className="flex justify-between gap-4 h-10">
            <button
              onClick={() => setStep(step - 1)}
              className="bg-background text-text md:hover:underline transition-colors duration-200 h-10"
            >
              Back
            </button>
            <button
              onClick={() => {
                setStep(3);
              }}
              disabled={selectedGenres.length === 0}
              className={`w-[135px] text-right h-10 ${
                selectedGenres.length === 0
                  ? "cursor-not-allowed text-muted-foreground"
                  : "md:hover:underline text-text"
              }`}
            >
              {selectedGenres.length === 0
                ? "Next (0/3 selected)"
                : `Next (${selectedGenres.length}/3 selected)`}
            </button>
          </div>
        );

      case 3:
        return (
          <div className="flex justify-between gap-4 h-10">
            <button
              onClick={() => setStep(step - 1)}
              className="text-text md:hover:underline transition-colors duration-200 h-10"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!selectedPeopleIds.length}
              className={`w-[135px] text-right h-10 ${
                !selectedPeopleIds.length
                  ? "cursor-not-allowed text-muted-foreground"
                  : "md:hover:underline text-text"
              }`}
            >
              {selectedPeopleIds.length === 0
                ? "Next (0/3 selected)"
                : `Next (${selectedPeopleIds.length}/3 selected)`}
            </button>
          </div>
        );

      case 4:
        return (
          <div className="flex justify-between gap-4 h-10">
            <button
              onClick={() => setStep(step - 1)}
              className="text-text md:hover:underline transition-colors duration-200 h-10"
            >
              Back
            </button>
            <button
              onClick={getRecommendations}
              disabled={!selectedBookIds.length}
              className={`w-[135px] text-right h-10 ${
                !selectedBookIds.length
                  ? "cursor-not-allowed text-muted-foreground"
                  : "md:hover:underline text-text"
              }`}
            >
              {loading
                ? "Thinking..."
                : selectedBookIds.length === 0
                  ? "Next (0/3 selected)"
                  : `Next (${selectedBookIds.length}/3 selected)`}
            </button>
          </div>
        );

      case 5:
        return (
          <div className="flex justify-end gap-4 h-10">
            <button
              onClick={() => {
                setStep(1);
                setUserType(null);
                setSelectedGenres([]);
                setSelectedPeopleIds([]);
                setSelectedBookIds([]);
                setRecommendations([]);
                setCurrentCardIndex(0);
                setExtraGridItems([]);
                localStorage.removeItem("userType");
                localStorage.removeItem("selectedGenres");
                localStorage.removeItem("selectedPeopleIds");
                localStorage.removeItem("selectedBookIds");
                localStorage.removeItem("recommendations");
                localStorage.removeItem("currentCardIndex");
                localStorage.removeItem("extraGridItems");
              }}
              className="text-text md:hover:underline transition-colors duration-200 cursor-pointer flex items-center gap-1 h-10"
            >
              Redo <ArrowLeftRight size={18} className="inline" />
            </button>
          </div>
        );

      default:
        return null;
    }
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
    <div className="space-y-4">
      {renderNavigationButtons()}
      <div className="w-full h-2 bg-accent/30 border border-border">
        <div
          className={`h-full bg-accent transition-all duration-200 ${currentProgress < 100 ? "border-r" : ""} border-border`}
          style={{ width: `${currentProgress}%` }}
        />
      </div>
      {renderStep()}
    </div>
  );
}
