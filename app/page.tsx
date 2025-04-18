import { BookList } from "@/components/book-list";
import type { FormattedBook, FormattedRecommender } from "@/types";
import { createClient } from "@/utils/supabase/server";

// Force static generation
export const dynamic = "force-static";
// Disable revalidation
export const revalidate = false;

// Fetch books at build time
async function getBooks(): Promise<FormattedBook[]> {
  // Create a server-side Supabase client
  const supabase = createClient();

  const pageSize = 1000;
  let allBooks: any[] = [];
  let page = 0;
  let hasMore = true;

  try {
    // Fetch books in batches
    while (hasMore) {
      const { data: books, error } = await supabase.rpc(
        "get_books_by_recommendation_count",
        {
          p_limit: pageSize,
          p_offset: page * pageSize,
        }
      );

      if (error) {
        console.error("Error fetching books:", error);
        return [];
      }

      if (books && books.length > 0) {
        allBooks = [...allBooks, ...books];
        page++;
      } else {
        hasMore = false;
      }
    }
  } catch (e) {
    console.error("Unexpected error fetching books:", e);
    return [];
  }

  return allBooks.map((book: any) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    description: book.description,
    genres: book.genre,
    amazon_url: book.amazon_url,
    recommendations: book.recommendations.map((rec: any) => ({
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
  }));
}

async function getRecommenders(): Promise<FormattedRecommender[]> {
  // Create a server-side Supabase client
  const supabase = createClient();

  // Get all people from the database
  const { data: people, error: peopleError } = await supabase
    .from("people")
    .select("id, full_name, url, type")
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

export default async function Home() {
  // These will only run at build time with the configuration above
  const [formattedBooks, formattedRecommenders] = await Promise.all([
    getBooks(),
    getRecommenders(),
  ]);

  return (
    <BookList
      initialBooks={formattedBooks}
      initialRecommenders={formattedRecommenders}
    />
  );
}
