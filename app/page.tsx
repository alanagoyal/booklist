import { BookList } from "@/components/books";
import { DatabaseBook, FormattedBook, Recommender } from "@/types";
import { supabase } from "@/utils/supabase/client";

// Force static generation and disable ISR
export const dynamic = 'force-static';
export const revalidate = false;

// Fetch books at build time
async function getBooks(): Promise<FormattedBook[]> {
  // Get sorted books
  const { data: books, error } = await supabase
    .rpc('get_books_by_recommendation_count');

  if (error) {
    throw error;
  }

  const formattedBooks = ((books || []) as DatabaseBook[]).map((book) => {
    const formatted: FormattedBook = {
      id: book.id,
      title: book.title || "n/a",
      author: book.author || "n/a",
      description: book.description || "n/a",
      genres: book.genre?.join(", ") || "n/a",
      recommenders:
        book.recommendations
          ?.map((rec) => rec.recommender?.full_name)
          .filter(Boolean)
          .join(', ') || "n/a",
      recommender_types:
        book.recommendations
          ?.map((rec) => rec.recommender?.type)
          .filter(Boolean)
          .join(', ') || "n/a",
      source:
        book.recommendations
          ?.map((rec) => rec.source)
          .join(', ') || "n/a",
      source_link: book.recommendations
          ?.map((rec) => rec.source_link)
          .filter(Boolean)
          .join(', ') || "",
      url: book.recommendations
          ?.map((rec) => rec.recommender?.url)
          .filter(Boolean)
          .join(', ') || "",
      amazon_url: book.amazon_url || "",
      related_books: book.related_books || []
    };
    
    return formatted;
  });

  return formattedBooks;
}

async function getPeople(): Promise<Recommender[]> {
  const { data: people, error } = await supabase
    .from('people')
    .select('id, full_name, url, type')
    .order('full_name');

  if (error) {
    throw error;
  }

  // Ensure type is never null to match Recommender interface
  return (people || []).map(person => ({
    ...person,
    type: person.type || 'Unknown' // Provide default value if null
  }));
}

export default async function Home() {
  try {
    const [formattedBooks, people] = await Promise.all([
      getBooks(),
      getPeople(),
    ]);
    return <BookList initialBooks={formattedBooks} people={people} />;
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