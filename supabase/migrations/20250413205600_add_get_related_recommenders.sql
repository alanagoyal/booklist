-- Drop existing function
DROP FUNCTION IF EXISTS get_related_recommenders(uuid, int);

-- Recreate function with TEXT instead of enum
CREATE OR REPLACE FUNCTION get_related_recommenders(p_recommender_id UUID, p_limit INT DEFAULT 3)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  url TEXT,
  type TEXT,
  shared_books TEXT,
  shared_count BIGINT
) SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH recommender_books AS (
    SELECT book_id
    FROM recommendations
    WHERE person_id = p_recommender_id
  ),
  similar_recommenders AS (
    SELECT 
      r.person_id,
      COUNT(*) AS shared_count,
      STRING_AGG(b.title, ', ' ORDER BY b.title) AS shared_books
    FROM recommendations r
    JOIN books b ON b.id = r.book_id
    WHERE r.book_id IN (SELECT book_id FROM recommender_books)
      AND r.person_id != p_recommender_id
    GROUP BY r.person_id
    ORDER BY shared_count DESC
    LIMIT p_limit
  )
  SELECT 
    p.id,
    p.full_name,
    p.url,
    p.type,
    sr.shared_books,
    sr.shared_count
  FROM similar_recommenders sr
  JOIN people p ON p.id = sr.person_id
  ORDER BY sr.shared_count DESC;
END;
$$;
