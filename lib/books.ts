import { Book } from "../app/types/book";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function getRandomBook(): Promise<Book | null> {
  // Get total count of books
  const { count } = await supabase
    .from("books")
    .select("*", { count: "exact", head: true });

  if (!count) return null;

  // Get a random offset
  const randomOffset = Math.floor(Math.random() * count);

  // Fetch one random book
  const { data: books, error: booksError } = await supabase
    .from("books")
    .select("*")
    .range(randomOffset, randomOffset)
    .limit(1);

  if (booksError || !books || books.length === 0) {
    console.error("Error fetching random book:", booksError);
    return null;
  }

  const book = books[0];

  // Fetch recommendations for this specific book
  const { data: recommendations, error: recsError } = await supabase
    .from("recommendations")
    .select(`
      *,
      people:person_id (
        full_name
      )
    `)
    .eq('book_id', book.id);

  if (recsError) {
    console.error("Error fetching recommendations:", recsError);
    return book;
  }

  // Process recommendations for the book
  const bookWithRecs = {
    ...book,
    recommendations: recommendations?.map(rec => ({
      person_id: rec.person_id,
      source: rec.source,
      source_link: rec.source_link,
      recommender_name: rec.people?.full_name
    })) || []
  };

  return bookWithRecs;
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
