-- Drop existing function if it exists
drop function if exists get_books_by_recommender(uuid);

-- Create a function to get all books recommended by a person
create or replace function get_books_by_recommender(p_recommender_id uuid)
returns table (
  id uuid,
  title text,
  author text,
  description text,
  genre text[],
  amazon_url text,
  created_at timestamptz,
  updated_at timestamptz,
  source text,
  source_link text
) security definer
language plpgsql
as $$
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
$$;
