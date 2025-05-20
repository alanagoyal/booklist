import type { FormattedRecommender } from "@/types";

export default async function fetcher(url: string): Promise<any> {
  return fetch(url).then(r => r.json());
}

export async function fetchRecommenders(url: string): Promise<FormattedRecommender[]> {
  const data = await fetcher(url);
  return data.sort((a: FormattedRecommender, b: FormattedRecommender) => 
    (b._book_count || 0) - (a._book_count || 0)
  );
}
