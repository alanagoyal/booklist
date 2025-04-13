-- Drop existing functions
DROP FUNCTION IF EXISTS get_related_books(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_books_by_shared_recommenders(UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_books_by_shared_recommenders(p_book_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  title TEXT,
  author TEXT,
  genres TEXT[],
  amazon_url TEXT,
  recommender_count INTEGER
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH book_recommenders AS (
    -- Get all people who recommended the input book
    SELECT DISTINCT r.person_id
    FROM recommendations r
    WHERE r.book_id = p_book_id
  ),
  related_books AS (
    -- Find other books recommended by these people
    SELECT 
      b.id,
      b.title,
      b.author,
      b.genre as genres,
      b.amazon_url,
      COUNT(DISTINCT r.person_id)::INTEGER as recommender_count
    FROM books b
    INNER JOIN recommendations r ON r.book_id = b.id
    WHERE r.person_id IN (SELECT person_id FROM book_recommenders)
    AND b.id != p_book_id
    GROUP BY b.id, b.title, b.author, b.genre, b.amazon_url
  )
  SELECT * FROM related_books
  ORDER BY recommender_count DESC, title ASC
  LIMIT p_limit;
END;
$$;
