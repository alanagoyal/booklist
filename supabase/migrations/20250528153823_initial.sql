create extension if not exists "pg_trgm" with schema "public" version '1.6';
create extension if not exists "vector" with schema "public";

create table "public"."books" (
    "id" uuid not null default uuid_generate_v4(),
    "title" text not null,
    "author" text not null,
    "description" text,
    "genre" text[] not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "amazon_url" text,
    "title_embedding" vector(1536),
    "author_embedding" vector(1536),
    "description_embedding" vector(1536),
    "similar_books" jsonb,
    "recommendation_percentile" numeric
);


alter table "public"."books" enable row level security;

create table "public"."pending_contributions" (
    "id" uuid not null default gen_random_uuid(),
    "person_name" text not null,
    "person_url" text,
    "books" jsonb not null,
    "created_at" timestamp with time zone default now(),
    "status" text default 'pending'::text,
    "approval_token" uuid default gen_random_uuid()
);


alter table "public"."pending_contributions" enable row level security;

create table "public"."people" (
    "id" uuid not null default uuid_generate_v4(),
    "full_name" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "url" text,
    "type" text,
    "description" text,
    "description_embedding" vector,
    "similar_people" jsonb,
    "recommendation_percentile" numeric
);


alter table "public"."people" enable row level security;

