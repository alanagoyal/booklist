import { createClient } from '@supabase/supabase-js';
import { BookGrid } from '@/components/books';

export const revalidate = 0; // Turn off automatic revalidation
export const dynamic = 'force-static';

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Book = {
  id: number;
  title: string | null;
  author: string | null;
  description: string | null;
  genre: string[] | null;
  recommendations: {
    source: string;
    source_link: string | null;
    recommender: {
      full_name: string;
    };
  }[] | null;
};

export default async function Home() {
  const { data: books } = await supabase
    .from('books')
    .select(`
      *,
      recommendations (
        source,
        source_link,
        recommender:people(full_name)
      )
    `)
    .order('title', { ascending: true });

  const formattedBooks = (books || []).map(book => ({
    id: book.id,
    title: book.title?.toLowerCase() || 'n/a',
    author: book.author?.toLowerCase() || 'n/a',
    description: book.description?.toLowerCase() || 'n/a',
    genres: book.genre?.join(', ')?.toLowerCase() || 'n/a',
    recommender: book.recommendations?.map((rec: { recommender?: { full_name: string } }) => rec.recommender?.full_name?.toLowerCase()).join(', ') || 'n/a',
    source: book.recommendations?.map((rec: { source: string }) => rec.source?.toLowerCase()).join(', ') || 'n/a',
    source_link: book.recommendations?.[0]?.source_link || ''
  }));

  return <BookGrid data={formattedBooks} />;
}
