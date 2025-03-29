import { createClient } from "@supabase/supabase-js";
import { Book } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function getRandomBook(): Promise<Book | null> {
  // Use a raw SQL query to efficiently get a random book
  const { data, error } = await supabase
    .rpc('get_random_book', {})
    .select(`
      *,
      recommendations (
        *,
        people:person_id (
          full_name
        )
      )
    `);

  if (error || !data || data.length === 0) {
    console.error("Error fetching random book:", error);
    return null;
  }

  const book = data[0];
  return {
    ...book,
    recommendations: book.recommendations?.map((rec: any) => ({
      person_id: rec.person_id,
      source: rec.source,
      source_link: rec.source_link,
      recommender_name: rec.people?.full_name
    })) || []
  };
}

// Keep getBooks for other features that need the full list
export async function getBooks(): Promise<Book[]> {
  const { data: books, error: booksError } = await supabase
    .from("books")
    .select("*");

  if (booksError) {
    console.error("Error fetching books:", booksError);
    return [];
  }

  const { data: recommendations, error: recsError } = await supabase
    .from("recommendations")
    .select(`
      *,
      people:person_id (
        full_name
      )
    `);

  if (recsError) {
    console.error("Error fetching recommendations:", recsError);
    return books || [];
  }

  // Group recommendations by book_id
  const recsByBook = recommendations?.reduce((acc, rec) => {
    if (!acc[rec.book_id]) {
      acc[rec.book_id] = [];
    }
    acc[rec.book_id].push({
      person_id: rec.person_id,
      source: rec.source,
      source_link: rec.source_link,
      recommender_name: rec.people?.full_name
    });
    return acc;
  }, {} as Record<string, Book['recommendations']>);

  // Attach recommendations to books
  return (books || []).map(book => ({
    ...book,
    recommendations: recsByBook?.[book.id] || []
  }));
}
