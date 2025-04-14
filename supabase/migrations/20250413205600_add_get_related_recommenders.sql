-- Drop existing function if it exists
drop function if exists get_related_recommenders(uuid, int);

-- Create a function to get recommenders with similar book recommendations
create or replace function get_related_recommenders(p_recommender_id uuid, p_limit int default 3)
returns table (
  id uuid,
  full_name text,
  url text,
  type recommender_type,
  shared_books text,
  shared_count bigint
) security definer
language plpgsql
as $$
begin
  return query
  with recommender_books as (
    select book_id
    from recommendations
    where person_id = p_recommender_id
  ),
  similar_recommenders as (
    select 
      r.person_id,
      count(*) as shared_count,
      string_agg(b.title, ', ' order by b.title) as shared_books
    from recommendations r
    join books b on b.id = r.book_id
    where r.book_id in (select book_id from recommender_books)
      and r.person_id != p_recommender_id
    group by r.person_id
    order by shared_count desc
    limit p_limit
  )
  select 
    p.id,
    p.full_name,
    p.url,
    p.type,
    sr.shared_books,
    sr.shared_count
  from similar_recommenders sr
  join people p on p.id = sr.person_id
  order by sr.shared_count desc;
end;
$$;
