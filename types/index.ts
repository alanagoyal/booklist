import { Database } from './supabase';

// Core database types from Supabase
export type DbBook = Database['public']['Tables']['books']['Row'];
export type DbPerson = Database['public']['Tables']['people']['Row'];
export type DbRecommendation = Database['public']['Tables']['recommendations']['Row'];
export type DbPendingContribution = Database['public']['Tables']['pending_contributions']['Row'];

// Extended database types
export interface DbBookWithRecommendations extends Omit<DbBook, 'author_embedding' | 'title_embedding' | 'description_embedding'> {
  recommendations?: {
    recommender: {
      full_name: string;
      url: string | null;
      type: string;
    } | null;
    source: string;
    source_link: string | null;
  }[];
  related_books?: {
    id: string;
    title: string;
    author: string;
    recommenders: string;
    recommender_count: number;
  }[];
}

// Core domain model extending from database types
export interface Book extends Omit<DbBookWithRecommendations, 'author_embedding' | 'title_embedding' | 'description_embedding'> {
  source?: string;
  source_link?: string;
}

// Simplified book type returned by get_books_by_recommender RPC
export interface RecommenderBook {
  id: string;
  title: string;
  author: string;
  description?: string;
  genre: string[];
  amazon_url?: string;
  source: string;
  source_link: string;
}

export interface Recommender extends Omit<DbPerson, 'created_at' | 'updated_at'> {
  recommendations?: RecommenderBook[];
}

// Type for combined recommender data from get_recommender_details RPC
export interface FormattedRecommender extends Recommender {
  recommendations: RecommenderBook[];
  related_recommenders: {
    id: string;
    full_name: string;
    url: string | null;
    type: string;
    shared_books: string;
    shared_count: number;
  }[];
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
  related_books: RelatedBook[];
}

export type RelatedBook = {
  id: string;  // UUID
  title: string;
  author: string;
  recommenders: string;
  recommender_count: number;
}

export type EnhancedBook = FormattedBook & {
  _recommendationCount: number;
  related_books?: RelatedBook[];
}

// Re-export DatabaseBook type for backward compatibility
export type DatabaseBook = DbBookWithRecommendations;
