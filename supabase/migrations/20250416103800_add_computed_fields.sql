-- Add computed fields to improve performance by avoiding client-side calculations
-- This migration adds fields to store recommendation counts and top recommenders

-- First, create a function to update the computed fields
CREATE OR REPLACE FUNCTION update_book_computed_fields()
RETURNS TRIGGER AS $$
DECLARE
  max_recommendations INTEGER;
  recommender_counts JSONB;
  book_rec_count INTEGER;
  book_percentile INTEGER;
  book_top_recommenders JSONB;
BEGIN
  -- Get the maximum number of recommendations for any book (for percentile calculation)
  SELECT MAX(recommendation_count) INTO max_recommendations
  FROM (
    SELECT COUNT(*) as recommendation_count
    FROM recommendations
    GROUP BY book_id
  ) counts;

  -- Calculate recommender counts across all books
  SELECT jsonb_object_agg(person_id::text, count)
  INTO recommender_counts
  FROM (
    SELECT person_id, COUNT(*) as count
    FROM recommendations
    GROUP BY person_id
  ) counts;

  -- Get recommendation count for this book
  SELECT COUNT(*) INTO book_rec_count
  FROM recommendations
  WHERE book_id = NEW.book_id;
  
  -- Calculate percentile
  IF max_recommendations > 0 THEN
    book_percentile := ROUND((book_rec_count::numeric / max_recommendations) * 100);
  ELSE
    book_percentile := 0;
  END IF;
  
  -- Get top recommenders
  SELECT COALESCE(jsonb_agg(json_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'recommendation_count', (recommender_counts->p.id::text)::integer
  ) ORDER BY (recommender_counts->p.id::text)::integer DESC), '[]'::jsonb)
  INTO book_top_recommenders
  FROM (
    SELECT DISTINCT p.id, p.full_name
    FROM recommendations r
    JOIN people p ON r.person_id = p.id
    WHERE r.book_id = NEW.book_id
  ) p;

  -- Update the book with computed fields
  UPDATE books
  SET 
    recommendation_count = book_rec_count,
    recommendation_percentile = book_percentile,
    top_recommenders = book_top_recommenders
  WHERE id = NEW.book_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add the new columns to the books table
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS recommendation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS recommendation_percentile INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS top_recommenders JSONB DEFAULT '[]'::jsonb;

-- Create triggers to update the computed fields
DROP TRIGGER IF EXISTS update_book_computed_fields_on_recommendation_insert ON recommendations;
CREATE TRIGGER update_book_computed_fields_on_recommendation_insert
AFTER INSERT ON recommendations
FOR EACH ROW
EXECUTE FUNCTION update_book_computed_fields();

DROP TRIGGER IF EXISTS update_book_computed_fields_on_recommendation_delete ON recommendations;
CREATE TRIGGER update_book_computed_fields_on_recommendation_delete
AFTER DELETE ON recommendations
FOR EACH ROW
EXECUTE FUNCTION update_book_computed_fields();

-- Create a function to recalculate all books' computed fields
CREATE OR REPLACE FUNCTION recalculate_all_book_computed_fields()
RETURNS void AS $$
DECLARE
  max_recommendations INTEGER;
  recommender_counts JSONB;
  book_record RECORD;
BEGIN
  -- Get the maximum number of recommendations for any book
  SELECT MAX(recommendation_count) INTO max_recommendations
  FROM (
    SELECT COUNT(*) as recommendation_count
    FROM recommendations
    GROUP BY book_id
  ) counts;

  -- Calculate recommender counts across all books
  SELECT jsonb_object_agg(person_id::text, count)
  INTO recommender_counts
  FROM (
    SELECT person_id, COUNT(*) as count
    FROM recommendations
    GROUP BY person_id
  ) counts;

  -- Update each book
  FOR book_record IN SELECT id FROM books LOOP
    -- First get the recommendation count for this book
    DECLARE
      book_rec_count INTEGER;
      book_percentile INTEGER;
      book_top_recommenders JSONB;
    BEGIN
      -- Get recommendation count
      SELECT COUNT(*) INTO book_rec_count
      FROM recommendations
      WHERE book_id = book_record.id;
      
      -- Calculate percentile
      IF max_recommendations > 0 THEN
        book_percentile := ROUND((book_rec_count::numeric / max_recommendations) * 100);
      ELSE
        book_percentile := 0;
      END IF;
      
      -- Get top recommenders
      SELECT COALESCE(jsonb_agg(json_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'recommendation_count', (recommender_counts->p.id::text)::integer
      ) ORDER BY (recommender_counts->p.id::text)::integer DESC), '[]'::jsonb)
      INTO book_top_recommenders
      FROM (
        SELECT DISTINCT p.id, p.full_name
        FROM recommendations r
        JOIN people p ON r.person_id = p.id
        WHERE r.book_id = book_record.id
      ) p;
      
      -- Update the book
      UPDATE books
      SET 
        recommendation_count = book_rec_count,
        recommendation_percentile = book_percentile,
        top_recommenders = book_top_recommenders
      WHERE id = book_record.id;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the function to populate the computed fields for existing data
SELECT recalculate_all_book_computed_fields();

-- Update the get_books_by_recommendation_count function to include the new computed fields
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
  related_books json,
  recommendation_count integer,
  recommendation_percentile integer,
  top_recommenders jsonb
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
      books.recommendation_count,
      books.recommendation_percentile,
      books.top_recommenders,
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
      ) as recommendations
    FROM books
    LEFT JOIN recommendations ON books.id = recommendations.book_id
    LEFT JOIN people ON recommendations.person_id = people.id
    GROUP BY books.id
    -- Use the precomputed recommendation_count for ordering
    ORDER BY books.recommendation_count DESC
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
    COALESCE(rbr.related_books, '[]'::json) as related_books,
    br.recommendation_count,
    br.recommendation_percentile,
    br.top_recommenders
  FROM book_recommendations_materialized br
  LEFT JOIN related_books_by_recommenders rbr ON rbr.book_id = br.id
  ORDER BY br.recommendation_count DESC;
END;
$$;
