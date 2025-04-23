-- Function to get related recommenders based on shared books
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
          'shared_count', tr.shared_count
        )
      ) as related_recommenders
    from top_related tr
    join people p on p.id = tr.recommender2
    where tr.rn <= 3  -- Limit to top 3 related recommenders
    group by tr.recommender1;
end;
$$;

-- Update get_recommender_with_books to include related recommenders
create or replace function get_recommender_with_books()
returns table (
  id uuid,
  full_name text,
  type text,
  url text,
  description text,
  recommendations jsonb,
  related_recommenders jsonb,
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
  from people p;

  return query
    with recommender_base as (
      select
        p.id,
        p.full_name,
        p.type,
        p.url,
        p.description,
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
      left join recommendations r on r.person_id = p.id
      left join books b on b.id = r.book_id
      group by p.id, p.full_name, p.type, p.url, p.description
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
      rb.book_count as _book_count,
      rb.percentile as _percentile
    from recommender_base rb
    left join related r on r.recommender_id = rb.id
    order by rb.full_name;
end;
$$;
