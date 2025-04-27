import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// initialize openai client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient();

// helper function to embed query
async function getQueryEmbedding(query: string) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });

  return response.data[0].embedding;
}

// smart fallback search with adjustable thresholds
async function hybridSearchWithFallback(
  query: string, 
  embedding: number[], 
  viewMode: 'books' | 'people' = 'books',
  thresholds = [0.85, 0.8, 0.78] // tighter thresholds only
) {
  const rpcName = viewMode === 'people' ? 'hybrid_search_people' : 'hybrid_search_books';
  
  for (const threshold of thresholds) {
    console.log(`Trying threshold ${threshold}...`);
    const { data, error } = await supabase.rpc(rpcName, {
      query_input: query,
      embedding_input: embedding,
      min_similarity: threshold,
    });

    if (error) {
      console.error('Supabase error:', error);
      throw new Error('Search failed');
    }

    if (data && data.length > 0) {
      console.log(`Found ${data.length} results at threshold ${threshold}`);
      return data;
    }

    console.log(`No results at threshold ${threshold}, relaxing...`);
  }

  // Nothing found even at the loosest threshold
  return [];
}

// api route
export async function POST(req: NextRequest) {
  try {
    console.log('Search API called');
    const { query, viewMode } = await req.json();
    console.log('Request params:', { query, viewMode });

    if (!query || typeof query !== 'string') {
      console.log('Invalid query:', query);
      return NextResponse.json({ error: 'Missing or invalid query' }, { status: 400 });
    }

    // 1. embed the query text
    console.log('Getting query embedding...');
    let embedding;
    try {
      embedding = await getQueryEmbedding(query);
      console.log('Got embedding of length:', embedding.length);
    } catch (err) {
      console.error('OpenAI embedding error:', err);
      return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 });
    }

    // 2. call the hybrid search with fallback
    console.log('Starting hybrid search with fallback...');
    try {
      const results = await hybridSearchWithFallback(
        query, 
        embedding, 
        viewMode === 'people' ? 'people' : 'books'
      );

      console.log('Search successful, found', results.length, 'results');
      return NextResponse.json(results);
    } catch (err) {
      console.error('Search error:', err);
      return NextResponse.json({ 
        error: 'Failed to search', 
        details: err instanceof Error ? err.message : String(err) 
      }, { status: 500 });
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