create table "public"."recommendations" (
    "id" uuid not null default uuid_generate_v4(),
    "person_id" uuid not null,
    "book_id" uuid not null,
    "source" text not null,
    "source_link" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."recommendations" enable row level security;

CREATE INDEX books_author_embedding_idx ON public.books USING ivfflat (author_embedding vector_cosine_ops);

CREATE INDEX books_description_embedding_idx ON public.books USING ivfflat (description_embedding vector_cosine_ops);

CREATE UNIQUE INDEX books_pkey ON public.books USING btree (id);

CREATE INDEX books_title_embedding_idx ON public.books USING ivfflat (title_embedding vector_cosine_ops);

CREATE INDEX idx_books_genre ON public.books USING gin (genre);

CREATE INDEX idx_people_type ON public.people USING btree (type);

CREATE INDEX idx_recommendations_book_id ON public.recommendations USING btree (book_id);

CREATE INDEX idx_recommendations_person_id ON public.recommendations USING btree (person_id);

CREATE UNIQUE INDEX pending_contributions_pkey ON public.pending_contributions USING btree (id);

CREATE UNIQUE INDEX people_pkey ON public.people USING btree (id);

CREATE UNIQUE INDEX recommendations_pkey ON public.recommendations USING btree (id);

CREATE UNIQUE INDEX unique_person_book ON public.recommendations USING btree (person_id, book_id);

CREATE UNIQUE INDEX unique_title_author ON public.books USING btree (title, author);

alter table "public"."books" add constraint "books_pkey" PRIMARY KEY using index "books_pkey";

alter table "public"."pending_contributions" add constraint "pending_contributions_pkey" PRIMARY KEY using index "pending_contributions_pkey";

alter table "public"."people" add constraint "people_pkey" PRIMARY KEY using index "people_pkey";

alter table "public"."recommendations" add constraint "recommendations_pkey" PRIMARY KEY using index "recommendations_pkey";

alter table "public"."books" add constraint "unique_title_author" UNIQUE using index "unique_title_author";

alter table "public"."recommendations" add constraint "recommendations_book_id_fkey" FOREIGN KEY (book_id) REFERENCES books(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."recommendations" validate constraint "recommendations_book_id_fkey";

alter table "public"."recommendations" add constraint "recommendations_person_id_fkey" FOREIGN KEY (person_id) REFERENCES people(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."recommendations" validate constraint "recommendations_person_id_fkey";

alter table "public"."recommendations" add constraint "unique_person_book" UNIQUE using index "unique_person_book";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.find_similar_books(p_title text, p_author text)
 RETURNS TABLE(id uuid, title text, author text, title_similarity double precision, author_similarity double precision)
 LANGUAGE plpgsql
AS $function$BEGIN
    RETURN QUERY
    SELECT 
        b2.id,
        b2.title,
        b2.author,
        similarity(LOWER(b2.title), LOWER(p_title))::double precision as title_similarity,
        similarity(LOWER(b2.author), LOWER(p_author))::double precision as author_similarity
    FROM 
        books b2
    WHERE 
        similarity(LOWER(b2.title), LOWER(p_title)) > 0.8 AND
        similarity(LOWER(b2.author), LOWER(p_author)) > 0.8
    ORDER BY
        (similarity(LOWER(b2.title), LOWER(p_title)) + similarity(LOWER(b2.author), LOWER(p_author))) DESC
    LIMIT 1;
END;$function$
;

CREATE OR REPLACE FUNCTION public.get_best_matching_book(p_title_embedding vector, p_author_embedding vector)
 RETURNS TABLE(id uuid, title text, author text, title_similarity double precision, author_similarity double precision)
 LANGUAGE plpgsql
AS $function$BEGIN
    RETURN QUERY
    SELECT 
        b2.id,
        b2.title,
        b2.author,
        (1 - (b2.title_embedding <=> p_title_embedding))::double precision as title_similarity,
        (1 - (b2.author_embedding <=> p_author_embedding))::double precision as author_similarity
    FROM 
        books b2
    WHERE 
        (1 - (b2.title_embedding <=> p_title_embedding)) > 0.85 AND
        (1 - (b2.author_embedding <=> p_author_embedding)) > 0.9
    ORDER BY
        ((1 - (b2.title_embedding <=> p_title_embedding)) + (1 - (b2.author_embedding <=> p_author_embedding))) DESC
    LIMIT 1;
END;$function$
;

CREATE OR REPLACE FUNCTION public.get_book_recommendations(book_ids uuid[])
 RETURNS json
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_books_by_embedding_similarity(embedding vector, match_count integer DEFAULT 10)
 RETURNS TABLE(id uuid, title text, author text, genre text, description text, amazon_url text, similarity double precision)
 LANGUAGE sql
AS $function$
  select
    id,
    title,
    author,
    genre,
    description,
    amazon_url,
    1 - (title_embedding <=> embedding) as similarity
  from books
  order by title_embedding <=> embedding
  limit match_count
$function$
;

CREATE OR REPLACE FUNCTION public.get_books_by_recommendation_count(p_limit integer DEFAULT 1000, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, title text, author text, description text, genre text[], amazon_url text, recommendations json, _recommendation_count integer, _percentile double precision, related_books json)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_books_by_recommender(p_recommender_id uuid)
 RETURNS TABLE(id uuid, title text, author text, description text, genre text[], amazon_url text, created_at timestamp with time zone, updated_at timestamp with time zone, source text, source_link text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select distinct
    b.id,
    b.title,
    b.author,
    b.description,
    b.genre,
    b.amazon_url,
    b.created_at,
    b.updated_at,
    r.source,
    r.source_link
  from books b
  join recommendations r on r.book_id = b.id
  where r.person_id = p_recommender_id
  order by b.created_at desc;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_books_by_shared_recommenders(p_book_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, title text, author text, genres text[], amazon_url text, recommender_count integer, recommenders text, recommender_types text)
 LANGUAGE plpgsql
AS $function$
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
      COUNT(DISTINCT r.person_id)::INTEGER as recommender_count,
      string_agg(DISTINCT p.full_name, ', ') as recommenders,
      string_agg(DISTINCT p.type::TEXT, ', ') as recommender_types
    FROM books b
    INNER JOIN recommendations r ON r.book_id = b.id
    INNER JOIN people p ON p.id = r.person_id
    WHERE r.person_id IN (SELECT person_id FROM book_recommenders)
    AND b.id != p_book_id
    GROUP BY b.id, b.title, b.author, b.genre, b.amazon_url
  )
  SELECT * FROM related_books
  ORDER BY recommender_count DESC, title ASC
  LIMIT p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_books_by_single_type()
 RETURNS TABLE(book_id uuid, title text, only_type text)
 LANGUAGE sql
AS $function$
  select
    b.id as book_id,
    b.title,
    min(p.type) as only_type
  from recommendations r
  join books b on r.book_id = b.id
  join people p on r.person_id = p.id
  group by b.id, b.title
  having count(distinct p.type) = 1
$function$
;

CREATE OR REPLACE FUNCTION public.get_books_count()
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  book_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO book_count FROM books;
  RETURN book_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_books_with_counts(p_limit integer DEFAULT 1000, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, title text, author text, description text, genre text[], amazon_url text, similar_books jsonb, _recommendation_count integer, recommendation_percentile numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH book_counts AS (
    -- Calculate recommendation count and percentile for each book
    SELECT
      books.id,
      books.title,
      books.author,
      books.description,
      books.genre,
      books.amazon_url,
      books.similar_books,
      COUNT(DISTINCT r.person_id)::int as recommendation_count,
      books.recommendation_percentile -- Use the precalculated percentile
    FROM books
    LEFT JOIN recommendations r ON books.id = r.book_id
    GROUP BY books.id, books.title, books.author, books.description, books.genre, books.amazon_url, books.similar_books, books.recommendation_percentile
  )
  SELECT 
    bc.id,
    bc.title,
    bc.author,
    bc.description,
    bc.genre,
    bc.amazon_url,
    bc.similar_books,
    bc.recommendation_count,
    bc.recommendation_percentile
  FROM book_counts bc
  ORDER BY bc.recommendation_count DESC, bc.id ASC -- Corrected ORDER BY
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_books_with_most_type_diversity(limit_arg integer DEFAULT 10)
 RETURNS TABLE(book_id uuid, title text, type_count integer)
 LANGUAGE sql
AS $function$
  select
    b.id as book_id,
    b.title,
    count(distinct p.type) as type_count
  from recommendations r
  join people p on r.person_id = p.id
  join books b on r.book_id = b.id
  group by b.id, b.title
  order by type_count desc
  limit limit_arg
$function$
;

CREATE OR REPLACE FUNCTION public.get_books_with_type_diversity(limit_arg integer DEFAULT 10)
 RETURNS TABLE(book_id uuid, title text, type_count integer)
 LANGUAGE sql
AS $function$
  select
    b.id as book_id,
    b.title,
    count(distinct p.type) as type_count
  from recommendations r
  join books b on b.id = r.book_id
  join people p on p.id = r.person_id
  group by b.id
  order by type_count desc
  limit limit_arg
$function$
;

CREATE OR REPLACE FUNCTION public.get_description_embedding_for_person(person_id_arg uuid)
 RETURNS TABLE(embedding vector)
 LANGUAGE sql
AS $function$
  select avg(description_embedding) as embedding
  from books
  where description_embedding is not null
    and id in (
      select book_id from recommendations where person_id = person_id_arg
    )
$function$
;

CREATE OR REPLACE FUNCTION public.get_description_embedding_for_type(type_arg text)
 RETURNS TABLE(embedding vector)
 LANGUAGE sql
AS $function$
  select avg(description_embedding) as embedding
  from books
  where description_embedding is not null
    and id in (
      select r.book_id
      from recommendations r
      join people p on r.person_id = p.id
      where p.type = type_arg
    )
$function$
;

CREATE OR REPLACE FUNCTION public.get_dissimilar_books_with_high_overlap(limit_arg integer DEFAULT 10)
 RETURNS TABLE(book1_id uuid, book1_title text, book2_id uuid, book2_title text, similarity double precision, shared_recommender_count bigint)
 LANGUAGE plpgsql
AS $function$
begin
  return query
  select 
    b1.id, b1.title, b2.id, b2.title,
    1 - (b1.description_embedding <=> b2.description_embedding) as similarity,
    count(distinct r1.person_id) as shared_recommender_count
  from books b1
  join books b2 on b1.id < b2.id
  join recommendations r1 on r1.book_id = b1.id
  join recommendations r2 on r2.book_id = b2.id and r1.person_id = r2.person_id
  where b1.description_embedding is not null and b2.description_embedding is not null
  group by b1.id, b1.title, b2.id, b2.title, b1.description_embedding, b2.description_embedding
  having similarity < 0.6 and count(distinct r1.person_id) >= 2
  order by shared_recommender_count desc, similarity asc
  limit limit_arg;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_dissimilar_people_with_high_overlap(limit_arg integer DEFAULT 10)
 RETURNS TABLE(person1_id uuid, person1_name text, person2_id uuid, person2_name text, similarity double precision, shared_book_count bigint)
 LANGUAGE plpgsql
AS $function$
begin
  return query
  select 
    p1.id, p1.full_name, p2.id, p2.full_name,
    1 - (p1.description_embedding <=> p2.description_embedding) as similarity,
    count(distinct r1.book_id) as shared_book_count
  from people p1
  join people p2 on p1.id < p2.id
  join recommendations r1 on r1.person_id = p1.id
  join recommendations r2 on r2.person_id = p2.id and r1.book_id = r2.book_id
  where p1.description_embedding is not null and p2.description_embedding is not null
  group by p1.id, p1.full_name, p2.id, p2.full_name, p1.description_embedding, p2.description_embedding
  having similarity < 0.6 and count(distinct r1.book_id) >= 2
  order by shared_book_count desc, similarity asc
  limit limit_arg;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_genre_count_by_type()
 RETURNS TABLE(type text, genre_count integer)
 LANGUAGE sql
AS $function$
  select
    p.type,
    count(distinct trim(g)) as genre_count
  from people p
  join recommendations r on p.id = r.person_id
  join books b on r.book_id = b.id,
  unnest(b.genre) as g
  group by p.type
  order by genre_count desc
$function$
;

CREATE OR REPLACE FUNCTION public.get_genre_diverse_recommenders(limit_arg integer DEFAULT 10)
 RETURNS TABLE(person_id uuid, full_name text, genre_count integer)
 LANGUAGE sql
AS $function$
  select
    p.id as person_id,
    p.full_name,
    count(distinct b.genre) as genre_count
  from recommendations r
  join people p on p.id = r.person_id
  join books b on b.id = r.book_id
  group by p.id
  order by genre_count desc
  limit limit_arg
$function$
;

CREATE OR REPLACE FUNCTION public.get_genre_outliers_in_type()
 RETURNS TABLE(person_id uuid, full_name text, type text, genre_count integer)
 LANGUAGE sql
AS $function$
  with genre_counts as (
    select
      p.id as person_id,
      p.full_name,
      p.type,
      count(distinct trim(g)) as genre_count
    from people p
    join recommendations r on p.id = r.person_id
    join books b on r.book_id = b.id,
    unnest(b.genre) as g
    group by p.id, p.full_name, p.type
  )
  select *
  from genre_counts
  where genre_count <= 1
  order by type, genre_count
$function$
;

CREATE OR REPLACE FUNCTION public.get_genre_overlap_stats()
 RETURNS TABLE(genre text, avg_books_per_recommender double precision, avg_recommenders_per_book double precision)
 LANGUAGE sql
AS $function$
  with genre_stats as (
    select
      trim(g) as genre,
      r.person_id,
      r.book_id
    from recommendations r
    join books b on r.book_id = b.id,
    unnest(b.genre) as g
  )
  select
    genre,
    count(distinct book_id)::float / count(distinct person_id) as avg_books_per_recommender,
    count(distinct person_id)::float / count(distinct book_id) as avg_recommenders_per_book
  from genre_stats
  group by genre
$function$
;

CREATE OR REPLACE FUNCTION public.get_influential_recommenders(limit_arg integer DEFAULT 10)
 RETURNS TABLE(person_id uuid, full_name text, influence_score integer)
 LANGUAGE sql
AS $function$
  with influence as (
    select
      r.person_id,
      b.id as book_id,
      count(distinct r2.person_id) as reach
    from recommendations r
    join books b on r.book_id = b.id
    join recommendations r2 on r2.book_id = b.id
    group by r.person_id, b.id
  )
  select
    p.id as person_id,
    p.full_name,
    sum(influence.reach) as influence_score
  from influence
  join people p on p.id = influence.person_id
  group by p.id, p.full_name
  order by influence_score desc
  limit limit_arg
$function$
;

CREATE OR REPLACE FUNCTION public.get_most_diverse_recommenders(limit_arg integer DEFAULT 10)
 RETURNS TABLE(person_id uuid, full_name text, genre_count integer)
 LANGUAGE sql
AS $function$
  select
    p.id,
    p.full_name,
    count(distinct trim(g)) as genre_count
  from recommendations r
  join books b on r.book_id = b.id
  join lateral unnest(b.genre) as g on true
  join people p on r.person_id = p.id
  group by p.id, p.full_name
  order by genre_count desc
  limit limit_arg
$function$
;

CREATE OR REPLACE FUNCTION public.get_most_recommended_books(limit_arg integer DEFAULT 10)
 RETURNS TABLE(book_id uuid, title text, recommendation_count integer)
 LANGUAGE sql
AS $function$
  select
    b.id,
    b.title,
    count(*) as recommendation_count
  from recommendations r
  join books b on r.book_id = b.id
  group by b.id, b.title
  order by recommendation_count desc
  limit limit_arg
$function$
;

CREATE OR REPLACE FUNCTION public.get_most_similar_types(limit_arg integer DEFAULT 10)
 RETURNS TABLE(type1 text, type2 text, shared_book_count integer)
 LANGUAGE sql
AS $function$
  select
    p1.type as type1,
    p2.type as type2,
    count(*) as shared_book_count
  from recommendations r1
  join recommendations r2 on r1.book_id = r2.book_id
  join people p1 on r1.person_id = p1.id
  join people p2 on r2.person_id = p2.id
  where p1.type is not null and p2.type is not null and p1.type < p2.type
  group by p1.type, p2.type
  order by shared_book_count desc
  limit limit_arg
$function$
;

CREATE OR REPLACE FUNCTION public.get_person_embedding_centroid(person_id_arg uuid)
 RETURNS TABLE(embedding vector)
 LANGUAGE sql
AS $function$
  select avg(title_embedding) as embedding
  from books
  where id in (
    select book_id from recommendations where person_id = person_id_arg
  )
$function$
;

CREATE OR REPLACE FUNCTION public.get_personalized_recommendations(p_user_type text, p_genres text[], p_inspiration_ids uuid[], p_favorite_book_ids uuid[], p_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, title text, author text, description text, genres text[], amazon_url text, score double precision, match_reasons jsonb)
 LANGUAGE plpgsql
AS $function$
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
            b.genre AS genres,
            b.amazon_url AS amazon_url,
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
            b.genre AS genres,
            b.amazon_url AS amazon_url,
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
            b2.genres,
            b2.amazon_url,
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
                b2.genre AS genres,
                b2.amazon_url,
                b2.description_embedding,
                fav.description_embedding as fav_embedding
            FROM books fav,
            LATERAL (
                SELECT 
                    b2.id,
                    b2.title,
                    b2.author,
                    b2.description,
                    b2.genre,
                    b2.amazon_url,
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
            b.genre AS genres,
            b.amazon_url AS amazon_url,
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
            b.genre AS genres,
            b.amazon_url AS amazon_url,
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
        MAX(ac.genres)                  AS genres,
        MAX(ac.amazon_url)              AS amazon_url,
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_random_book()
 RETURNS SETOF books
 LANGUAGE sql
AS $function$
  select *
  from books
  offset floor(random() * (select count(*) from books))
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_recommendation_distribution()
 RETURNS TABLE(book_id uuid, title text, recommendation_count integer)
 LANGUAGE sql
AS $function$
  select
    b.id,
    b.title,
    count(*) as recommendation_count
  from books b
  join recommendations r on r.book_id = b.id
  group by b.id, b.title
  order by recommendation_count desc
$function$
;

CREATE OR REPLACE FUNCTION public.get_recommendation_network()
 RETURNS TABLE(source_id text, source_name text, source_type text, target_id text, target_name text, target_type text, shared_book_count bigint, shared_book_titles text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    WITH recommendation_pairs AS (
        SELECT 
            r1.person_id as source_id,
            r2.person_id as target_id,
            COUNT(*) as shared_book_count,
            ARRAY_AGG(DISTINCT b.title) as shared_book_titles
        FROM recommendations r1
        JOIN recommendations r2 ON r1.book_id = r2.book_id 
            AND r1.person_id < r2.person_id -- Ensure unique pairs
        JOIN books b ON r1.book_id = b.id
        GROUP BY r1.person_id, r2.person_id
    )
    SELECT 
        rp.source_id::text,
        p1.full_name as source_name,
        p1.type as source_type,
        rp.target_id::text,
        p2.full_name as target_name,
        p2.type as target_type,
        rp.shared_book_count,
        rp.shared_book_titles
    FROM recommendation_pairs rp
    JOIN people p1 ON rp.source_id = p1.id
    JOIN people p2 ON rp.target_id = p2.id
    ORDER BY shared_book_count DESC;  -- Added semicolon here
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_recommender_details(p_recommender_id uuid)
 RETURNS TABLE(id uuid, full_name text, url text, type text, description text, recommendations json, related_recommenders json)
 LANGUAGE plpgsql
AS $function$BEGIN
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
      COUNT(DISTINCT r2.id) as shared_count
    FROM recommendations r1
    JOIN recommendations r2 ON r1.book_id = r2.book_id AND r1.person_id != r2.person_id
    JOIN people p2 ON r2.person_id = p2.id
    JOIN books b ON r1.book_id = b.id
    WHERE r1.person_id = p_recommender_id
    GROUP BY p2.id, p2.full_name, p2.url, p2.type
    HAVING COUNT(DISTINCT r2.id) >= 2
    ORDER BY COUNT(DISTINCT r2.id) DESC
    LIMIT 3
  )
  SELECT 
    p.id,
    p.full_name,
    p.url,
    p.type,
    p.description,
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
          ) ORDER BY rb.title ASC
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
          ) ORDER BY rr.full_name ASC
        )
        FROM related_recommenders_data rr
      ),
      '[]'::json
    ) as related_recommenders
  FROM people p
  WHERE p.id = p_recommender_id;
