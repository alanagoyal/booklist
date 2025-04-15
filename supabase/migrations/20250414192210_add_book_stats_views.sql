-- Create materialized view for book statistics
CREATE MATERIALIZED VIEW book_stats AS
SELECT 
    b.id as book_id,
    COUNT(r.id)::integer as recommendation_count,
    ROUND(
        (COUNT(r.id)::float / (
            SELECT MAX(cnt)::float 
            FROM (
                SELECT COUNT(*) as cnt 
                FROM recommendations 
                GROUP BY book_id
            ) counts
        ) * 100)::numeric
    )::integer as percentile
FROM books b
LEFT JOIN recommendations r ON b.id = r.book_id
GROUP BY b.id;

-- Create index for fast lookups
CREATE UNIQUE INDEX book_stats_book_id_idx ON book_stats(book_id);

-- Create materialized view for top recommenders per book
CREATE MATERIALIZED VIEW book_top_recommenders AS
WITH recommender_total_counts AS (
    SELECT 
        person_id,
        COUNT(*)::integer as total_recommendations
    FROM recommendations
    GROUP BY person_id
),
ranked_recommenders AS (
    SELECT 
        r.book_id,
        r.person_id,
        p.full_name,
        rtc.total_recommendations,
        ROW_NUMBER() OVER (
            PARTITION BY r.book_id 
            ORDER BY rtc.total_recommendations DESC
        ) as rank
    FROM recommendations r
    JOIN people p ON r.person_id = p.id
    JOIN recommender_total_counts rtc ON r.person_id = rtc.person_id
)
SELECT 
    book_id,
    person_id,
    full_name,
    total_recommendations
FROM ranked_recommenders
WHERE rank <= 5;

-- Create index for fast lookups
CREATE UNIQUE INDEX book_top_recommenders_idx ON book_top_recommenders(book_id, person_id);

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_book_stats()
RETURNS trigger AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY book_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY book_top_recommenders;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh views when recommendations change
CREATE TRIGGER refresh_book_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON recommendations
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_book_stats();

-- Initial refresh of materialized views
REFRESH MATERIALIZED VIEW book_stats;
REFRESH MATERIALIZED VIEW book_top_recommenders;
