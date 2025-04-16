-- Rollback the computed fields migration

-- First, drop the triggers
DROP TRIGGER IF EXISTS update_book_computed_fields_on_recommendation_insert ON recommendations;
DROP TRIGGER IF EXISTS update_book_computed_fields_on_recommendation_delete ON recommendations;

-- Drop the functions
DROP FUNCTION IF EXISTS update_book_computed_fields();
DROP FUNCTION IF EXISTS recalculate_all_book_computed_fields();

-- Restore the original get_books_by_recommendation_count function
DROP FUNCTION IF EXISTS get_books_by_recommendation_count(int, int);
CREATE OR REPLACE FUNCTION get_books_by_recommendation_count(
  p_limit int default 1000,
  p_offset int default 0
)
RETURNS TABLE (
  id uuid,
  title text,
  author text,
  description text,
  genre text[],
  amazon_url text,
  recommendations json,
  related_books json
)
LANGUAGE plpgsql
VOLATILE
AS $$
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

-- Remove the columns from the books table
ALTER TABLE books 
DROP COLUMN IF EXISTS recommendation_count,
DROP COLUMN IF EXISTS recommendation_percentile,
DROP COLUMN IF EXISTS top_recommenders;