END;$function$
;

CREATE OR REPLACE FUNCTION public.get_recommender_with_books(p_limit integer DEFAULT 1000, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, full_name text, type text, url text, description text, recommendations jsonb, related_recommenders jsonb, similar_people jsonb, _book_count bigint, recommendation_percentile numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  recommender_ids uuid[];
begin
  -- Get all recommender IDs first
  select array_agg(p.id) into recommender_ids
  from people p
  where exists (
    select 1 from recommendations r where r.person_id = p.id
  );

  return query
    with recommender_base as (
      select
        p.id,
        p.full_name,
        p.type,
        p.url,
        p.description,
        p.similar_people,
        jsonb_agg(
          jsonb_build_object(
            'id', b.id,
            'title', b.title,
            'author', b.author,
            'description', b.description,
            'genre', b.genre,
            'amazon_url', b.amazon_url,
            'source', r.source,
            'source_link', r.source_link
          )
          order by b.title
        ) filter (where b.id is not null) as recommendations,
        count(b.id)::bigint as book_count,
        p.recommendation_percentile
      from people p
      inner join recommendations r on r.person_id = p.id
      inner join books b on b.id = r.book_id
      group by p.id, p.full_name, p.type, p.url, p.description, p.similar_people, p.recommendation_percentile
    ),
    related as (
      select * from get_related_recommenders(recommender_ids)
    )
    select
      rb.id,
      rb.full_name,
      rb.type,
      rb.url,
      rb.description,
      rb.recommendations,
      coalesce(r.related_recommenders, '[]'::jsonb) as related_recommenders,
      rb.similar_people,
      rb.book_count as _book_count,
      rb.recommendation_percentile
    from recommender_base rb
    left join related r on r.recommender_id = rb.id
    order by rb.book_count desc, rb.full_name
    limit p_limit
    offset p_offset;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_related_books(book_ids uuid[], p_limit integer DEFAULT 3)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
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
            '_recommendation_count', recommendation_count,
            '_shared_count', shared_recommenders
          )
        ) as related_books
      FROM (
        SELECT 
          br.book_id,
          b.id,
          b.title,
          b.author,
          b.description,
          b.amazon_url,
          COUNT(DISTINCT r.person_id)::int as recommendation_count,
          br.shared_recommenders,
          row_number() OVER (PARTITION BY br.book_id ORDER BY br.shared_recommenders DESC) as rn
        FROM (
          SELECT 
            r1.book_id,
            r2.book_id as related_id,
            COUNT(DISTINCT r1.person_id) as shared_recommenders
          FROM recommendations r1
          JOIN recommendations r2 ON r1.person_id = r2.person_id
          WHERE r1.book_id = ANY(book_ids)
          AND r1.book_id != r2.book_id
          GROUP BY r1.book_id, r2.book_id
        ) br
        JOIN books b ON b.id = br.related_id
        LEFT JOIN recommendations r ON b.id = r.book_id
        GROUP BY br.book_id, b.id, b.title, b.author, b.description, b.amazon_url, br.shared_recommenders
      ) ranked
      WHERE rn <= p_limit
      GROUP BY book_id
    ) book_related
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_related_recommenders(p_recommender_id uuid, p_limit integer DEFAULT 3)
 RETURNS TABLE(id uuid, full_name text, url text, type text, shared_books text, shared_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH recommender_books AS (
    SELECT book_id
    FROM recommendations
    WHERE person_id = p_recommender_id
  ),
  similar_recommenders AS (
    SELECT 
      r.person_id,
      COUNT(*) AS shared_count,
      STRING_AGG(b.title, ', ' ORDER BY b.title) AS shared_books
    FROM recommendations r
    JOIN books b ON b.id = r.book_id
    WHERE r.book_id IN (SELECT book_id FROM recommender_books)
      AND r.person_id != p_recommender_id
    GROUP BY r.person_id
    ORDER BY shared_count DESC
    LIMIT p_limit
  )
  SELECT 
    p.id,
    p.full_name,
    p.url,
    p.type,
    sr.shared_books,
    sr.shared_count
  FROM similar_recommenders sr
  JOIN people p ON p.id = sr.person_id
  ORDER BY sr.shared_count DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_related_recommenders(p_recommender_ids uuid[])
 RETURNS TABLE(recommender_id uuid, related_recommenders jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
    with shared_books as (
      -- Get all books recommended by each recommender
      select 
        r1.person_id as recommender1,
        r2.person_id as recommender2,
        count(*) as shared_count,
        array_agg(b.title) as shared_books
      from recommendations r1
      join recommendations r2 on r1.book_id = r2.book_id and r1.person_id < r2.person_id
      join books b on b.id = r1.book_id
      where r1.person_id = any(p_recommender_ids)
      group by r1.person_id, r2.person_id
      having count(*) >= 2  -- Only include pairs with at least 2 shared books
    ),
    top_related as (
      -- Get top 3 related recommenders for each recommender
      select 
        tr.recommender1,
        tr.recommender2,
        tr.shared_count,
        tr.shared_books,
        row_number() over (partition by tr.recommender1 order by tr.shared_count desc) as rn
      from shared_books tr
    )
    select 
      tr.recommender1 as recommender_id,
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name,
          'url', p.url,
          'type', p.type,
          'shared_books', tr.shared_books,
          '_shared_count', tr.shared_count
        )
      ) as related_recommenders
    from top_related tr
    join people p on p.id = tr.recommender2
    where tr.rn <= 3  -- Limit to top 3 related recommenders
    group by tr.recommender1;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_semantic_book_pairs_with_low_overlap(limit_arg integer DEFAULT 10)
 RETURNS TABLE(book1_id uuid, book1_title text, book2_id uuid, book2_title text, similarity double precision, shared_recommender_count bigint)
 LANGUAGE plpgsql
