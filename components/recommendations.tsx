"use client";

import { useState, useCallback, Suspense, useRef, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { FIELD_VALUES } from "@/utils/constants";
import { useRouter, useSearchParams } from "next/navigation";


interface Book {
  id: string;
  title: string;
  author: string;
  description: string | null;
  score: number;
  match_reasons: {
    similar_to_favorites: boolean;
    recommended_by_inspiration: boolean;
    recommended_by_similar_people: boolean;
    genre_match: boolean;
    recommended_by_similar_type: boolean;
  };
}

interface Person {
  id: string;
  full_name: string;
  type: string | null;
}

export function Recommendations() {
  return (
    <Suspense>
      <RecommendationsContent />
    </Suspense>
  );
}

function RecommendationsContent() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [inspiringPeople, setInspiringPeople] = useState<Person[]>([]);
  const [favoriteBooks, setFavoriteBooks] = useState<Book[]>([]);
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [shouldFocusSearch, setShouldFocusSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (shouldFocusSearch && searchInputRef.current) {
      searchInputRef.current.focus();
      setShouldFocusSearch(false);
    }
  }, [shouldFocusSearch]);

  const handleSearch = async (query: string, type: "people" | "books") => {
    if (!query) {
      setSearchResults([]);
      return;
    }

    const table = type === "people" ? "people" : "books";
    const { data } = await supabase
      .from(table)
      .select("*")
      .ilike(type === "people" ? "full_name" : "title", `%${query}%`)
      .limit(5);

    setSearchResults(data || []);
  };

  const handleGenreToggle = useCallback(
    (genre: string) => {
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
    },
    []
  );

  const handlePersonSelect = (person: Person) => {
    if (
      inspiringPeople.length < 3 &&
      !inspiringPeople.find((p) => p.id === person.id)
    ) {
      setInspiringPeople((prev) => [...prev, person]);
      setShouldFocusSearch(true);
      setTimeout(() => setShouldFocusSearch(false), 100);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleBookSelect = (book: Book) => {
    if (
      favoriteBooks.length < 3 &&
      !favoriteBooks.find((b) => b.id === book.id)
    ) {
      setFavoriteBooks((prev) => [...prev, book]);
      setShouldFocusSearch(true);
      setTimeout(() => setShouldFocusSearch(false), 100);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const getRecommendations = async () => {
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
          p_inspiration_ids: inspiringPeople.map((p) => p.id),
          p_favorite_book_ids: favoriteBooks.map((b) => b.id),
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
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-base">What is your profession?</h2>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_VALUES.type.map((type) => (
                <button
                  key={type}
                  onClick={() => setUserType(type)}
                  className={`p-2 border border-border text-text transition-colors duration-200 ${
                    userType === type
                      ? "bg-accent"
                      : "bg-background md:hover:bg-accent/50"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setStep(2)}
                disabled={!userType}
                className="w-full p-3 bg-accent text-text border border-border md:hover:bg-accent/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {userType ? 'Next (1/1 selected)' : '0/1 selected'}
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-base">What genres interest you?</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {FIELD_VALUES.genres
                  .slice(0, showAllGenres ? undefined : 18)
                  .map((genre) => (
                    <button
                      key={genre}
                      onClick={() => handleGenreToggle(genre)}
                      className={`p-2 border border-border text-text transition-colors duration-200 ${
                        selectedGenres.includes(genre)
                          ? "bg-accent"
                          : "bg-background md:hover:bg-accent/50"
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
              </div>
              {FIELD_VALUES.genres.length > 18 && (
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
                  setShouldFocusSearch(true);
                  setTimeout(() => setShouldFocusSearch(false), 100);
                }}
                disabled={selectedGenres.length === 0}
                className="w-full p-3 bg-accent text-text border border-border md:hover:bg-accent/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedGenres.length === 0 ? '0/3 selected' : `Next (${selectedGenres.length}/3 selected)`}
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
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-base">
              Who inspires you? (Choose up to 3)
            </h2>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value, "people");
              }}
              placeholder="Search for people..."
              className="w-full p-3 bg-background text-text border border-border focus:outline-none rounded-none"
            />
            {searchResults.length > 0 && (
              <div className="border border-border bg-background">
                {searchResults.map((person: Person) => (
                  <button
                    key={person.id}
                    onClick={() => handlePersonSelect(person)}
                    className="w-full p-3 text-left text-text md:hover:bg-accent/50 transition-colors duration-200"
                  >
                    {person.full_name} {person.type ? `(${person.type})` : ""}
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-2">
              {inspiringPeople.map((person) => (
                <div
                  key={person.id}
                  className="flex justify-between items-center p-3 border border-border"
                >
                  <span>
                    {person.full_name} {person.type ? `(${person.type})` : ""}
                  </span>
                  <button
                    onClick={() =>
                      setInspiringPeople((prev) =>
                        prev.filter((p) => p.id !== person.id)
                      )
                    }
                    className="text-text/70 md:hover:text-text transition-colors duration-200"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {inspiringPeople.length > 0 && (
                <button
                  onClick={() => {
                    setStep(4);
                    setShouldFocusSearch(true);
                    setTimeout(() => setShouldFocusSearch(false), 100);
                  }}
                  className="w-full p-3 bg-accent text-text border border-border md:hover:bg-accent/50 transition-colors duration-200"
                >
                  Next
                </button>
              )}
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="w-full p-3 bg-background text-text/70 border border-border md:hover:bg-accent/30 transition-colors duration-200"
                >
                  Back
                </button>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-base">
              What are your favorite books? (Choose up to 3)
            </h2>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value, "books");
              }}
              placeholder="Search for books..."
              className="w-full p-3 bg-background text-text border border-border focus:outline-none rounded-none"
            />
            {searchResults.length > 0 && (
              <div className="border border-border bg-background">
                {searchResults.map((book: Book) => (
                  <button
                    key={book.id}
                    onClick={() => handleBookSelect(book)}
                    className="w-full p-3 text-left text-text md:hover:bg-accent/50 transition-colors duration-200"
                  >
                    {book.title} by {book.author}
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-2">
              {favoriteBooks.map((book) => (
                <div
                  key={book.id}
                  className="flex justify-between items-center p-3 border border-border"
                >
                  <span>
                    {book.title} by {book.author}
                  </span>
                  <button
                    onClick={() =>
                      setFavoriteBooks((prev) =>
                        prev.filter((b) => b.id !== book.id)
                      )
                    }
                    className="text-text/70 md:hover:text-text transition-colors duration-200"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <button
                onClick={getRecommendations}
                disabled={loading || favoriteBooks.length === 0}
                className="w-full p-3 bg-accent text-text border border-border md:hover:bg-accent/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Getting Recommendations..." : "Get Recommendations"}
              </button>
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="w-full p-3 bg-background text-text/70 border border-border md:hover:bg-accent/30 transition-colors duration-200"
                >
                  Back
                </button>
              )}
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
                setStep(1);
                setUserType(null);
                setSelectedGenres([]);
                setInspiringPeople([]);
                setFavoriteBooks([]);
                setRecommendations([]);
              }}
              className="w-full p-3 bg-accent/50 text-text border border-border md:hover:bg-accent transition-colors duration-200"
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
