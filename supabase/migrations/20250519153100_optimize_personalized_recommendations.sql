-- Optimize get_personalized_recommendations to avoid time-outs on larger datasets
-- 1. Use k-NN vector searches via CROSS JOIN LATERAL so pgvector indexes are used
-- 2. Replace expensive FULL OUTER JOIN with UNION ALL + GROUP BY aggregation
-- 3. Add supporting indexes (genre GIN, people.type btree)

-- Indexes --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_books_genre ON public.books USING GIN (genre);
CREATE INDEX IF NOT EXISTS idx_people_type ON public.people (type);

-- Optimised function ---------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_personalized_recommendations(
    p_user_type text,
    p_genres text[],
    p_inspiration_ids uuid[],
    p_favorite_book_ids uuid[],
    p_limit integer
);

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
BEGIN
    RETURN QUERY
    WITH
    -- -----------------------------------------------------------------------
    -- 1. Books recommended directly by inspiration people
    inspiration_recs AS (
        SELECT 
            b.id    AS book_id,
            b.title AS title,
            b.author AS author,
            b.description AS description,
            1.0      AS score,
            true     AS from_inspiration,
            false    AS from_similar_people,
            false    AS from_similar_books,
            false    AS from_genre_match,
            false    AS from_type_match
        FROM recommendations r
        JOIN books b ON b.id = r.book_id
        WHERE r.person_id = ANY(p_inspiration_ids)
    ),

    -- -----------------------------------------------------------------------
    -- 2. Find people similar to inspirations (k-NN per inspiration)
    similar_people AS (
        SELECT DISTINCT sim.id
        FROM (
            SELECT p_sim.id
            FROM people insp,
            LATERAL (
                SELECT p.id
                FROM people p
                WHERE p.id <> insp.id
                  AND p.type = insp.type
                ORDER BY p.description_embedding <=> insp.description_embedding
                LIMIT 5
            ) p_sim
            WHERE insp.id = ANY(p_inspiration_ids)
        ) sim
    ),

    similar_people_recs AS (
        SELECT 
            b.id    AS book_id,
            b.title AS title,
            b.author AS author,
            b.description AS description,
            0.5      AS score,
            false    AS from_inspiration,
            true     AS from_similar_people,
            false    AS from_similar_books,
            false    AS from_genre_match,
            false    AS from_type_match
        FROM similar_people sp
        JOIN recommendations r ON r.person_id = sp.id
        JOIN books b ON b.id = r.book_id
    ),

    -- -----------------------------------------------------------------------
    -- 3. Books similar to the user's favourite books (k-NN per favourite)
    similar_books AS (
        SELECT 
            b2.id      AS book_id,
            b2.title,
            b2.author,
            b2.description,
            0.8 * (1 - (b2.description_embedding <=> b2.fav_embedding)) AS score,
            false    AS from_inspiration,
            false    AS from_similar_people,
            true     AS from_similar_books,
            false    AS from_genre_match,
            false    AS from_type_match
        FROM (
            SELECT 
                b2.id,
                b2.title,
                b2.author,
                b2.description,
                b2.description_embedding,
                fav.description_embedding as fav_embedding
            FROM books fav,
            LATERAL (
                SELECT 
                    b2.id,
                    b2.title,
                    b2.author,
                    b2.description,
                    b2.description_embedding
                FROM books b2
                WHERE b2.id <> fav.id
                  AND b2.id <> ALL(p_favorite_book_ids)
                ORDER BY b2.description_embedding <=> fav.description_embedding
                LIMIT 5
            ) b2
            WHERE fav.id = ANY(p_favorite_book_ids)
        ) b2
    ),

    -- -----------------------------------------------------------------------
    -- 4. Genre matches (using freshly added GIN index)
    genre_matches AS (
        SELECT 
            b.id    AS book_id,
            b.title AS title,
            b.author AS author,
            b.description AS description,
            0.6 * (
                array_length(ARRAY(
                    SELECT UNNEST(b.genre)
                    INTERSECT
                    SELECT UNNEST(p_genres)
                ), 1)::float / GREATEST(array_length(p_genres, 1), 1)
            )        AS score,
            false    AS from_inspiration,
            false    AS from_similar_people,
            false    AS from_similar_books,
            true     AS from_genre_match,
            false    AS from_type_match
        FROM books b
        WHERE p_genres IS NOT NULL
          AND b.genre && p_genres
    ),

    -- -----------------------------------------------------------------------
    -- 5. Books recommended by people of the same type as the user
    type_matches AS (
        SELECT 
            b.id    AS book_id,
            b.title AS title,
            b.author AS author,
            b.description AS description,
            0.4      AS score,
            false    AS from_inspiration,
            false    AS from_similar_people,
            false    AS from_similar_books,
            false    AS from_genre_match,
            true     AS from_type_match
        FROM people p
        JOIN recommendations r ON r.person_id = p.id
        JOIN books b ON b.id = r.book_id
        WHERE p.type = p_user_type
    ),

    -- -----------------------------------------------------------------------
    all_candidates AS (
        SELECT * FROM inspiration_recs
        UNION ALL
        SELECT * FROM similar_people_recs
        UNION ALL
        SELECT * FROM similar_books
        UNION ALL
        SELECT * FROM genre_matches
        UNION ALL
        SELECT * FROM type_matches
    )

    SELECT 
        ac.book_id                      AS id,
        MAX(ac.title)                   AS title,
        MAX(ac.author)                  AS author,
        MAX(ac.description)             AS description,
        SUM(ac.score)::float            AS score,
        jsonb_build_object(
            'recommended_by_inspiration', bool_or(ac.from_inspiration),
            'recommended_by_similar_people', bool_or(ac.from_similar_people),
            'similar_to_favorites', bool_or(ac.from_similar_books),
            'genre_match', bool_or(ac.from_genre_match),
            'recommended_by_similar_type', bool_or(ac.from_type_match)
        ) AS match_reasons
    FROM all_candidates ac
    WHERE ac.book_id <> ALL(p_favorite_book_ids)
    GROUP BY ac.book_id
    ORDER BY score DESC
    LIMIT p_limit;
END;
$$;
