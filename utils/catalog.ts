import type { EssentialBook, FormattedRecommender } from "@/types";

export type BookRow = Pick<
  EssentialBook,
  | "id"
  | "title"
  | "author"
  | "description"
  | "genres"
  | "_bucket"
  | "recommendation_percentile"
> & { recommendations: ({ id: string; full_name: string } | null)[] };

export type PersonRow = Pick<
  FormattedRecommender,
  | "id"
  | "full_name"
  | "type"
  | "description"
  | "_book_count"
  | "_bucket"
  | "recommendation_percentile"
> & { recommendations: { id: string; title: string }[] };

export type Catalog =
  | { view: "books"; rows: BookRow[] }
  | { view: "people"; rows: PersonRow[] };

export function bookRow(book: EssentialBook): BookRow {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    description: book.description,
    genres: book.genres,
    _bucket: book._bucket,
    recommendation_percentile: book.recommendation_percentile,
    recommendations: book.recommendations.map(({ recommender }) =>
      recommender
        ? { id: recommender.id, full_name: recommender.full_name }
        : null,
    ),
  };
}

export function personRow(person: FormattedRecommender): PersonRow {
  return {
    id: person.id,
    full_name: person.full_name,
    type: person.type,
    description: person.description,
    _book_count: person._book_count,
    _bucket: person._bucket,
    recommendation_percentile: person.recommendation_percentile,
    recommendations: person.recommendations.map(({ id, title }) => ({
      id,
      title,
    })),
  };
}

const backgrounds = [
  "bg-[hsl(var(--background-l1))] md:hover:bg-[hsl(var(--background-l1-hover))]",
  "bg-[hsl(var(--background-l2))] md:hover:bg-[hsl(var(--background-l2-hover))]",
  "bg-[hsl(var(--background-l3))] md:hover:bg-[hsl(var(--background-l3-hover))]",
  "bg-[hsl(var(--background-l4))] md:hover:bg-[hsl(var(--background-l4-hover))]",
  "bg-[hsl(var(--background-l5))] md:hover:bg-[hsl(var(--background-l5-hover))]",
  "bg-[hsl(var(--background-l6))] md:hover:bg-[hsl(var(--background-l6-hover))]",
];

export function rowClassName(row: { _bucket: number }) {
  return `cursor-pointer ${backgrounds[row._bucket] ?? backgrounds[0]}`;
}
