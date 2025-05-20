"use client";

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  Suspense,
} from "react";
import { supabase } from "@/utils/supabase/client";
import { FIELD_VALUES } from "@/utils/constants";
import { useRouter, useSearchParams } from "next/navigation";
import type { Book, Person, FormattedRecommender } from "@/types";
import useSWR from "swr";
import fetcher, { fetchRecommenders } from "../utils/fetcher";

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

function RecommendationsContent() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<string[]>([]);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedBook[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Only fetch data when needed
  const { data: books } = useSWR<Book[]>(
    step >= 3 ? "/data/books-essential.json" : null,
    fetcher
  );
  const { data: recommenders } = useSWR<FormattedRecommender[]>(
    step >= 3 ? "/data/recommenders.json" : null,
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
    // Add loading states for steps that need data
    if (step >= 3 && step <= 4) {
      if (!books || !recommenders) {
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-base">Loading...</h2>
          </div>
        );
      }
    }

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
                {userType ? "Next (1/1 selected)" : "0/1 selected"}
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
                }}
                disabled={selectedGenres.length === 0}
                className="w-full p-3 bg-accent text-text border border-border md:hover:bg-accent/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
        if (!recommenders) return null;
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-base">
              Who inspires you? (Choose up to 3)
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 mt-4">
                {/* Show top 18 recommenders */}
                {recommenders.slice(0, 18).map((person) => (
                  <button
                    key={person.id}
                    onClick={() => handlePersonSelect(person)}
                    className={`p-2 border border-border text-text transition-colors duration-200 ${selectedPeopleIds.includes(person.id) ? "bg-accent" : "bg-background md:hover:bg-accent/50"}`}
                  >
                    {person.full_name}
                    {person.type ? ` (${person.type})` : ""}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setStep(4);
                }}
                disabled={!selectedPeopleIds.length}
                className="w-full p-3 bg-accent text-text border border-border md:hover:bg-accent/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
        if (!books) return null;
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-base">
              What are your favorite books? (Choose up to 3)
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 mt-4">
                {/* First show all popular books */}
                {books.slice(0, 18).map((book) => (
                  <button
                    key={book.id}
                    onClick={() => handleBookSelect(book)}
                    className={`p-2 border border-border text-text transition-colors duration-200 ${selectedBookIds.includes(book.id) ? "bg-accent" : "bg-background md:hover:bg-accent/50"}`}
                  >
                    {book.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={getRecommendations}
                disabled={loading || !selectedBookIds.length}
                className="w-full p-3 bg-accent text-text border border-border md:hover:bg-accent/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? "Getting Recommendations..."
                  : selectedBookIds.length === 0
                  ? "0/3 selected"
                  : `Get Recommendations (${selectedBookIds.length}/3 selected)`}
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
                setSelectedPeopleIds([]);
                setSelectedBookIds([]);
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