AS $function$
begin
  return query
  select 
    b1.id, b1.title, b2.id, b2.title,
    1 - (b1.description_embedding <=> b2.description_embedding) as similarity,
    coalesce(count(distinct r1.person_id), 0) as shared_recommender_count
  from books b1
  join books b2 on b1.id < b2.id
  left join recommendations r1 on r1.book_id = b1.id
  left join recommendations r2 on r2.book_id = b2.id and r1.person_id = r2.person_id
  where b1.description_embedding is not null and b2.description_embedding is not null
  group by b1.id, b1.title, b2.id, b2.title, b1.description_embedding, b2.description_embedding
  having similarity > 0.6 and count(distinct r1.person_id) <= 1
  order by similarity desc
  limit limit_arg;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_semantic_person_pairs_with_low_overlap(limit_arg integer DEFAULT 10)
 RETURNS TABLE(person1_id uuid, person1_name text, person2_id uuid, person2_name text, similarity double precision, shared_book_count bigint)
 LANGUAGE plpgsql
AS $function$
begin
  return query
  select 
    p1.id, p1.full_name, p2.id, p2.full_name,
    1 - (p1.description_embedding <=> p2.description_embedding) as similarity,
    count(distinct r1.book_id) as shared_book_count
  from people p1
  join people p2 on p1.id < p2.id
  left join recommendations r1 on r1.person_id = p1.id
  left join recommendations r2 on r2.person_id = p2.id and r1.book_id = r2.book_id
  where p1.description_embedding is not null and p2.description_embedding is not null
  group by p1.id, p1.full_name, p2.id, p2.full_name, p1.description_embedding, p2.description_embedding
  having similarity > 0.6 and count(distinct r1.book_id) <= 1
  order by similarity desc
  limit limit_arg;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_similar_books_by_description(embedding vector, match_count integer DEFAULT 10)
 RETURNS TABLE(id uuid, title text, author text, genre text[], description text, amazon_url text, similarity double precision)
 LANGUAGE sql
