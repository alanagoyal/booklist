import type { FormattedBook, FormattedRecommender, RelatedBook } from "@/types";
import { createClient } from "@/utils/supabase/server";

// Fetch books from Supabase
export async function getBooks(): Promise<FormattedBook[]> {
  // Create a server-side Supabase client
  const supabase = createClient();

  try {
    // 1. Get basic book data with counts
    const { data: books, error: booksError } = await supabase.rpc(
      "get_books_with_counts",
      { p_limit: 1000, p_offset: 0 }
    );

    if (booksError) {
      console.error("Error fetching books:", booksError);
      return [];
    }

    // 2. Get recommendations for all books
    const { data: recommendationsData, error: recommendationsError } = await supabase.rpc(
      "get_book_recommendations",
      { book_ids: books.map((b: { id: string }) => b.id) }
    );

    if (recommendationsError) {
      console.error("Error fetching recommendations:", recommendationsError);
      return [];
    }

    // 3. Get related books for all books
    const { data: relatedBooksData, error: relatedError } = await supabase.rpc(
      "get_related_books",
      { 
        book_ids: books.map((b: { id: string }) => b.id),
        p_limit: 3
      }
    );

    if (relatedError) {
      console.error("Error fetching related books:", relatedError);
      return [];
    }

    // Combine all the data
    return books.map((book: any) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      description: book.description,
      genres: book.genre,
      amazon_url: book.amazon_url,
      recommendations: (recommendationsData?.[book.id] || []).map((rec: any) => ({
        recommender: rec.recommender
          ? {
              id: rec.recommender.id || "",
              full_name: rec.recommender.full_name || "",
              url: rec.recommender.url,
              type: rec.recommender.type || "",
            }
          : null,
        source: rec.source,
        source_link: rec.source_link,
      })),
      _recommendation_count: book._recommendation_count,
      _percentile: book._percentile,
      related_books: (relatedBooksData?.[book.id] || []).map((rb: any) => ({
        id: rb.id,
        title: rb.title,
        author: rb.author,
        description: rb.description,
        amazon_url: rb.amazon_url,
        _recommendationCount: rb._recommendationCount,
      })) as RelatedBook[],
    }));
  } catch (e) {
    console.error("Unexpected error fetching books:", e);
    return [];
  }
}

// Fetch recommenders from Supabase
export async function getRecommenders(): Promise<FormattedRecommender[]> {
  // Create a server-side Supabase client
  const supabase = createClient();

  // Get all people from the database
  const { data: people, error: peopleError } = await supabase
    .from("people")
    .select("id, full_name, url, type, description")
    .order("full_name");

  if (peopleError) {
    console.error("Error fetching people:", peopleError);
    throw peopleError;
  }

  // For each person, get their recommendations and related recommenders
  const formattedRecommenders = (
    await Promise.all(
      (people || []).map(async (person) => {
        const { data, error } = await supabase.rpc("get_recommender_details", {
          p_recommender_id: person.id,
        });

        if (error || !data?.[0]) {
          console.error("Error fetching recommender details:", error);
          return null;
        }

        // Transform the raw data into the correct types
        const rawData = data[0];
        const recommender: FormattedRecommender = {
          id: rawData.id,
          full_name: rawData.full_name,
          url: rawData.url,
          type: rawData.type || "Unknown",
          description: rawData.description,
          recommendations: (rawData.recommendations as any[]).map((rec) => ({
            id: rec.id,
            title: rec.title,
            author: rec.author,
            description: rec.description,
            genre: rec.genre,
            amazon_url: rec.amazon_url,
            source: rec.source,
            source_link: rec.source_link,
          })),
          related_recommenders: (rawData.related_recommenders as any[]).map(
            (rec) => ({
              id: rec.id,
              full_name: rec.full_name,
              url: rec.url,
              type: rec.type,
              shared_books: rec.shared_books,
              shared_count: rec.shared_count,
            })
          ),
        };
        return recommender;
      })
    )
  ).filter(
    (recommender): recommender is FormattedRecommender => recommender !== null
  );

  return formattedRecommenders;
}
