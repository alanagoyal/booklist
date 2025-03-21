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

interface SearchMatch {
  id: string;
  similarity: number;
}

interface DbBook {
  id: string;
  title: string | null;
  author: string | null;
  description: string | null;
  genre: string[] | null;
  amazon_url: string | null;
  recommendations: {
    source: string;
    source_link: string | null;
    recommender: {
      full_name: string;
      url: string | null;
    };
  }[] | null;
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

    const searchEmbedding = await createSearchEmbedding(query);
    
    // Use weighted similarity for better search results
    const weights = {
      title_weight: 1.0,
      author_weight: 0.8,
      description_weight: 0.6
    };

    // First get the IDs of matching books with similarity scores
    const { data: matches, error: matchError } = await supabase.rpc(
      'match_documents_weighted',
      {
        query_embedding: searchEmbedding,
        ...weights,
        match_threshold: 0.5,
        match_count: 50
      }
    ) as { data: SearchMatch[] | null; error: any };

    if (matchError) {
      console.error('Error searching books:', matchError);
      return NextResponse.json({ error: matchError.message }, { status: 500 });
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({ books: [] });
    }

    // Then fetch full book details for the matched IDs
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
          recommender:people(
            full_name,
            url
          )
        )
      `)
      .in('id', matches.map((m: SearchMatch) => m.id))
      .order('id', { ascending: false }) as { data: DbBook[] | null; error: any };

    if (detailsError) {
      console.error('Error fetching book details:', detailsError);
      return NextResponse.json({ error: detailsError.message }, { status: 500 });
    }

    // Format books to match the frontend's FormattedBook interface
    const formattedBooks = (books || []).map((book: DbBook): FormattedBook => {
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

    // Limit the response size by truncating very long text fields
    const truncatedBooks = formattedBooks.map(book => ({
      ...book,
      description: book.description.length > 300 ? book.description.slice(0, 300) + '...' : book.description
    }));

    return NextResponse.json({ books: truncatedBooks });
  } catch (error) {
    console.error('Error in search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
