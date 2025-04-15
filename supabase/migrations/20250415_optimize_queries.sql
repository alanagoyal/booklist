-- Optimized version of get_books_by_recommendation_count with pagination
DROP FUNCTION IF EXISTS get_books_by_recommendation_count();
create or replace function get_books_by_recommendation_count(
  p_limit int default 100,
  p_offset int default 0
)
returns table (
  id uuid,
  title text,
  author text,
  description text,
  genre text[],
  amazon_url text,
  recommendations json,
  related_books json
)
language plpgsql
volatile
as $$
BEGIN
  RETURN QUERY
  WITH book_recommendations AS (
    SELECT 
      books.id,
      books.title,
      books.author,
      books.description,
      books.genre,
      books.amazon_url,
      COALESCE(
        json_agg(
          json_build_object(
            'recommender', json_build_object(
              'id', people.id,
              'full_name', people.full_name,
              'url', people.url,
              'type', people.type
            ),
            'source', recommendations.source,
            'source_link', recommendations.source_link
          )
        ) FILTER (WHERE people.id IS NOT NULL),
        '[]'::json
      ) as recommendations,
      COUNT(DISTINCT recommendations.id) as recommendation_count
    FROM books
    LEFT JOIN recommendations ON books.id = recommendations.book_id
    LEFT JOIN people ON recommendations.person_id = people.id
    GROUP BY books.id
    -- Pre-filter to improve performance
    ORDER BY COUNT(DISTINCT recommendations.id) DESC
    -- Apply limit and offset at this stage to reduce the dataset for related books calculation
    LIMIT p_limit OFFSET p_offset
  ),
  -- Materialize the book_recommendations CTE to improve performance
  book_recommendations_materialized AS (
    SELECT * FROM book_recommendations
  ),
  related_book_recommenders AS (
    SELECT 
      br.id as book_id,
      rb.id as related_book_id,
      rb.title as related_book_title,
      rb.author as related_book_author,
      string_agg(DISTINCT p2.full_name, ', ') as recommenders,
      COUNT(DISTINCT r2.id) as recommender_count
    FROM book_recommendations_materialized br
    -- Get recommendations for the current book
    JOIN recommendations r1 ON r1.book_id = br.id
    -- Find other books recommended by the same people
    JOIN recommendations r2 ON r2.person_id = r1.person_id AND r2.book_id != br.id
    -- Join to get book details
    JOIN books rb ON rb.id = r2.book_id
    -- Join to get recommender details
    JOIN people p2 ON r2.person_id = p2.id
    GROUP BY br.id, rb.id, rb.title, rb.author
    -- Limit to books with at least 2 shared recommendations
    HAVING COUNT(DISTINCT r2.id) >= 2
  ),
  related_books_by_recommenders AS (
    SELECT 
      book_id,
      (
        SELECT json_agg(
          json_build_object(
            'id', related_book_id,
            'title', related_book_title,
            'author', related_book_author,
            'recommenders', recommenders,
            'recommender_count', recommender_count
          )
        )
        FROM (
          SELECT *
          FROM related_book_recommenders rbr2
          WHERE rbr2.book_id = related_book_recommenders.book_id
          ORDER BY recommender_count DESC
          LIMIT 3  -- Further limit to top 3 related books for better performance
        ) t
      ) as related_books
    FROM related_book_recommenders
    GROUP BY book_id
  )
  SELECT
    br.id,
    br.title,
    br.author,
    br.description,
    br.genre,
    br.amazon_url,
    br.recommendations,
    COALESCE(rbr.related_books, '[]'::json) as related_books
  FROM book_recommendations_materialized br
  LEFT JOIN related_books_by_recommenders rbr ON rbr.book_id = br.id
  ORDER BY br.recommendation_count DESC;
END;
$$;

-- Also optimize the get_recommender_details function
CREATE OR REPLACE FUNCTION get_recommender_details(p_recommender_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  url TEXT,
  type TEXT,
  recommendations JSON,
  related_recommenders JSON
)
LANGUAGE plpgsql
volatile
AS $$
BEGIN
  RETURN QUERY
  WITH recommender_books AS (
    SELECT 
      b.id,
      b.title,
      b.author,
      b.description,
      b.genre,
      b.amazon_url,
      r.source,
      r.source_link
    FROM recommendations r
    JOIN books b ON r.book_id = b.id
    WHERE r.person_id = p_recommender_id
  ),
  related_recommenders_data AS (
    SELECT 
      p2.id,
      p2.full_name,
      p2.url,
      p2.type,
      string_agg(DISTINCT b.title, ', ') as shared_books,
      COUNT(DISTINCT r2.book_id) as shared_count
    FROM recommendations r1
    JOIN recommendations r2 ON r1.book_id = r2.book_id AND r1.person_id != r2.person_id
    JOIN people p2 ON r2.person_id = p2.id
    JOIN books b ON r1.book_id = b.id
    WHERE r1.person_id = p_recommender_id
    GROUP BY p2.id, p2.full_name, p2.url, p2.type
    HAVING COUNT(DISTINCT r2.book_id) >= 2
    ORDER BY COUNT(DISTINCT r2.book_id) DESC
    LIMIT 5
  )
  SELECT 
    p.id,
    p.full_name,
    p.url,
    p.type,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', rb.id,
            'title', rb.title,
            'author', rb.author,
            'description', rb.description,
            'genre', rb.genre,
            'amazon_url', rb.amazon_url,
            'source', rb.source,
            'source_link', rb.source_link
          )
        )
        FROM recommender_books rb
      ),
      '[]'::json
    ) as recommendations,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', rr.id,
            'full_name', rr.full_name,
            'url', rr.url,
            'type', rr.type,
            'shared_books', rr.shared_books,
            'shared_count', rr.shared_count
          )
        )
        FROM related_recommenders_data rr
      ),
      '[]'::json
    ) as related_recommenders
  FROM people p
  WHERE p.id = p_recommender_id;
END;
$$;

-- Create a new function to get just the count of books
DROP FUNCTION IF EXISTS get_books_count();
CREATE OR REPLACE FUNCTION get_books_count()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  book_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO book_count FROM books;
  RETURN book_count;
END;
$$;
