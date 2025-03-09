import { createClient } from "@supabase/supabase-js";
import { BookGrid } from "@/components/books";

export const revalidate = 0; // Turn off automatic revalidation
export const dynamic = "force-static";

interface Person {
  full_name: string;
  website_url: string | null;
  twitter_url: string | null;
  wiki_url: string | null;
}

interface Recommendation {
  source: string;
  source_link: string | null;
  recommender: Person;
}

interface Book {
  id: number;
  title: string | null;
  author: string | null;
  description: string | null;
  genre: string[] | null;
  amazon_url: string | null;
  recommendations: Recommendation[] | null;
}

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function Home() {
  const { data: books } = await supabase
    .from("books")
    .select(
      `
      *,
      recommendations (
        source,
        source_link,
        recommender:people(
          full_name,
          website_url,
          twitter_url,
          wiki_url
        )
      )
    `
    )
    .order("title", { ascending: true });

  const formattedBooks = (books || []).map((book: Book) => ({
    id: book.id,
    title: book.title || "n/a",
    author: book.author || "n/a",
    description: book.description || "n/a",
    genres: book.genre?.join(", ") || "n/a",
    recommender:
      book.recommendations
        ?.map((rec) => rec.recommender?.full_name)
        .join(", ") || "n/a",
    source:
      book.recommendations
        ?.map((rec) => rec.source)
        .join(", ") || "n/a",
    source_link: book.recommendations
        ?.map((rec) => rec.source_link)
        .join(",") || "",
    website_url: book.recommendations
        ?.map((rec) => rec.recommender?.website_url)
        .join(",") || "",
    twitter_url: book.recommendations
        ?.map((rec) => rec.recommender?.twitter_url)
        .join(",") || "",
    wiki_url: book.recommendations
        ?.map((rec) => rec.recommender?.wiki_url)
        .join(",") || "",
    amazon_url: book.amazon_url || "",
  }));

  return <BookGrid data={formattedBooks} />;
}
