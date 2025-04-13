// Core domain model
export interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  genre: string[];
  amazon_url?: string;
  created_at: string;
  updated_at: string;
  recommendations?: {
    person_id: string;
    source: string;
    source_link?: string;
    recommender_name?: string;
  }[];
}

// Database layer types
export interface DatabaseRecommendation {
  source: string;
  source_link: string | null;
  recommender: {
    full_name: string;
    url: string | null;
    type: string;
  } | null;
}

export interface DatabaseBook {
  id: string;
  title: string | null;
  author: string | null;
  description: string | null;
  genre: string[] | null;
  amazon_url: string | null;
  recommendations: DatabaseRecommendation[] | null;
}

// UI presentation types
export interface FormattedBook {
  id: string;
  title: string;
  author: string;
  description: string;
  genres: string;
  recommenders: string;
  recommender_types: string;
  source: string;
  source_link: string;
  url: string;
  amazon_url: string;
}

export type RelatedBook = {
  id: string;  // UUID
  title: string;
  author: string;
  genres: string[];
  amazon_url: string | null;
  recommender_count: number;
  recommenders: string;
  recommender_types: string;
}

export type EnhancedBook = FormattedBook & {
  _recommendationCount: number;
  related_books?: RelatedBook[];
}
