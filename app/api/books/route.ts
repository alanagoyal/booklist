import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseKey) {
  throw new Error('Missing SUPABASE_KEY environment variable');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to handle CORS
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre');
  const sort = searchParams.get('sort') || 'rating';
  const order = searchParams.get('order') || 'desc';
  
  let query = supabase
    .from('books')
    .select('*');
    
  if (genre) {
    query = query.contains('genre', [genre]);
  }
  
  const { data: books, error } = await query
    .order(sort, { ascending: order === 'asc' });
    
  if (error) {
    return NextResponse.json({ error: error.message }, { 
      status: 500,
      headers: corsHeaders()
    });
  }
  
  return NextResponse.json({ books }, { 
    headers: corsHeaders()
  });
}
