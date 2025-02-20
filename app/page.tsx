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
  title: string;
  author: string;
  description: string;
  genre: string[];
  recommendations: {
    source: string;
    source_link: string;
    recommender: {
      full_name: string;
    };
  }[];
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
    title: book.title.toLowerCase(),
    author: book.author.toLowerCase(),
    description: book.description.toLowerCase() || 'n/a',
    genres: book.genre?.join(', ').toLowerCase() || 'n/a',
    recommender: book.recommendations?.[0]?.recommender?.full_name.toLowerCase() || 'n/a',
    source: book.recommendations?.[0]?.source.toLowerCase() || 'n/a',
    source_link: book.recommendations?.[0]?.source_link || ''
  }));

  return <BookGrid data={formattedBooks} />;
}