AS $function$
  select
    id,
    title,
    author,
    genre,
    description,
    amazon_url,
    1 - (description_embedding <=> embedding) as similarity
  from books
  where description_embedding is not null
  order by description_embedding <=> embedding
  limit match_count
$function$
;

CREATE OR REPLACE FUNCTION public.get_similar_books_to_book_by_description(book_id_arg uuid)
 RETURNS TABLE(id uuid, title text, author text, genre text[], description text, amazon_url text, similarity double precision)
 LANGUAGE sql
AS $function$
  with source as (
    select description_embedding
    from books
    where id = book_id_arg and description_embedding is not null
  )
  select
    b.id,
    b.title,
    b.author,
    b.genre,
    b.description,
    b.amazon_url,
    1 - (b.description_embedding <=> s.description_embedding) as similarity
  from books b, source s
  where b.id != book_id_arg and b.description_embedding is not null
  order by b.description_embedding <=> s.description_embedding
  limit 3
$function$
;

CREATE OR REPLACE FUNCTION public.get_similar_people_by_description_embedding(person_id_arg uuid)
 RETURNS TABLE(person_id uuid, full_name text, type text, similarity double precision)
 LANGUAGE sql
AS $function$with source_embedding as (
    select avg(b.description_embedding) as embedding
    from recommendations r
    join books b on r.book_id = b.id
    where r.person_id = person_id_arg and b.description_embedding is not null
  ),
  target_embeddings as (
    select
      p.id as person_id,
      p.full_name,
      p.type,
      avg(b.description_embedding) as embedding
    from people p
    join recommendations r on p.id = r.person_id
    join books b on r.book_id = b.id
    where b.description_embedding is not null and p.id != person_id_arg
    group by p.id, p.full_name, p.type
  )
  select
    t.person_id,
    t.full_name,
    t.type,
    1 - (t.embedding <=> s.embedding) as similarity
  from target_embeddings t, source_embedding s
  where s.embedding is not null and t.embedding is not null
  order by t.embedding <=> s.embedding
  limit 10$function$
