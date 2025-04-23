-- Drop existing function
DROP FUNCTION IF EXISTS get_books_by_recommendation_count();
DROP FUNCTION IF EXISTS get_books_with_counts();
DROP FUNCTION IF EXISTS get_book_recommendations();
DROP FUNCTION IF EXISTS get_related_books();

-- 1. Basic book data with counts and percentiles
CREATE OR REPLACE FUNCTION get_books_with_counts(
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
  _recommendation_count int,
  _percentile float
)
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  RETURN QUERY
  WITH book_counts AS (
    SELECT 
      books.id,
      books.title,
      books.author,
      books.description,
      books.genre,
      books.amazon_url,
      COUNT(DISTINCT r.person_id)::int as recommendation_count
    FROM books
    LEFT JOIN recommendations r ON books.id = r.book_id
    GROUP BY books.id, books.title, books.author, books.description, books.genre, books.amazon_url
  )
  SELECT 
    bc.id,
    bc.title,
    bc.author,
    bc.description,
    bc.genre,
    bc.amazon_url,
    bc.recommendation_count,
    NTILE(100) OVER (ORDER BY bc.recommendation_count)::float as percentile
  FROM book_counts bc
  ORDER BY bc.recommendation_count DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 2. Get recommendations for specific books
CREATE OR REPLACE FUNCTION get_book_recommendations(book_ids uuid[])
RETURNS json
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  RETURN (
    SELECT json_object_agg(
      book_id,
      recommendations
    )
    FROM (
      SELECT 
        r.book_id,
        json_agg(
          json_build_object(
            'recommender', json_build_object(
              'id', p.id,
              'full_name', p.full_name,
              'url', p.url,
              'type', p.type
            ),
            'source', r.source,
            'source_link', r.source_link
          )
        ) as recommendations
      FROM recommendations r
      JOIN people p ON r.person_id = p.id
      WHERE r.book_id = ANY(book_ids)
      GROUP BY r.book_id
    ) book_recommendations
  );
END;
$$;

-- 3. Get related books
CREATE OR REPLACE FUNCTION get_related_books(
  book_ids uuid[],
  p_limit int default 3
)
RETURNS json
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  RETURN (
    SELECT json_object_agg(
      book_id,
      related_books
    )
    FROM (
      SELECT 
        book_id,
        json_agg(
          json_build_object(
            'id', id,
            'title', title,
            'author', author,
            'description', description,
            'amazon_url', amazon_url,
            '_recommendationCount', recommendation_count
          )
        ) as related_books
      FROM (
        SELECT 
          br.book_id,
          rb.id,
          rb.title,
          rb.author,
          rb.description,
          rb.amazon_url,
          rb.recommendation_count,
          row_number() OVER (PARTITION BY br.book_id ORDER BY br.shared_recommenders DESC) as rn
        FROM (
          SELECT 
            r1.book_id,
            r2.book_id as related_id,
            COUNT(DISTINCT r2.person_id) as shared_recommenders
          FROM recommendations r1
          JOIN recommendations r2 ON r1.person_id = r2.person_id
          WHERE r1.book_id = ANY(book_ids)
          AND r1.book_id != r2.book_id
          GROUP BY r1.book_id, r2.book_id
        ) br
        JOIN (
          SELECT 
            b.id,
            b.title,
            b.author,
            b.description,
            b.amazon_url,
            COUNT(DISTINCT r.person_id)::int as recommendation_count
          FROM books b
          LEFT JOIN recommendations r ON b.id = r.book_id
          GROUP BY b.id
        ) rb ON br.related_id = rb.id
      ) ranked
      WHERE rn <= p_limit
      GROUP BY book_id
    ) book_related
  );
END;
$$;
