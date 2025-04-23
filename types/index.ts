// Related book type for book detail page
export interface RelatedBook {
  id: string;
  title: string;
  author: string;
  description: string | null;
  amazon_url: string | null;
  _recommendationCount: number;
}

// Related recommender type for recommender detail page
export interface RelatedRecommender {
  id: string;
  full_name: string;
  url: string | null;
  type: string;
  shared_books: string[];
  shared_count: number;
}

// Main extended recommender type
export interface FormattedRecommender {
  id: string;
  full_name: string;
  type: string | null;
  url: string | null;
  description: string | null;
  recommendations: {
    id: string;
    title: string;
    author: string;
    description: string | null;
    genre: string[] | null;
    amazon_url: string | null;
    source: string | null;
    source_link: string | null;
  }[];
  related_recommenders: RelatedRecommender[];
  _book_count: number;
  _percentile: number;
}

// Main extended book type
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