;

CREATE OR REPLACE FUNCTION public.get_sources_with_most_people(limit_arg integer DEFAULT 10)
 RETURNS TABLE(source text, source_link text, unique_recommenders integer)
 LANGUAGE sql
AS $function$
  select
    source,
    source_link,
    count(distinct person_id) as unique_recommenders
  from recommendations
  where source_link is not null
  group by source, source_link
  order by unique_recommenders desc
  limit limit_arg
$function$
;

CREATE OR REPLACE FUNCTION public.get_top_genres_by_recommenders(limit_arg integer DEFAULT 10)
 RETURNS TABLE(genre text, unique_recommenders integer)
 LANGUAGE sql
AS $function$
  select
    trim(g) as genre,
    count(distinct r.person_id) as unique_recommenders
  from books b
  join recommendations r on r.book_id = b.id,
  unnest(b.genre) as g
  group by trim(g)  -- Include trim(g) in the GROUP BY clause
  order by unique_recommenders desc
  limit limit_arg
$function$
;

CREATE OR REPLACE FUNCTION public.get_top_genres_by_type(type_arg text)
 RETURNS TABLE(genre text, count integer)
 LANGUAGE sql
AS $function$
  select
    b.genre,
    count(*) as count
  from recommendations r
  join people p on r.person_id = p.id
  join books b on r.book_id = b.id
  where p.type = type_arg
  group by b.genre
  order by count desc
$function$
;

CREATE OR REPLACE FUNCTION public.get_top_overlapping_recommenders(limit_arg integer DEFAULT 10)
 RETURNS TABLE(person1_id uuid, person1_name text, person1_type text, person2_id uuid, person2_name text, person2_type text, shared_book_count integer)
 LANGUAGE sql
AS $function$
  select
    r1.person_id as person1_id,
    p1.full_name as person1_name,
    p1.type as person1_type,
    r2.person_id as person2_id,
    p2.full_name as person2_name,
    p2.type as person2_type,
    count(*) as shared_book_count
  from recommendations r1
  join recommendations r2 on r1.book_id = r2.book_id and r1.person_id < r2.person_id
  join people p1 on p1.id = r1.person_id
  join people p2 on p2.id = r2.person_id
  group by r1.person_id, p1.full_name, p1.type, r2.person_id, p2.full_name, p2.type
  order by shared_book_count desc
  limit limit_arg
$function$
;

CREATE OR REPLACE FUNCTION public.get_top_similar_books_with_overlap(limit_arg integer DEFAULT 10)
 RETURNS TABLE(book1_id uuid, book1_title text, book2_id uuid, book2_title text, similarity double precision, shared_recommender_count bigint)
 LANGUAGE sql
AS $function$
  with active_books as (
    select b.id, b.title, b.description_embedding
    from books b
    join (
      select book_id
      from recommendations
      group by book_id
      having count(*) > 5
    ) rb on b.id = rb.book_id
    where b.description_embedding is not null
  )
  select 
    b1.id, b1.title, b2.id, b2.title,
    1 - (b1.description_embedding <=> b2.description_embedding) as similarity,
    count(distinct r1.person_id) as shared_recommender_count
  from active_books b1
  join active_books b2 on b1.id < b2.id
  left join recommendations r1 on r1.book_id = b1.id
  left join recommendations r2 on r2.book_id = b2.id and r1.person_id = r2.person_id
  group by b1.id, b1.title, b2.id, b2.title, b1.description_embedding, b2.description_embedding
  order by similarity desc
  limit limit_arg;
$function$
;

CREATE OR REPLACE FUNCTION public.get_top_similar_people_with_overlap(limit_arg integer DEFAULT 10)
 RETURNS TABLE(person1_id uuid, person1_name text, person2_id uuid, person2_name text, similarity double precision, shared_book_count bigint)
 LANGUAGE plpgsql
