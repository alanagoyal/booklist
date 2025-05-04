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
    "type" text,
    "description" text,
    "description_embedding" vector(1536)
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

-- Basic book data with counts and percentiles
drop function if exists get_books_with_counts(integer, integer);
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
  similar_books jsonb,
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
      books.similar_books,
      COUNT(DISTINCT r.person_id)::int as recommendation_count
    FROM books
    INNER JOIN recommendations r ON books.id = r.book_id
    GROUP BY books.id, books.title, books.author, books.description, books.genre, books.amazon_url, books.similar_books
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
    NTILE(100) OVER (ORDER BY bc.recommendation_count)::float as percentile
  FROM book_counts bc
  ORDER BY bc.recommendation_count DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Get recommendations for specific books
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

-- Get related books
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
$$;

-- Get related recommenders based on shared books
create or replace function get_related_recommenders(p_recommender_ids uuid[])
returns table (
  recommender_id uuid,
  related_recommenders jsonb
)
language plpgsql
security definer
as $$
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
        recommender1,
        recommender2,
        shared_count,
        shared_books,
        row_number() over (partition by recommender1 order by shared_count desc) as rn
      from shared_books
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
$$;

-- Get all recommender data
drop function if exists get_recommender_with_books();
create or replace function get_recommender_with_books()
returns table (
  id uuid,
  full_name text,
  type text,
  url text,
  description text,
  recommendations jsonb,
  related_recommenders jsonb,
  similar_people jsonb,
  _book_count bigint,
  _percentile numeric
)
language plpgsql
security definer
as $$
declare
  max_books bigint;
  recommender_ids uuid[];
begin
  -- Get max book count for percentile calculation
  select max(book_count) into max_books
  from (
    select count(*) as book_count
    from recommendations r
    join people p on p.id = r.person_id
    group by p.id
  ) counts;

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
        round((count(b.id)::numeric / max_books::numeric * 100)::numeric, 2) as percentile
      from people p
      inner join recommendations r on r.person_id = p.id
      inner join books b on b.id = r.book_id
      group by p.id, p.full_name, p.type, p.url, p.description, p.similar_people
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
      rb.percentile as _percentile
    from recommender_base rb
    left join related r on r.recommender_id = rb.id
    order by rb.full_name;
end;
$$;

-- Get similar person embeddings
create or replace function get_similar_people_by_description_embedding(
  person_id_arg uuid
)
returns table (
  person_id uuid,
  full_name text,
  type text,
  similarity float
)
language sql
as $$
  with source_embedding as (
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
  limit 3
$$;

-- Get similar book embeddings
create or replace function get_similar_books_to_book_by_description(
  book_id_arg uuid
)
returns table (
  id uuid,
  title text,
  author text,
  genre text[],
  description text,
  amazon_url text,
  similarity float
)
language sql
as $$
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
$$;

-- Books search function
create or replace function hybrid_search_books(
  query_input text,
  embedding_input vector,
  min_similarity float default 0.75
)
returns table (
  id uuid,
  title text,
  author text,
  description text,
  genre text[],
  similarity_score float
)
language sql
as $$
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
$$;

-- People search function
create or replace function hybrid_search_people(
  query_input text,
  embedding_input vector,
  min_similarity float default 0.75
)
returns table (
  id uuid,
  full_name text,
  type text,
  description text,
  url text,
  similarity_score float
)
language sql
as $$
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
