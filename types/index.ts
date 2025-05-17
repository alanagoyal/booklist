// Related book type for book detail page
export interface RelatedBook {
  id: string;
  title: string;
  author: string;
  description: string | null;
  amazon_url: string | null;
  _recommendation_count: number;
  _shared_count: number;
}

// Related recommender type for recommender detail page
export interface RelatedRecommender {
  id: string;
  full_name: string;
  url: string | null;
  type: string;
  shared_books: string[];
  _shared_count: number;
}

// Similar recommender type
export interface SimilarRecommender {
  person_id: string;
  full_name: string;
  type: string;
  similarity: number;
}

// Similar book type
export interface SimilarBook {
  id: string;
  title: string;
  author: string;
  genre: string[];
  description: string;
  amazon_url: string;
  similarity: number;
}

// Book recommendation type
export interface BookRecommendation {
  id: string;
  title: string;
  author: string;
  description: string | null;
  genre: string[] | null;
  amazon_url: string | null;
  source: string | null;
  source_link: string | null;
}

// Recommender recommendation type
export interface RecommenderRecommendation {
  recommender: {
    id: string;
    full_name: string;
    url: string | null;
    type: string;
  } | null;
  source: string | null;
  source_link: string | null;
}

// Essential book type (without extended data)
export interface EssentialBook {
  id: string;
  title: string;
  author: string;
  description: string;
  genres: string | string[];
  amazon_url: string;
  recommendations: RecommenderRecommendation[];
  _recommendation_count: number;
  recommendation_percentile: number | null;
  _bucket: number;
  _background_color?: string;
}

// Extended book data type
export interface ExtendedBook {
  id: string;
  related_books: RelatedBook[];
  similar_books: SimilarBook[];
}

// Main extended book type
export interface FormattedBook extends EssentialBook, ExtendedBook {}

// Main extended recommender type
export interface FormattedRecommender {
  id: string;
  full_name: string;
  type: string | null;
  url: string | null;
  description: string | null;
  recommendations: BookRecommendation[];
  related_recommenders: RelatedRecommender[];
  similar_recommenders: SimilarRecommender[];
  _book_count: number;
  _bucket: number;
  _background_color?: string;
  recommendation_percentile: number | null;
}
