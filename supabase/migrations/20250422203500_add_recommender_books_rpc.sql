create or replace function get_recommender_with_books()
returns table (
  id uuid,
  full_name text,
  type text,
  description text,
  recommendations jsonb,
  _book_count bigint,
  _percentile numeric
)
language plpgsql
security definer
as $$
declare
  max_books bigint;
begin
  -- Get max book count for percentile calculation
  select max(book_count) into max_books
  from (
    select count(*) as book_count
    from recommendations r
    join people p on p.id = r.person_id
    group by p.id
  ) counts;

  return query
    select
      p.id,
      p.full_name,
      p.type,
      p.description,
      jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'title', b.title,
          'author', b.author,
          'description', b.description,
          'genre', b.genre,
          'amazon_url', b.amazon_url
        )
      ) as recommendations,
      count(*)::bigint as _book_count,
      round((count(*)::numeric / max_books::numeric * 100)::numeric, 2) as _percentile
    from people p
    left join recommendations r on r.person_id = p.id
    left join books b on b.id = r.book_id
    group by p.id, p.full_name, p.type, p.description
    order by p.full_name;
end;
$$;
