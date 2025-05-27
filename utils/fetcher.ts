import type { FormattedRecommender } from "@/types";

export default async function fetcher(url: string): Promise<any> {
  return fetch(url).then(r => r.json());
}

export async function fetchRecommenders(url: string): Promise<FormattedRecommender[]> {
  return await fetcher(url);
}
