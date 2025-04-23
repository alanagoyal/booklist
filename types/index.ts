import { Database } from './supabase';

// Generated database types
export type DbBook = Database['public']['Tables']['books']['Row'];
export type DbPerson = Database['public']['Tables']['people']['Row'];
export type DbRecommendation = Database['public']['Tables']['recommendations']['Row'];
export type DbPendingContribution = Database['public']['Tables']['pending_contributions']['Row'];

// Database types
export interface DbBookWithRecommendations {
  id: string;
  title: string;
  author: string;
  description: string | null;
  genre: string[] | null;
  amazon_url: string | null;
  author_embedding: number[];
  title_embedding: number[];
  description_embedding: number[];
}

// Core domain model types
export interface Book {
  id: string;
  title: string;
  author: string;
  description: string | null;
  genre: string[] | null;
  amazon_url: string | null;
  recommendations: BookRecommendation[];
  related_books: RelatedBook[];
  _recommendation_count: number;
  _percentile: number;
}

export interface BookRecommendation {
  recommender: {
    id: string;
    full_name: string;
    url: string | null;
    type: string | null;
  } | null;
  source: string;
  source_link: string;
}

export interface RelatedBook {
  id: string;
  title: string;
  author: string;
  description: string | null;
  amazon_url: string | null;
  _recommendationCount: number;
}

export interface RecommenderBook {
  id: string;
  title: string;
  author: string;
  description: string | null;
  genre: string[] | null;
  amazon_url: string | null;
  source: string | null;
  source_link: string | null;
}

export interface RelatedRecommender {
  id: string;
  full_name: string;
  url: string | null;
  type: string;
  shared_books: string[];
  shared_count: number;
}

export interface Recommender {
  id: string;
  full_name: string;
  type: string | null;
  url: string | null;
  description: string | null;
  recommendations: RecommenderBook[];
  related_recommenders: RelatedRecommender[];
  _book_count: number;
  _percentile: number;
}

export interface FormattedRecommender extends Recommender {}

// UI presentation types
export interface FormattedBook {
  id: string;
  title: string;
  author: string;
  description: string;
  genres: string | string[];
  amazon_url: string;
  recommendations: {
    recommender: {
      id: string;
      full_name: string;
      url: string | null;
      type: string;
    } | null;
    source: string;
    source_link: string | null;
  }[];
  _recommendation_count: number;
  _percentile: number;
  related_books: RelatedBook[];
}

// Optimized types for runtime performance
export type RecommenderReference = {
  id: string;
  full_name: string;
  recommendation_count: number;
};

export type EnhancedBook = FormattedBook & {
  _recommendation_count: number;
  _percentile: number;  
};

// Re-export DatabaseBook type for backward compatibility
export type DatabaseBook = DbBookWithRecommendations;
