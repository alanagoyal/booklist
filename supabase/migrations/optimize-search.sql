-- Optimized search functions for better performance

-- Drop existing functions to replace with optimized versions
DROP FUNCTION IF EXISTS public.hybrid_search_books(text, vector);
DROP FUNCTION IF EXISTS public.hybrid_search_books(text, vector, double precision);
DROP FUNCTION IF EXISTS public.hybrid_search_people(text, vector);
DROP FUNCTION IF EXISTS public.hybrid_search_people(text, vector, double precision);

-- Simple semantic search for books
CREATE OR REPLACE FUNCTION public.semantic_search_books(
  embedding_input vector, 
  match_count int DEFAULT 500,
  min_similarity float DEFAULT 0.8
)
RETURNS TABLE(
  id uuid, 
  title text, 
  author text, 
  description text, 
  genre text[], 
  similarity double precision
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.author,
    b.description,
    b.genre,
    1 - (b.description_embedding <=> embedding_input) as similarity
  FROM books b
  WHERE b.description_embedding IS NOT NULL
    AND 1 - (b.description_embedding <=> embedding_input) >= min_similarity
  ORDER BY b.description_embedding <=> embedding_input
  LIMIT match_count;
END;
$function$;

-- Simple semantic search for people
CREATE OR REPLACE FUNCTION public.semantic_search_people(
  embedding_input vector, 
  match_count int DEFAULT 500,
  min_similarity float DEFAULT 0.8
)
RETURNS TABLE(
  id uuid, 
  full_name text, 
  type text, 
  description text, 
  url text, 
  similarity double precision
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.type,
    p.description,
    p.url,
    1 - (p.description_embedding <=> embedding_input) as similarity
  FROM people p
  WHERE p.description_embedding IS NOT NULL
    AND 1 - (p.description_embedding <=> embedding_input) >= min_similarity
  ORDER BY p.description_embedding <=> embedding_input
  LIMIT match_count;
END;
$function$;

-- Create a table for caching search embeddings
CREATE TABLE IF NOT EXISTS public.search_embeddings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query_text text NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_used_at timestamp with time zone DEFAULT now(),
  use_count integer DEFAULT 1
);

-- Create indexes for the cache table
CREATE INDEX IF NOT EXISTS idx_search_embeddings_query ON public.search_embeddings USING hash(query_text);
CREATE INDEX IF NOT EXISTS idx_search_embeddings_created ON public.search_embeddings(created_at);

-- Function to get or create embedding cache
CREATE OR REPLACE FUNCTION public.get_cached_embedding(query_text text)
RETURNS vector
LANGUAGE plpgsql
AS $function$
DECLARE
  cached_embedding vector;
BEGIN
  -- Try to get from cache
  SELECT embedding INTO cached_embedding
  FROM search_embeddings
  WHERE search_embeddings.query_text = get_cached_embedding.query_text
  LIMIT 1;
  
  -- Update usage stats if found
  IF cached_embedding IS NOT NULL THEN
    UPDATE search_embeddings
    SET 
      last_used_at = now(),
      use_count = use_count + 1
    WHERE search_embeddings.query_text = get_cached_embedding.query_text;
  END IF;
  
  RETURN cached_embedding;
END;
$function$;

-- Function to clean old cache entries
CREATE OR REPLACE FUNCTION public.clean_search_cache()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Delete entries older than 30 days that haven't been used recently
  DELETE FROM search_embeddings
  WHERE created_at < now() - interval '30 days'
    AND last_used_at < now() - interval '7 days'
    AND use_count < 5;
END;
$function$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.search_embeddings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cached_embedding TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clean_search_cache TO service_role;
