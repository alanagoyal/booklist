-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_books_by_recommendation_count;

-- Create the updated function using materialized views
CREATE OR REPLACE FUNCTION get_books_by_recommendation_count()
RETURNS TABLE (
    id uuid,
    title text,
    author text,
    description text,
    genre text[],
    amazon_url text,
    recommendation_count integer,
    percentile integer,
    recommendations jsonb,
    top_recommenders jsonb,
    related_books jsonb
) AS $$
BEGIN
    RETURN QUERY
    WITH book_data AS (
        SELECT 
            b.*,
            COALESCE(bs.recommendation_count, 0)::integer as recommendation_count,
            COALESCE(bs.percentile, 0)::integer as percentile,
            COALESCE(
                (
                    SELECT jsonb_agg(jsonb_build_object(
                        'recommender', jsonb_build_object(
                            'id', p.id,
                            'full_name', p.full_name,
                            'url', p.url,
                            'type', p.type
                        ),
                        'source', r.source,
                        'source_link', r.source_link
                    ))
                    FROM recommendations r
                    LEFT JOIN people p ON r.person_id = p.id
                    WHERE r.book_id = b.id
                ),
                '[]'::jsonb
            ) as recommendations,
            COALESCE(
                (
                    SELECT jsonb_agg(jsonb_build_object(
                        'id', tr.person_id,
                        'full_name', tr.full_name,
                        'recommendationCount', tr.total_recommendations
                    ))
                    FROM book_top_recommenders tr
                    WHERE tr.book_id = b.id
                ),
                '[]'::jsonb
            ) as top_recommenders
        FROM books b
        LEFT JOIN book_stats bs ON b.id = bs.book_id
    )
    SELECT 
        bd.id,
        bd.title,
        bd.author,
        bd.description,
        bd.genre,
        bd.amazon_url,
        bd.recommendation_count,
        bd.percentile,
        bd.recommendations,
        bd.top_recommenders,
        '[]'::jsonb as related_books
    FROM book_data bd
    ORDER BY bd.recommendation_count DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;
