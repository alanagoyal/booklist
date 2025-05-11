import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase client
const supabase = createClient();

// Smart fallback search with adjustable thresholds
async function hybridSearchWithFallback(
  query: string, 
  embedding: number[], 
  viewMode: 'books' | 'people' = 'books',
  threshold = 0.8 // single threshold
) {
  const rpcName = viewMode === 'people' ? 'hybrid_search_people' : 'hybrid_search_books';
  
  console.log(`Searching with threshold ${threshold}...`);
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
    console.log(`Found ${data.length} results`);
    return data;
  }

  // Nothing found
  return [];
}

// api route
export async function POST(req: NextRequest) {
  try {
    console.log('Search API called');
    const { query, embedding, viewMode } = await req.json();
    console.log('Request params:', { query, viewMode, embeddingReceived: !!embedding });

    if (!query || typeof query !== 'string') {
      console.log('Invalid query:', query);
      return NextResponse.json({ error: 'Missing or invalid query' }, { status: 400 });
    }

    if (!embedding || !Array.isArray(embedding)) {
      console.log('Invalid embedding:', embedding);
      return NextResponse.json({ error: 'Missing or invalid embedding' }, { status: 400 });
    }

    // 1. Use the client-provided embedding directly
    console.log('Using client-provided embedding of length:', embedding.length);

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
