import { createClient } from "@supabase/supabase-js";
import { BookList } from "@/components/books";

interface DatabaseRecommendation {
  source: string;
  source_link: string | null;
  recommender: {
    full_name: string;
    url: string | null;
  } | null;
}

interface DatabaseBook {
  id: string;
  title: string | null;
  author: string | null;
  description: string | null;
  genre: string[] | null;
  amazon_url: string | null;
  recommendations: DatabaseRecommendation[] | null;
}

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Force static generation and disable ISR
export const dynamic = 'force-static';
export const revalidate = false;

// Fetch books at build time
async function getBooks() {
  const { data: books, error } = await supabase
    .from("books")
    .select(
      `
      id,
      title,
      author,
      description,
      genre,
      amazon_url,
      recommendations (
        source,
        source_link,
        recommender:people(
          full_name,
          url
        )
      )
    `)
    .order("title", { ascending: true });  // No limit since this is static build time

  if (error) {
    throw error;
  }

  return ((books || []) as unknown as DatabaseBook[]).map((book) => ({
    id: book.id,
    title: book.title || "n/a",
    author: book.author || "n/a",
    description: book.description || "n/a",
    genres: book.genre?.join(", ") || "n/a",
    recommenders:
      book.recommendations
        ?.map((rec) => rec.recommender?.full_name)
        .filter(Boolean)
        .join(", ") || "n/a",
    source:
      book.recommendations
        ?.map((rec) => rec.source)
        .join(", ") || "n/a",
    source_link: book.recommendations
        ?.map((rec) => rec.source_link)
        .filter(Boolean)
        .join(",") || "",
    url: book.recommendations
        ?.map((rec) => rec.recommender?.url)
        .filter(Boolean)
        .join(",") || "",
    amazon_url: book.amazon_url || "",
  }));
}

export default async function Home() {
  try {
    const formattedBooks = await getBooks();
    return <BookList initialBooks={formattedBooks} />;
  } catch (error) {
    console.error('Error fetching books:', error);
    return (
      <div className="p-4">
        <div className="text-text font-bold mb-2">Error loading books</div>
        <pre className="text-text/70 text-sm whitespace-pre-wrap">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }
}