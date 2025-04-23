DROP FUNCTION IF EXISTS get_books_by_recommendation_count();
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
  _recommendation_count int,
  _percentile float,
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
      COUNT(DISTINCT r.person_id)::int as recommendation_count,
      json_agg(
        json_build_object(
          'recommender', (
            SELECT json_build_object(
              'id', p.id,
              'full_name', p.full_name,
              'url', p.url,
              'type', p.type
            )
            FROM people p
            WHERE p.id = r.person_id
          ),
          'source', r.source,
          'source_link', r.source_link
        )
      ) as recommendations
    FROM books
    LEFT JOIN recommendations r ON books.id = r.book_id
    GROUP BY books.id, books.title, books.author, books.description, books.genre, books.amazon_url
  ),
  book_stats AS (
    SELECT 
      book_recommendations.id,
      book_recommendations.recommendation_count,
      NTILE(100) OVER (ORDER BY book_recommendations.recommendation_count) as percentile
    FROM book_recommendations
  ),
  related_books_data AS (
    SELECT 
      br.id as book_id,
      json_agg(
        json_build_object(
          'id', rb.id,
          'title', rb.title,
          'author', rb.author,
          'description', rb.description,
          'amazon_url', rb.amazon_url,
          '_recommendationCount', rb_count.count::int
        )
        ORDER BY rb_count.count DESC
      ) as related_books
    FROM book_recommendations br
    JOIN recommendations r1 ON br.id = r1.book_id
    JOIN recommendations r2 ON r1.person_id = r2.person_id
    JOIN books rb ON r2.book_id = rb.id
    JOIN (
      SELECT book_id, COUNT(DISTINCT person_id) as count
      FROM recommendations
      GROUP BY book_id
    ) rb_count ON rb.id = rb_count.book_id
    WHERE rb.id != br.id
    GROUP BY br.id
    HAVING COUNT(DISTINCT rb.id) > 0
  )
  SELECT 
    br.id,
    br.title,
    br.author,
    br.description,
    br.genre,
    br.amazon_url,
    br.recommendations,
    bs.recommendation_count as _recommendation_count,
    bs.percentile::float as _percentile,
    COALESCE(rbd.related_books, '[]'::json) as related_books
  FROM book_recommendations br
  JOIN book_stats bs ON br.id = bs.id
  LEFT JOIN related_books_data rbd ON br.id = rbd.book_id
  ORDER BY bs.recommendation_count DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
