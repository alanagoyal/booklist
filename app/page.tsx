import { createClient } from '@supabase/supabase-js';
import { BookGrid } from '@/components/books';

export const revalidate = 0; // Turn off automatic revalidation
export const dynamic = 'force-static';

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function Home() {
  const { data: books } = await supabase
    .from('books')
    .select(`
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
    source_link: book.recommendations?.[0]?.source_link || '',
    website_url: book.recommendations?.[0]?.recommender?.website_url || '',
    twitter_url: book.recommendations?.[0]?.recommender?.twitter_url || '',
    wiki_url: book.recommendations?.[0]?.recommender?.wiki_url || ''
  }));

  return (
    <div className="min-h-screen m-2 border border-black dark:border-white">
      <BookGrid data={formattedBooks} />
    </div>
  );
}
