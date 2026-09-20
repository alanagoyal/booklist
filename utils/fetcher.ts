import type { FormattedRecommender } from "@/types";

export default async function fetcher(url: string): Promise<any> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url}: ${response.status}`);
  }
  return response.json();
}

export async function fetchRecommenders(url: string): Promise<FormattedRecommender[]> {
  return await fetcher(url);
}
