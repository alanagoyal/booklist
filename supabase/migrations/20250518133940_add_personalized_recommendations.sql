CREATE OR REPLACE FUNCTION public.get_personalized_recommendations(
    p_user_type text,
    p_genres text[],
    p_inspiration_ids uuid[],
    p_favorite_book_ids uuid[],
    p_limit integer DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    title text,
    author text,
    description text,
    score float,
    match_reasons jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
    debug_msg text;
BEGIN
    -- Debug logging
    RAISE NOTICE 'Input parameters: user_type=%, genres=%, inspiration_ids=%, favorite_book_ids=%', 
        p_user_type, p_genres, p_inspiration_ids, p_favorite_book_ids;

    RETURN QUERY
    WITH 
    -- Get books directly recommended by inspiration people
    inspiration_recs AS (
        SELECT 
            b.id as book_id,
            b.title,
            b.author,
            b.description,
            1.0 as score,
            true as from_inspiration
        FROM recommendations r
        JOIN books b ON r.book_id = b.id
        WHERE r.person_id = ANY(p_inspiration_ids)
    ),
    
    -- Get books recommended by similar people to inspirations
    similar_people_recs AS (
        SELECT 
            b.id as book_id,
            b.title,
            b.author,
            b.description,
            0.5 as score,
            true as from_similar_people
        FROM people p
        JOIN recommendations r ON r.person_id = p.id
        JOIN books b ON r.book_id = b.id
        WHERE EXISTS (
            SELECT 1
            FROM people p2
            WHERE p2.id = ANY(p_inspiration_ids)
            AND p2.type = p.type
            AND p2.id != p.id
            ORDER BY p2.description_embedding <=> p.description_embedding
            LIMIT 5
        )
    ),
    
    -- Get similar books to user's favorites
    similar_books AS (
        SELECT 
            b2.id as book_id,
            b2.title,
            b2.author,
            b2.description,
            0.8 * (1 - (b.description_embedding <=> b2.description_embedding)) as score,
            true as from_similar_books
        FROM books b
        JOIN books b2 ON b2.id != b.id
        WHERE b.id = ANY(p_favorite_book_ids)
        AND b2.id != ALL(p_favorite_book_ids)
        ORDER BY score DESC
        LIMIT 5
    ),
    
    -- Calculate genre match scores
    genre_matches AS (
        SELECT 
            b.id as book_id,
            b.title,
            b.author,
            b.description,
            0.6 * (
                array_length(ARRAY(
                    SELECT UNNEST(b.genre) 
                    INTERSECT 
                    SELECT UNNEST(p_genres)
                ), 1)::float / 
                array_length(p_genres, 1)
            ) as score,
            true as from_genre_match
        FROM books b
        WHERE b.genre && p_genres
    ),
    
    -- Get recommendations from people of same type
    type_matches AS (
        SELECT 
            b.id as book_id,
            b.title,
            b.author,
            b.description,
            0.4 as score,
            true as from_type_match
        FROM recommendations r
        JOIN books b ON r.book_id = b.id
        JOIN people p ON r.person_id = p.id
        WHERE p.type = p_user_type
    )
    
    -- Final selection
    SELECT 
        cs.book_id as id,
        cs.title,
        cs.author,
        cs.description,
        cs.total_score as score,
        cs.match_reasons
    FROM (
        SELECT DISTINCT ON (COALESCE(b.book_id, i.book_id, s.book_id, g.book_id, t.book_id))
            COALESCE(b.book_id, i.book_id, s.book_id, g.book_id, t.book_id) as book_id,
            COALESCE(b.title, i.title, s.title, g.title, t.title) as title,
            COALESCE(b.author, i.author, s.author, g.author, t.author) as author,
            COALESCE(b.description, i.description, s.description, g.description, t.description) as description,
            (COALESCE(b.score, 0) +
            COALESCE(i.score, 0) +
            COALESCE(s.score, 0) +
            COALESCE(g.score, 0) +
            COALESCE(t.score, 0)) as total_score,
            jsonb_build_object(
                'similar_to_favorites', COALESCE(b.from_similar_books, false),
                'recommended_by_inspiration', COALESCE(i.from_inspiration, false),
                'recommended_by_similar_people', COALESCE(s.from_similar_people, false),
                'genre_match', COALESCE(g.from_genre_match, false),
                'recommended_by_similar_type', COALESCE(t.from_type_match, false)
            ) as match_reasons
        FROM similar_books b
        FULL OUTER JOIN inspiration_recs i ON i.book_id = b.book_id
        FULL OUTER JOIN similar_people_recs s ON s.book_id = COALESCE(b.book_id, i.book_id)
        FULL OUTER JOIN genre_matches g ON g.book_id = COALESCE(b.book_id, i.book_id, s.book_id)
        FULL OUTER JOIN type_matches t ON t.book_id = COALESCE(b.book_id, i.book_id, s.book_id, g.book_id)
        WHERE COALESCE(b.book_id, i.book_id, s.book_id, g.book_id, t.book_id) != ALL(p_favorite_book_ids)
        ORDER BY COALESCE(b.book_id, i.book_id, s.book_id, g.book_id, t.book_id), total_score DESC
    ) cs
    ORDER BY cs.total_score DESC
    LIMIT p_limit;

    -- Debug logging
    GET DIAGNOSTICS debug_msg = ROW_COUNT;
    RAISE NOTICE 'Number of recommendations returned: %', debug_msg;
END;
$$;
