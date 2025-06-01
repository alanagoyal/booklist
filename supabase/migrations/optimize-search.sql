-- Optimized search functions for better performance

-- Drop existing functions to replace with optimized versions
DROP FUNCTION IF EXISTS public.hybrid_search_books(text, vector);
DROP FUNCTION IF EXISTS public.hybrid_search_books(text, vector, double precision);
DROP FUNCTION IF EXISTS public.hybrid_search_people(text, vector);
DROP FUNCTION IF EXISTS public.hybrid_search_people(text, vector, double precision);

-- Optimized hybrid search for books with balanced limits for good UX
CREATE OR REPLACE FUNCTION public.hybrid_search_books(
  query_input text, 
  embedding_input vector, 
  min_similarity double precision DEFAULT 0.75
)
RETURNS TABLE(
  id uuid, 
  title text, 
  author text, 
  description text, 
  genre text[], 
  similarity_score double precision
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH 
  -- First, try exact matches (very fast)
  exact_matches AS (
    SELECT 
      b.id,
      b.title,
      b.author,
      b.description,
      b.genre,
      1.1 as similarity_score
    FROM books b
    WHERE 
      b.title ILIKE '%' || query_input || '%'
      OR b.author ILIKE '%' || query_input || '%'
      OR b.description ILIKE '%' || query_input || '%'
      OR query_input ILIKE ANY(b.genre)
    LIMIT 50  -- Good balance: enough for variety, fast to execute
  ),
  -- If we have exact matches, we might skip semantic search
  exact_count AS (
    SELECT COUNT(*) as cnt FROM exact_matches
  ),
  -- Only do semantic search if we need more results
  semantic_matches AS (
    SELECT 
      b.id,
      b.title,
      b.author,
      b.description,
      b.genre,
      1 - (b.description_embedding <=> embedding_input) as similarity_score
    FROM books b
    WHERE 
      -- Skip if we already have plenty of exact matches
      (SELECT cnt FROM exact_count) < 25
      -- Use the index efficiently with a distance threshold
      AND b.description_embedding <=> embedding_input < (1 - min_similarity)
    ORDER BY b.description_embedding <=> embedding_input
    LIMIT 75  -- Generous semantic results for discovery
  )
  -- Combine and deduplicate results
  SELECT DISTINCT ON (combined.id)
    combined.id,
    combined.title,
    combined.author,
    combined.description,
    combined.genre,
    combined.similarity_score
  FROM (
    SELECT * FROM exact_matches
    UNION ALL
    SELECT * FROM semantic_matches
  ) combined
  WHERE combined.similarity_score >= min_similarity
  ORDER BY combined.id, combined.similarity_score DESC
  LIMIT 100;  -- Final limit: plenty for scrolling, still performant
END;
$function$;

-- Optimized hybrid search for people with balanced limits
CREATE OR REPLACE FUNCTION public.hybrid_search_people(
  query_input text, 
  embedding_input vector, 
  min_similarity double precision DEFAULT 0.75
)
RETURNS TABLE(
  id uuid, 
  full_name text, 
  type text, 
  description text, 
  url text, 
  similarity_score double precision
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH 
  -- First, try exact matches (very fast)
  exact_matches AS (
    SELECT 
      p.id,
      p.full_name,
      p.type,
      p.description,
      p.url,
      1.1 as similarity_score
    FROM people p
    WHERE 
      p.full_name ILIKE '%' || query_input || '%'
      OR p.type ILIKE '%' || query_input || '%'
      OR p.description ILIKE '%' || query_input || '%'
    LIMIT 50  -- Good balance for people search
  ),
  -- If we have exact matches, we might skip semantic search
  exact_count AS (
    SELECT COUNT(*) as cnt FROM exact_matches
  ),
  -- Only do semantic search if we need more results
  semantic_matches AS (
    SELECT 
      p.id,
      p.full_name,
      p.type,
      p.description,
      p.url,
      1 - (p.description_embedding <=> embedding_input) as similarity_score
    FROM people p
    WHERE 
      -- Skip if we already have plenty of exact matches
      (SELECT cnt FROM exact_count) < 25
      -- Use the index efficiently with a distance threshold
      AND p.description_embedding IS NOT NULL
      AND p.description_embedding <=> embedding_input < (1 - min_similarity)
    ORDER BY p.description_embedding <=> embedding_input
    LIMIT 75  -- Generous semantic results
  )
  -- Combine and deduplicate results
  SELECT DISTINCT ON (combined.id)
    combined.id,
    combined.full_name,
    combined.type,
    combined.description,
    combined.url,
    combined.similarity_score
  FROM (
    SELECT * FROM exact_matches
    UNION ALL
    SELECT * FROM semantic_matches
  ) combined
  WHERE combined.similarity_score >= min_similarity
  ORDER BY combined.id, combined.similarity_score DESC
  LIMIT 100;  -- Final limit: plenty for scrolling
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

-- Add compound indexes for text search performance
CREATE INDEX IF NOT EXISTS idx_books_title_lower ON public.books(LOWER(title));
CREATE INDEX IF NOT EXISTS idx_books_author_lower ON public.books(LOWER(author));
CREATE INDEX IF NOT EXISTS idx_people_fullname_lower ON public.people(LOWER(full_name));

-- Add partial indexes for common queries
CREATE INDEX IF NOT EXISTS idx_books_with_description ON public.books(id) 
WHERE description IS NOT NULL AND description != '';

CREATE INDEX IF NOT EXISTS idx_people_with_description ON public.people(id) 
WHERE description IS NOT NULL AND description != '';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.search_embeddings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cached_embedding TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clean_search_cache TO service_role;
