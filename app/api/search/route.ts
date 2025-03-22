import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

interface SearchMatch {
  id: string;
  similarity: number;
}

interface DbBookRecommendation {
  source: string;
  source_link: string | null;
  recommender: {
    full_name: string;
    url: string | null;
  };
}

interface DbBook {
  id: string;
  title: string | null;
  author: string | null;
  description: string | null;
  genre: string[] | null;
  amazon_url: string | null;
  recommendations: DbBookRecommendation[] | null;
}

interface FormattedBook {
  id: string;
  title: string;
  author: string;
  description: string;
  genres: string;
  recommenders: string;
  source: string;
  source_link: string;
  url: string;
  amazon_url: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function createSearchEmbedding(query: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: query,
  });
  return response.data[0].embedding;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;
    
    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    console.log('Search query:', query);
    const searchEmbedding = await createSearchEmbedding(query);
    
    // Search for semantically relevant books using weighted similarity
    const { data: matches, error: matchError } = await supabase.rpc(
      'match_documents_weighted',
      {
        query_embedding: searchEmbedding,
        similarity_threshold: 0.3,  // Return results with at least 30% similarity
        match_count: 20 // Limit to top 20 most relevant results
      }
    ) as { data: SearchMatch[] | null; error: any };

    if (matchError) {
      console.error('Error searching books:', matchError);
      return NextResponse.json({ error: matchError.message }, { status: 500 });
    }

    if (!matches || matches.length === 0) {
      console.log('No semantically relevant matches found');
      return NextResponse.json({ books: [] });
    }

    // Fetch full book details for the matched IDs
    const { data: books, error: detailsError } = await supabase
      .from("books")
      .select(`
        id,
        title,
        author,
        description,
        genre,
        amazon_url,
        recommendations (
          source,
          source_link,
          recommender:people (
            full_name,
            url
          )
        )
      `)
      .in('id', matches.map(m => m.id))
      .order('id', { ascending: false }) as { data: DbBook[] | null; error: any };

    if (detailsError) {
      console.error('Error fetching book details:', detailsError);
      return NextResponse.json({ error: detailsError.message }, { status: 500 });
    }

    if (!books || books.length === 0) {
      return NextResponse.json({ books: [] });
    }

    // Create a map of similarity scores for sorting
    const similarityMap = new Map(matches.map(m => [m.id, m.similarity]));

    // Format and sort books by similarity score
    const formattedBooks = (books as DbBook[])
      .map((book: DbBook): FormattedBook => ({
        id: book.id,
        title: book.title || '',
        author: book.author || '',
        description: book.description || '',
        genres: (book.genre || []).join(', '),
        recommenders: book.recommendations?.map(r => r.recommender.full_name).join(', ') || '',
        source: book.recommendations?.[0]?.source || '',
        source_link: book.recommendations?.[0]?.source_link || '',
        url: book.recommendations?.[0]?.recommender?.url || '',
        amazon_url: book.amazon_url || ''
      }))
      .sort((a, b) => (similarityMap.get(b.id) || 0) - (similarityMap.get(a.id) || 0));

    return NextResponse.json({ books: formattedBooks });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
