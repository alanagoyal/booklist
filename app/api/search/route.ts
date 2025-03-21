import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

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

interface SearchResult {
  id: number;
  similarity: number;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request: Request) {
  console.log('Search API called with URL:', request.url);
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  console.log('Search query:', query);
  console.log('Environment variables present:', {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY
  });
  
  if (!query) {
    console.log('No query provided');
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    console.log('Generating embedding for query:', query);
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: query,
    });
    const embedding = embeddingResponse.data[0].embedding;
    console.log('Generated embedding length:', embedding.length);

    console.log('Calling Supabase search_books function');
    // Search books using the embedding
    const { data: searchResults, error: searchError } = await supabase.rpc(
      'search_books',
      {
        query_embedding: embedding,
        match_count: 50,
        similarity_threshold: 0.5
      }
    ) as { data: SearchResult[] | null; error: any };

    if (searchError) {
      console.error('Supabase search error:', searchError);
      return NextResponse.json({ error: searchError.message }, { status: 500 });
    }

    console.log('Search results count:', searchResults?.length ?? 0);
    let finalResults = searchResults || [];

    if (finalResults.length === 0) {
      console.log('No results found with similarity threshold 0.5, trying with lower threshold');
      const { data: fallbackResults, error: fallbackError } = await supabase.rpc(
        'search_books',
        {
          query_embedding: embedding,
          match_count: 50,
          similarity_threshold: 0.3
        }
      ) as { data: SearchResult[] | null; error: any };
      
      if (fallbackError) {
        console.error('Fallback search error:', fallbackError);
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }
      
      console.log('Fallback results count:', fallbackResults?.length ?? 0);
      finalResults = fallbackResults || [];
    }

    if (finalResults.length === 0) {
      return NextResponse.json({ books: [] });
    }

    // Fetch full book details including recommendations for the search results
    const { data: books, error: detailsError } = await supabase
      .from("books")
      .select(`
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
      .in('id', finalResults.map(r => r.id))
      .order('title', { ascending: true });

    if (detailsError) {
      console.error('Error fetching book details:', detailsError);
      return NextResponse.json({ error: detailsError.message }, { status: 500 });
    }

    // Format books to match the structure expected by the frontend
    const formattedBooks = (books as Book[]).map(book => {
      const recommendations = book.recommendations || [];
      return {
        id: book.id,
        title: book.title || '',
        author: book.author || '',
        description: book.description || '',
        genres: book.genre?.join(', ') || '',
        recommenders: recommendations.map(r => r.recommender.full_name).join(', '),
        source: recommendations.map(r => r.source).join(', '),
        source_link: recommendations.map(r => r.source_link).join(', '),
        url: recommendations.map(r => r.recommender.url).join(', '),
        amazon_url: book.amazon_url || ''
      };
    });

    return NextResponse.json({ books: formattedBooks });
  } catch (error: any) {
    console.error('Error in search:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
