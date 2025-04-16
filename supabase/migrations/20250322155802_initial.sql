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
    "description_embedding" vector(1536)
);


alter table "public"."books" enable row level security;

create table "public"."people" (
    "id" uuid not null default uuid_generate_v4(),
    "full_name" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "url" text,
    "type" text
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

CREATE INDEX idx_recommendations_book_id ON public.recommendations USING btree (book_id);

CREATE INDEX idx_recommendations_person_id ON public.recommendations USING btree (person_id);

CREATE UNIQUE INDEX people_pkey ON public.people USING btree (id);

CREATE UNIQUE INDEX recommendations_pkey ON public.recommendations USING btree (id);

CREATE UNIQUE INDEX unique_person_book ON public.recommendations USING btree (person_id, book_id);

CREATE UNIQUE INDEX unique_title_author ON public.books USING btree (title, author);

alter table "public"."books" add constraint "books_pkey" PRIMARY KEY using index "books_pkey";

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

CREATE OR REPLACE FUNCTION public.match_documents_weighted(
  query_embedding vector,
  similarity_threshold double precision DEFAULT 0.3,
  match_count integer DEFAULT 50
)
RETURNS TABLE(id uuid, similarity double precision)
LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  WITH similarity_scores AS (
    SELECT
      books.id,
      (
        -- Prioritize description matches as they contain the most semantic information
        0.5 * (1 - (books.description_embedding <=> query_embedding)) +
        -- Title is second most important for semantic matching
        0.3 * (1 - (books.title_embedding <=> query_embedding)) +
        -- Author has least weight as it's usually less semantically relevant
        0.2 * (1 - (books.author_embedding <=> query_embedding))
      ) as similarity
    FROM books
    WHERE 
      books.title_embedding IS NOT NULL AND
      books.author_embedding IS NOT NULL AND
      books.description_embedding IS NOT NULL
  )
  SELECT id, similarity
  FROM similarity_scores
  WHERE similarity >= similarity_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$function$;

-- Optimized version of get_books_by_recommendation_count with pagination
DROP FUNCTION IF EXISTS get_books_by_recommendation_count();
create or replace function get_books_by_recommendation_count(
  p_limit int default 1000,
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
DROP FUNCTION IF EXISTS get_recommender_details();
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
