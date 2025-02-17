import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseKey) {
  throw new Error('Missing SUPABASE_KEY environment variable');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ books });
}