AS $function$
begin
  return query
  select 
    p1.id, p1.full_name, p2.id, p2.full_name,
    1 - (p1.description_embedding <=> p2.description_embedding) as similarity,
    count(distinct r1.book_id) as shared_book_count
  from people p1
  join people p2 on p1.id < p2.id
  left join recommendations r1 on r1.person_id = p1.id
  left join recommendations r2 on r2.person_id = p2.id and r1.book_id = r2.book_id
  where p1.description_embedding is not null and p2.description_embedding is not null
  group by p1.id, p1.full_name, p2.id, p2.full_name, p1.description_embedding, p2.description_embedding
  order by similarity desc
  limit limit_arg;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_top_sources(limit_arg integer DEFAULT 10)
 RETURNS TABLE(source text, source_link text, count integer)
 LANGUAGE sql
AS $function$
  select
    source,
    source_link,
    count(*)
  from recommendations
  where source_link is not null
  group by source, source_link
  order by count desc
  limit limit_arg
$function$
;

CREATE OR REPLACE FUNCTION public.get_type_embedding_centroid(type_arg text)
 RETURNS TABLE(embedding vector)
 LANGUAGE sql
AS $function$
  select avg(title_embedding) as embedding
  from books
  where id in (
    select r.book_id from recommendations r
    join people p on r.person_id = p.id
    where p.type = type_arg
  )
$function$
;

CREATE OR REPLACE FUNCTION public.hybrid_search_books(query_input text, embedding_input vector)
 RETURNS TABLE(id uuid, title text, author text, description text, similarity_score double precision)
 LANGUAGE sql
AS $function$
with input as (
  select
    query_input as query,
    embedding_input as embedding
),
semantic_matches as (
  select
    b.id,
    b.title,
    b.author,
    b.description,
    1 - (b.description_embedding <=> i.embedding) as similarity_score
  from books b, input i
),
exact_matches as (
  select
    b.id,
    b.title,
    b.author,
    b.description,
    1.1 as similarity_score
  from books b, input i
  where
    b.title ilike '%' || i.query || '%'
    or b.author ilike '%' || i.query || '%'
    or b.description ilike '%' || i.query || '%'
)
select *
from (
  select * from semantic_matches
  union
  select * from exact_matches
) combined
order by similarity_score desc
limit 20;
$function$
;

CREATE OR REPLACE FUNCTION public.hybrid_search_books(query_input text, embedding_input vector, min_similarity double precision DEFAULT 0.75)
 RETURNS TABLE(id uuid, title text, author text, description text, genre text[], similarity_score double precision)
 LANGUAGE sql
AS $function$
with input as (
  select
    query_input as query,
    embedding_input as embedding
),
semantic_matches as (
  select
    b.id,
    b.title,
    b.author,
    b.description,
    b.genre,
    1 - (b.description_embedding <=> i.embedding) as similarity_score
  from books b, input i
),
exact_matches as (
  select
    b.id,
    b.title,
    b.author,
    b.description,
    b.genre,
    1.1 as similarity_score
  from books b, input i
  where
    b.title ilike '%' || i.query || '%'
    or b.author ilike '%' || i.query || '%'
    or b.description ilike '%' || i.query || '%'
    or i.query ilike any(b.genre) -- <== correct array match
)
select *
from (
  select * from semantic_matches
  union
  select * from exact_matches
) combined
where similarity_score >= min_similarity
order by similarity_score desc;
$function$
;

CREATE OR REPLACE FUNCTION public.hybrid_search_people(query_input text, embedding_input vector)
 RETURNS TABLE(id uuid, full_name text, type text, description text, url text, similarity_score double precision)
 LANGUAGE sql
AS $function$
with input as (
  select
    query_input as query,
    embedding_input as embedding
),
semantic_matches as (
  select
    p.id,
    p.full_name,
    p.type,
    p.description,
    p.url,
    1 - (p.description_embedding <=> i.embedding) as similarity_score
  from people p, input i
),
exact_matches as (
  select
    p.id,
    p.full_name,
    p.type,
    p.description,
    p.url,
    1.1 as similarity_score
  from people p, input i
  where
    p.full_name ilike '%' || i.query || '%'
    or p.description ilike '%' || i.query || '%'
)
select *
from (
  select * from semantic_matches
  union
  select * from exact_matches
) combined
order by similarity_score desc
limit 20;
$function$
;

CREATE OR REPLACE FUNCTION public.hybrid_search_people(query_input text, embedding_input vector, min_similarity double precision DEFAULT 0.75)
 RETURNS TABLE(id uuid, full_name text, type text, description text, url text, similarity_score double precision)
 LANGUAGE sql
AS $function$
with input as (
  select
    query_input as query,
    embedding_input as embedding
),
semantic_matches as (
  select
    p.id,
    p.full_name,
    p.type,
    p.description,
    p.url,
    1 - (p.description_embedding <=> i.embedding) as similarity_score
  from people p, input i
),
exact_matches as (
  select
    p.id,
    p.full_name,
    p.type,
    p.description,
    p.url,
    1.1 as similarity_score
  from people p, input i
  where
    p.full_name ilike '%' || i.query || '%'
    or p.description ilike '%' || i.query || '%'
    or p.type ilike '%' || i.query || '%' -- <== added type field match
)
select *
from (
  select * from semantic_matches
  union
  select * from exact_matches
) combined
where similarity_score >= min_similarity
order by similarity_score desc;
$function$
;

CREATE OR REPLACE FUNCTION public.match_documents(query_embedding vector)
 RETURNS TABLE(id uuid, similarity double precision)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    books.id,
    1 - (books.description_embedding <=> query_embedding) as similarity
  FROM books
  WHERE 1 - (books.description_embedding <=> query_embedding) > 0.78
  ORDER BY similarity DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    new.updated_at = now();
    return new;
end;
$function$
;

grant delete on table "public"."books" to "anon";

grant insert on table "public"."books" to "anon";

grant references on table "public"."books" to "anon";

grant select on table "public"."books" to "anon";

grant trigger on table "public"."books" to "anon";

