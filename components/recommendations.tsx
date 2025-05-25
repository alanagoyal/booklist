"use client";

import {
  useState,
  useCallback,
  useEffect,
  Suspense,
} from "react";
import { SearchInput } from "./search-input";
import { supabase } from "@/utils/supabase/client";
import { FIELD_VALUES } from "@/utils/constants";
import { useRouter, useSearchParams } from "next/navigation";
import type { Book, FormattedRecommender } from "@/types";
import useSWR from "swr";
import fetcher, { fetchRecommenders } from "../utils/fetcher";

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

function SearchDropdown({ results, onSelect, isOpen, loading, selectedIndex }: SearchDropdownProps) {
  if (!isOpen) return null;

  const sortedResults = [...results].sort((a, b) => {
    if (a.isInGrid === b.isInGrid) return 0;
    return a.isInGrid ? 1 : -1;
  });

  return (
    <div className="absolute z-10 w-full border-x border-b border-border bg-background max-h-60 overflow-auto">
      {loading ? (
        <div className="p-3 text-text/70">Searching...</div>
      ) : sortedResults.length === 0 ? (
        <div className="p-3 text-text/70">No results found</div>
      ) : (
        sortedResults.map((result, index) => (
          <div
            key={result.id}
            onClick={() => onSelect(result)}
            className={`p-3 cursor-pointer border border-border transition-colors duration-200 ${
              index === selectedIndex ? 'bg-accent hover:bg-accent/50' : 'bg-background hover:bg-accent/30'
            }`}
          >
            <div className="text-text whitespace-pre-line line-clamp-2">{result.name}</div>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<string[]>([]);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [extraGridItems, setExtraGridItems] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedBook[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize state from localStorage and update URL on mount
  useEffect(() => {
    if (typeof window === 'undefined' || isInitialized) return;

    // Load saved state
    const savedUserType = localStorage.getItem('userType');
    const savedGenres = localStorage.getItem('selectedGenres');
    const savedPeopleIds = localStorage.getItem('selectedPeopleIds');
    const savedBookIds = localStorage.getItem('selectedBookIds');
    const savedRecommendations = localStorage.getItem('recommendations');

    // Initialize state from localStorage
    if (savedUserType) setUserType(savedUserType);
    if (savedGenres) setSelectedGenres(JSON.parse(savedGenres));
    if (savedPeopleIds) setSelectedPeopleIds(JSON.parse(savedPeopleIds));
    if (savedBookIds) setSelectedBookIds(JSON.parse(savedBookIds));
    
    // Check for recommendations last
    if (savedRecommendations) {
      setRecommendations(JSON.parse(savedRecommendations));
      setStep(5);
    } else {
      // If no recommendations, check URL for step
      const urlStep = searchParams.get('step');
      setStep(urlStep ? parseInt(urlStep) : 1);
    }

    setIsInitialized(true);
  }, [searchParams, isInitialized]);

  // Update URL when step changes
  useEffect(() => {
    if (!isInitialized || step === undefined) return;
    const params = new URLSearchParams(window.location.search);
    params.set('step', step.toString());
    router.replace(`?${params.toString()}`);
  }, [step, router, isInitialized]);

  // Save form state to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    
    if (userType) {
      localStorage.setItem('userType', userType);
    } else {
      localStorage.removeItem('userType');
    }

    if (selectedGenres.length) {
      localStorage.setItem('selectedGenres', JSON.stringify(selectedGenres));
    } else {
      localStorage.removeItem('selectedGenres');
    }

    if (selectedPeopleIds.length) {
      localStorage.setItem('selectedPeopleIds', JSON.stringify(selectedPeopleIds));
    } else {
      localStorage.removeItem('selectedPeopleIds');
    }

    if (selectedBookIds.length) {
      localStorage.setItem('selectedBookIds', JSON.stringify(selectedBookIds));
    } else {
      localStorage.removeItem('selectedBookIds');
    }

    if (recommendations.length) {
      localStorage.setItem('recommendations', JSON.stringify(recommendations));
    } else {
      localStorage.removeItem('recommendations');
    }
  }, [userType, selectedGenres, selectedPeopleIds, selectedBookIds, recommendations, isInitialized]);

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
    (items: any[], type: 'people' | 'books') => {
      const baseItems = items.slice(0, 10);
      const extraItems = items.filter(item => extraGridItems.includes(item.id));
      return [...baseItems, ...extraItems];
    },
    [extraGridItems]
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setIsSearching(true);
      setSelectedIndex(-1);

      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      const lowerQuery = query.toLowerCase();
      
      if (step === 3 && recommenders) {
        const gridPeopleIds = gridItems(recommenders, 'people').map(p => p.id);
        const results = Array.from(new Map(
          recommenders
            .filter(person => 
              person.full_name.toLowerCase().includes(lowerQuery) ||
              (person.type?.toLowerCase() || '').includes(lowerQuery)
            )
            .map(person => ({
              id: person.id,
              name: `${person.full_name}${person.type ? ` (${person.type})` : ''}`,
              isInGrid: gridPeopleIds.includes(person.id)
            }))
            .map(result => [result.id, result])
        ).values());
        setSearchResults(results);
      } else if (step === 4 && books) {
        const gridBookIds = gridItems(books, 'books').map(b => b.id);
        const results = Array.from(new Map(
          books
            .filter(book => 
              book.title.toLowerCase().includes(lowerQuery) ||
              book.author.toLowerCase().includes(lowerQuery)
            )
            .map(book => ({
              id: book.id,
              name: `${book.title} by ${book.author}`,
              isInGrid: gridBookIds.includes(book.id)
            }))
            .map(result => [result.id, result])
        ).values());
        setSearchResults(results);
      }
      
      setIsSearching(false);
    },
    [step, books, recommenders, gridItems]
  );

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const handleSearchResultSelect = (result: SearchResult) => {
    setSearchQuery(''); // Close dropdown
    
    if (step === 3 && recommenders) {
      const gridPeople = gridItems(recommenders, 'people');
      const isInFirstTen = gridPeople.slice(0, 10).some(p => p.id === result.id);
      
      if (!isInFirstTen && !extraGridItems.includes(result.id)) {
        setExtraGridItems(prev => [...prev, result.id]);
      }

      // Select the person if not already selected
      const person = recommenders.find(p => p.id === result.id);
      if (person && !selectedPeopleIds.includes(result.id) && selectedPeopleIds.length < 3) {
        handlePersonSelect(person);
      }
    } else if (step === 4 && books) {
      const gridBooks = gridItems(books, 'books');
      const isInFirstTen = gridBooks.slice(0, 10).some(b => b.id === result.id);
      
      if (!isInFirstTen && !extraGridItems.includes(result.id)) {
        setExtraGridItems(prev => [...prev, result.id]);
      }

      // Select the book if not already selected
      const book = books.find(b => b.id === result.id);
      if (book && !selectedBookIds.includes(result.id) && selectedBookIds.length < 3) {
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

    console.log("Getting recommendations for:", {
      userType,
      selectedGenres,
      selectedPeopleIds,
      selectedBookIds,
    });

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
          <div className="space-y-4">
            <h2 className="text-xl font-base">What is your profession?</h2>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {FIELD_VALUES.type
                  .slice(0, showAllTypes ? undefined : 10)
                  .map((type) => (
                  <div
                    key={type}
                    onClick={() => setUserType(type)}
                    className={`p-3 cursor-pointer border border-border transition-colors duration-200 whitespace-pre-line line-clamp-2 ${
                      type === userType ? 'bg-accent hover:bg-accent/50' : 'bg-background hover:bg-accent/30'
                    }`}
                  >
                    {type}
                  </div>
                ))}
              </div>
              {FIELD_VALUES.type.length > 10 && (
                <button
                  onClick={() => setShowAllTypes(!showAllTypes)}
                  className="w-full p-2 text-text/70 md:hover:text-text transition-colors duration-200"
                >
                  {showAllTypes ? "Show less" : "Show more"}
                </button>
              )}
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setStep(2)}
                disabled={!userType}
                className={`w-full p-3 ${
                  !userType
                    ? 'bg-accent/30 cursor-not-allowed'
                    : 'bg-accent/80 md:hover:bg-accent'
                } text-text border border-border transition-colors duration-200`}
              >
                {userType ? "Next (1/1 selected)" : "0/1 selected"}
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-base">What genres interest you?</h2>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {FIELD_VALUES.genres
                  .slice(0, showAllGenres ? undefined : 10)
                  .map((genre) => (
                    <div
                      key={genre}
                      onClick={() => handleGenreToggle(genre)}
                      className={`p-3 cursor-pointer border border-border transition-colors duration-200 whitespace-pre-line line-clamp-2 ${
                        selectedGenres.includes(genre) ? 'bg-accent hover:bg-accent/50' : 'bg-background hover:bg-accent/30'
                      }`}
                    >
                      {genre}
                    </div>
                  ))}
              </div>
              {FIELD_VALUES.genres.length > 10 && (
                <button
                  onClick={() => setShowAllGenres(!showAllGenres)}
                  className="w-full p-2 text-text/70 md:hover:text-text transition-colors duration-200"
                >
                  {showAllGenres ? "Show less" : "Show more"}
                </button>
              )}
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setStep(3);
                }}
                disabled={selectedGenres.length === 0}
                className={`w-full p-3 ${
                  selectedGenres.length === 0
                    ? 'bg-accent/30 cursor-not-allowed'
                    : 'bg-accent/80 md:hover:bg-accent'
                } text-text border border-border transition-colors duration-200`}
              >
                {selectedGenres.length === 0
                  ? "0/3 selected"
                  : `Next (${selectedGenres.length}/3 selected)`}
              </button>
              <button
                onClick={() => setStep(step - 1)}
                className="w-full p-3 bg-background text-text/70 border border-border md:hover:bg-accent/30 transition-colors duration-200"
              >
                Back
              </button>
            </div>
          </div>
        );

      case 3:
        console.log('First 12 people:', recommenders?.slice(0, 12))
        if (!recommenders) return null;

        return (
          <div className="space-y-4">
            <h2 className="text-xl font-base">
              Whose reading tastes do you admire?
            </h2>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 mt-4">
                {recommenders && gridItems(recommenders, 'people').map((person) => (
                  <div
                    key={person.id}
                    onClick={() => handlePersonSelect(person)}
                    className={`p-3 cursor-pointer border border-border transition-colors duration-200 whitespace-pre-line line-clamp-2 ${
                      selectedPeopleIds.includes(person.id) ? 'bg-accent hover:bg-accent/50' : 'bg-background hover:bg-accent/30'
                    }`}
                  >
                    {person.full_name}
                    {person.type ? ` (${person.type})` : ""}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <SearchInput
                value={searchQuery}
                onChange={handleSearch}
                onClear={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setIsSearching(false);
                  setSelectedIndex(-1);
                }}
                placeholder="Search for more people..."
                onKeyDown={(e) => {
                  if (searchResults.length === 0) return;
                  
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => 
                      prev < searchResults.length - 1 ? prev + 1 : prev
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
                  } else if (e.key === 'Enter' && selectedIndex >= 0) {
                    e.preventDefault();
                    handleSearchResultSelect(searchResults[selectedIndex]);
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
            <div className="space-y-2">
              <button
                onClick={() => setStep(4)}
                disabled={!selectedPeopleIds.length}
                className={`w-full p-3 ${
                  !selectedPeopleIds.length
                    ? 'bg-accent/30 cursor-not-allowed'
                    : 'bg-accent/80 md:hover:bg-accent'
                } text-text border border-border transition-colors duration-200`}
              >
                {selectedPeopleIds.length === 0
                  ? "0/3 selected"
                  : `Next (${selectedPeopleIds.length}/3 selected)`}
              </button>
              <button
                onClick={() => setStep(step - 1)}
                className="w-full p-3 bg-background text-text/70 border border-border md:hover:bg-accent/30 transition-colors duration-200"
              >
                Back
              </button>
            </div>
          </div>
        );

      case 4:
        console.log('First 12 books:', books?.slice(0, 12))
        if (!books) return null;

        return (
          <div className="space-y-4">
            <h2 className="text-xl font-base">
              What books are exemplary of your reading taste?
            </h2>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 mt-4">
                {books && gridItems(books, 'books').map((book) => (
                  <div
                    key={book.id}
                    onClick={() => handleBookSelect(book)}
                    className={`p-3 cursor-pointer border border-border transition-colors duration-200 whitespace-pre-line line-clamp-2 ${
                      selectedBookIds.includes(book.id) ? 'bg-accent hover:bg-accent/50' : 'bg-background hover:bg-accent/30'
                    }`}
                  >
                    {book.title} by {book.author}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <SearchInput
                value={searchQuery}
                onChange={handleSearch}
                onClear={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setIsSearching(false);
                  setSelectedIndex(-1);
                }}
                placeholder="Search for more books..."
                onKeyDown={(e) => {
                  if (searchResults.length === 0) return;
                  
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => 
                      prev < searchResults.length - 1 ? prev + 1 : prev
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
                  } else if (e.key === 'Enter' && selectedIndex >= 0) {
                    e.preventDefault();
                    handleSearchResultSelect(searchResults[selectedIndex]);
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
            <div className="space-y-2">
              <button
                onClick={getRecommendations}
                disabled={loading || !selectedBookIds.length}
                className={`w-full p-3 ${
                  loading || !selectedBookIds.length
                    ? 'bg-accent/30 cursor-not-allowed'
                    : 'bg-accent/80 md:hover:bg-accent'
                } text-text border border-border transition-colors duration-200`}
              >
                {loading
                  ? "Getting Recommendations..."
                  : selectedBookIds.length === 0
                  ? "0/3 selected"
                  : `Get Recommendations (${selectedBookIds.length}/3 selected)`}
              </button>
              <button
                onClick={() => setStep(step - 1)}
                className="w-full p-3 bg-background text-text/70 border border-border md:hover:bg-accent/30 transition-colors duration-200"
              >
                Back
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-base">
              Your Personalized Recommendations
            </h2>
            <div className="space-y-4">
              {recommendations.map((book) => (
                <div
                  key={book.id}
                  className="p-4 border border-border space-y-2"
                >
                  <h3
                    className="text-lg font-base cursor-pointer md:hover:underline transition-colors duration-200"
                    onClick={() => handleBookClick(book.id)}
                  >
                    {book.title}
                  </h3>
                  <p className="text-text/70">{book.author}</p>
                  {book.description && (
                    <p className="text-text/70 whitespace-pre-line line-clamp-2">
                      {book.description}
                    </p>
                  )}
                  <div className="text-sm space-y-1">
                    <p className="text-text/70">Recommended because:</p>
                    <ul className="list-disc list-inside">
                      {book.match_reasons.similar_to_favorites && (
                        <li>Similar to your favorite books</li>
                      )}
                      {book.match_reasons.recommended_by_inspiration && (
                        <li>Recommended by people who inspire you</li>
                      )}
                      {book.match_reasons.recommended_by_similar_people && (
                        <li>
                          Recommended by people similar to your inspirations
                        </li>
                      )}
                      {book.match_reasons.genre_match && (
                        <li>Matches your preferred genres</li>
                      )}
                      {book.match_reasons.recommended_by_similar_type && (
                        <li>Popular among {userType}s</li>
                      )}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                // Clear all form state and localStorage
                setStep(1);
                setUserType(null);
                setSelectedGenres([]);
                setSelectedPeopleIds([]);
                setSelectedBookIds([]);
                setRecommendations([]);
                localStorage.removeItem('userType');
                localStorage.removeItem('selectedGenres');
                localStorage.removeItem('selectedPeopleIds');
                localStorage.removeItem('selectedBookIds');
                localStorage.removeItem('recommendations');
              }}
              className="w-full p-3 bg-accent/80 text-text border border-border md:hover:bg-accent transition-colors duration-200"
            >
              Start Over
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <div className="space-x-2">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`inline-block w-2 h-2 rounded-full ${
              i === step ? "bg-text" : "bg-text/30"
            }`}
          />
        ))}
      </div>
      {renderStep()}
    </div>
  );
}
