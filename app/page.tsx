import { createClient } from "@supabase/supabase-js";
import { BookGrid } from "@/components/books";
import { BookCount } from "@/components/book-count";

export const revalidate = 0; // Turn off automatic revalidation
export const dynamic = "force-static";

interface Person {
  full_name: string;
  url: string | null;
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
  let allBooks: any[] = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data: books, error } = await supabase
      .from("books")
      .select(
        `
        *,
        recommendations (
          source,
          source_link,
          recommender:people(
            full_name,
            url
          )
        )
      `)
      .order("title", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (error) {
      console.error('Error fetching books:', error);
      break;
    }
    
    if (!books || books.length === 0) break;
    
    allBooks = [...allBooks, ...books];
    page++;
  }

  const formattedBooks = allBooks.map((book: Book) => ({
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
    url: book.recommendations
        ?.map((rec) => rec.recommender?.url)
        .join(",") || "",
    amazon_url: book.amazon_url || "",
  }));

  return (
    <>
      <BookGrid data={formattedBooks} />
      <BookCount count={formattedBooks.length} />
    </>
  );
}