grant truncate on table "public"."books" to "anon";

grant update on table "public"."books" to "anon";

grant delete on table "public"."books" to "authenticated";

grant insert on table "public"."books" to "authenticated";

grant references on table "public"."books" to "authenticated";

grant select on table "public"."books" to "authenticated";

grant trigger on table "public"."books" to "authenticated";

grant truncate on table "public"."books" to "authenticated";

grant update on table "public"."books" to "authenticated";

grant delete on table "public"."books" to "service_role";

grant insert on table "public"."books" to "service_role";

grant references on table "public"."books" to "service_role";

grant select on table "public"."books" to "service_role";

grant trigger on table "public"."books" to "service_role";

grant truncate on table "public"."books" to "service_role";

grant update on table "public"."books" to "service_role";

grant delete on table "public"."pending_contributions" to "anon";

grant insert on table "public"."pending_contributions" to "anon";

grant references on table "public"."pending_contributions" to "anon";

grant select on table "public"."pending_contributions" to "anon";

grant trigger on table "public"."pending_contributions" to "anon";

grant truncate on table "public"."pending_contributions" to "anon";

grant update on table "public"."pending_contributions" to "anon";

grant delete on table "public"."pending_contributions" to "authenticated";

grant insert on table "public"."pending_contributions" to "authenticated";

grant references on table "public"."pending_contributions" to "authenticated";

grant select on table "public"."pending_contributions" to "authenticated";

grant trigger on table "public"."pending_contributions" to "authenticated";

grant truncate on table "public"."pending_contributions" to "authenticated";

grant update on table "public"."pending_contributions" to "authenticated";

grant delete on table "public"."pending_contributions" to "service_role";

grant insert on table "public"."pending_contributions" to "service_role";

grant references on table "public"."pending_contributions" to "service_role";

grant select on table "public"."pending_contributions" to "service_role";

grant trigger on table "public"."pending_contributions" to "service_role";

grant truncate on table "public"."pending_contributions" to "service_role";

grant update on table "public"."pending_contributions" to "service_role";

grant delete on table "public"."people" to "anon";

grant insert on table "public"."people" to "anon";

grant references on table "public"."people" to "anon";

grant select on table "public"."people" to "anon";

grant trigger on table "public"."people" to "anon";

grant truncate on table "public"."people" to "anon";

grant update on table "public"."people" to "anon";

grant delete on table "public"."people" to "authenticated";

grant insert on table "public"."people" to "authenticated";

grant references on table "public"."people" to "authenticated";

grant select on table "public"."people" to "authenticated";

grant trigger on table "public"."people" to "authenticated";

grant truncate on table "public"."people" to "authenticated";

grant update on table "public"."people" to "authenticated";

grant delete on table "public"."people" to "service_role";

grant insert on table "public"."people" to "service_role";

grant references on table "public"."people" to "service_role";

grant select on table "public"."people" to "service_role";

grant trigger on table "public"."people" to "service_role";

grant truncate on table "public"."people" to "service_role";

grant update on table "public"."people" to "service_role";

grant delete on table "public"."recommendations" to "anon";

grant insert on table "public"."recommendations" to "anon";

grant references on table "public"."recommendations" to "anon";

grant select on table "public"."recommendations" to "anon";

grant trigger on table "public"."recommendations" to "anon";

grant truncate on table "public"."recommendations" to "anon";

grant update on table "public"."recommendations" to "anon";

grant delete on table "public"."recommendations" to "authenticated";

grant insert on table "public"."recommendations" to "authenticated";

grant references on table "public"."recommendations" to "authenticated";

grant select on table "public"."recommendations" to "authenticated";

grant trigger on table "public"."recommendations" to "authenticated";

grant truncate on table "public"."recommendations" to "authenticated";

grant update on table "public"."recommendations" to "authenticated";

grant delete on table "public"."recommendations" to "service_role";

grant insert on table "public"."recommendations" to "service_role";

grant references on table "public"."recommendations" to "service_role";

grant select on table "public"."recommendations" to "service_role";

grant trigger on table "public"."recommendations" to "service_role";

grant truncate on table "public"."recommendations" to "service_role";

grant update on table "public"."recommendations" to "service_role";

create policy "Allow anon + auth to update"
on "public"."books"
as permissive
for update
to anon, authenticated
using (true)
with check (true);


create policy "Anyone can read books"
on "public"."books"
as permissive
for select
to public
using (true);


create policy "Enable insert for anon + auth users only"
on "public"."books"
as permissive
for insert
to authenticated, anon
with check (true);


create policy "Enable delete for service role"
on "public"."pending_contributions"
as permissive
for delete
to service_role
using (true);


create policy "Enable insert to all"
on "public"."pending_contributions"
as permissive
for insert
to public
with check (true);


create policy "Enable read for service role"
on "public"."pending_contributions"
as permissive
for select
to service_role
using (true);


create policy "Enable update for service role"
on "public"."pending_contributions"
as permissive
for update
to service_role
using (true)
with check (true);


create policy "Allow inserts for anon + auth on people"
on "public"."people"
as permissive
for insert
to authenticated, anon
with check (true);


create policy "Anon + auth can update"
on "public"."people"
as permissive
for update
to anon, authenticated
using (true)
with check (true);


create policy "Anyone can read people"
on "public"."people"
as permissive
for select
to authenticated, anon
using (true);


create policy "No deletes allowed on people"
on "public"."people"
as permissive
for delete
to authenticated, anon
using (false);


create policy "Allow inserts from anon + auth on recommendations"
on "public"."recommendations"
as permissive
for insert
to authenticated, anon
with check (true);


create policy "Anyone can read recommendations"
on "public"."recommendations"
as permissive
for select
to authenticated, anon
using (true);


create policy "No deletes allowed on recommendations"
on "public"."recommendations"
as permissive
for delete
to authenticated, anon
using (false);


create policy "No updates allowed on recommendations"
on "public"."recommendations"
as permissive
for update
to authenticated, anon
with check (false);



create extension if not exists "vector" with schema "extensions";
