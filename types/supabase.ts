export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      books: {
        Row: {
          amazon_url: string | null
          author: string
          author_embedding: string | null
          created_at: string
          description: string | null
          description_embedding: string | null
          genre: string[]
          id: string
          similar_books: Json | null
          title: string
          title_embedding: string | null
          updated_at: string
        }
        Insert: {
          amazon_url?: string | null
          author: string
          author_embedding?: string | null
          created_at?: string
          description?: string | null
          description_embedding?: string | null
          genre: string[]
          id?: string
          similar_books?: Json | null
          title: string
          title_embedding?: string | null
          updated_at?: string
        }
        Update: {
          amazon_url?: string | null
          author?: string
          author_embedding?: string | null
          created_at?: string
          description?: string | null
          description_embedding?: string | null
          genre?: string[]
          id?: string
          similar_books?: Json | null
          title?: string
          title_embedding?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pending_contributions: {
        Row: {
          approval_token: string | null
          books: Json
          created_at: string | null
          id: string
          person_name: string
          person_url: string | null
          status: string | null
        }
        Insert: {
          approval_token?: string | null
          books: Json
          created_at?: string | null
          id?: string
          person_name: string
          person_url?: string | null
          status?: string | null
        }
        Update: {
          approval_token?: string | null
          books?: Json
          created_at?: string | null
          id?: string
          person_name?: string
          person_url?: string | null
          status?: string | null
        }
        Relationships: []
      }
      people: {
        Row: {
          created_at: string
          description: string | null
          description_embedding: string | null
          full_name: string
          id: string
          similar_people: Json | null
          type: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_embedding?: string | null
          full_name: string
          id?: string
          similar_people?: Json | null
          type?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          description_embedding?: string | null
          full_name?: string
          id?: string
          similar_people?: Json | null
          type?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          book_id: string
          created_at: string
          id: string
          person_id: string
          source: string
          source_link: string | null
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          person_id: string
          source: string
          source_link?: string | null
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          person_id?: string
          source?: string
          source_link?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_similar_books: {
        Args: { p_title: string; p_author: string }
        Returns: {
          id: string
          title: string
          author: string
          title_similarity: number
          author_similarity: number
        }[]
      }
      get_best_matching_book: {
        Args: { p_title_embedding: string; p_author_embedding: string }
        Returns: {
          id: string
          title: string
          author: string
          title_similarity: number
          author_similarity: number
        }[]
      }
      get_book_recommendations: {
        Args: { book_ids: string[] }
        Returns: Json
      }
      get_books_by_embedding_similarity: {
        Args: { embedding: string; match_count?: number }
        Returns: {
          id: string
          title: string
          author: string
          genre: string
          description: string
          amazon_url: string
          similarity: number
        }[]
      }
      get_books_by_recommendation_count: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          id: string
          title: string
          author: string
          description: string
          genre: string[]
          amazon_url: string
          recommendations: Json
          _recommendation_count: number
          _percentile: number
          related_books: Json
        }[]
      }
      get_books_by_recommender: {
        Args: { p_recommender_id: string }
        Returns: {
          id: string
          title: string
          author: string
          description: string
          genre: string[]
          amazon_url: string
          created_at: string
          updated_at: string
          source: string
          source_link: string
        }[]
      }
      get_books_by_shared_recommenders: {
        Args: { p_book_id: string; p_limit?: number }
        Returns: {
          id: string
          title: string
          author: string
          genres: string[]
          amazon_url: string
          recommender_count: number
          recommenders: string
          recommender_types: string
        }[]
      }
      get_books_by_single_type: {
        Args: Record<PropertyKey, never>
        Returns: {
          book_id: string
          title: string
          only_type: string
        }[]
      }
      get_books_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_books_with_counts: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          id: string
          title: string
          author: string
          description: string
          genre: string[]
          amazon_url: string
          similar_books: Json
          _recommendation_count: number
          _percentile: number
        }[]
      }
      get_books_with_most_type_diversity: {
        Args: { limit_arg?: number }
        Returns: {
          book_id: string
          title: string
          type_count: number
        }[]
      }
      get_books_with_type_diversity: {
        Args: { limit_arg?: number }
        Returns: {
          book_id: string
          title: string
          type_count: number
        }[]
      }
      get_description_embedding_for_person: {
        Args: { person_id_arg: string }
        Returns: {
          embedding: string
        }[]
      }
      get_description_embedding_for_type: {
        Args: { type_arg: string }
        Returns: {
          embedding: string
        }[]
      }
      get_dissimilar_books_with_high_overlap: {
        Args: { limit_arg?: number }
        Returns: {
          book1_id: string
          book1_title: string
          book2_id: string
          book2_title: string
          similarity: number
          shared_recommender_count: number
        }[]
      }
      get_dissimilar_people_with_high_overlap: {
        Args: { limit_arg?: number }
        Returns: {
          person1_id: string
          person1_name: string
          person2_id: string
          person2_name: string
          similarity: number
          shared_book_count: number
        }[]
      }
      get_genre_count_by_type: {
        Args: Record<PropertyKey, never>
        Returns: {
          type: string
          genre_count: number
        }[]
      }
      get_genre_diverse_recommenders: {
        Args: { limit_arg?: number }
        Returns: {
          person_id: string
          full_name: string
          genre_count: number
        }[]
      }
      get_genre_outliers_in_type: {
        Args: Record<PropertyKey, never>
        Returns: {
          person_id: string
          full_name: string
          type: string
          genre_count: number
        }[]
      }
      get_genre_overlap_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          genre: string
          avg_books_per_recommender: number
          avg_recommenders_per_book: number
        }[]
      }
      get_influential_recommenders: {
        Args: { limit_arg?: number }
        Returns: {
          person_id: string
          full_name: string
          influence_score: number
        }[]
      }
      get_most_diverse_recommenders: {
        Args: { limit_arg?: number }
        Returns: {
          person_id: string
          full_name: string
          genre_count: number
        }[]
      }
      get_most_recommended_books: {
        Args: { limit_arg?: number }
        Returns: {
          book_id: string
          title: string
          recommendation_count: number
        }[]
      }
      get_most_similar_types: {
        Args: { limit_arg?: number }
        Returns: {
          type1: string
          type2: string
          shared_book_count: number
        }[]
      }
      get_person_embedding_centroid: {
        Args: { person_id_arg: string }
        Returns: {
          embedding: string
        }[]
      }
      get_personalized_recommendations: {
        Args: {
          p_user_type: string;
          p_genres: string[];
          p_inspiration_ids: string[];
          p_favorite_book_ids: string[];
          p_limit?: number;
        };
        Returns: {
          id: string;
          title: string;
          author: string;
          description: string | null;
          score: number;
          match_reasons: {
            similar_to_favorites: boolean;
            recommended_by_inspiration: boolean;
            recommended_by_similar_people: boolean;
            genre_match: boolean;
            recommended_by_similar_type: boolean;
          };
        }[];
      }
      get_random_book: {
        Args: Record<PropertyKey, never>
        Returns: {
          amazon_url: string | null
          author: string
          author_embedding: string | null
          created_at: string
          description: string | null
          description_embedding: string | null
          genre: string[]
          id: string
          similar_books: Json | null
          title: string
          title_embedding: string | null
          updated_at: string
        }[]
      }
      get_recommendation_distribution: {
        Args: Record<PropertyKey, never>
        Returns: {
          book_id: string
          title: string
          recommendation_count: number
        }[]
      }
      get_recommendation_network: {
        Args: Record<PropertyKey, never>
        Returns: {
          source_id: string
          source_name: string
          source_type: string
          target_id: string
          target_name: string
          target_type: string
          shared_book_count: number
          shared_book_titles: string[]
        }[]
      }
      get_recommender_details: {
        Args: { p_recommender_id: string }
        Returns: {
          id: string
          full_name: string
          url: string
          type: string
          description: string
          recommendations: Json
          related_recommenders: Json
        }[]
      }
      get_recommender_with_books: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          full_name: string
          type: string
          url: string
          description: string
          recommendations: Json
          related_recommenders: Json
          similar_people: Json
          _book_count: number
          _percentile: number
        }[]
      }
      get_related_books: {
        Args: { book_ids: string[]; p_limit?: number }
        Returns: Json
      }
      get_related_recommenders: {
        Args:
          | { p_recommender_id: string; p_limit?: number }
          | { p_recommender_ids: string[] }
        Returns: {
          id: string
          full_name: string
          url: string
          type: string
          shared_books: string
          shared_count: number
        }[]
      }
      get_semantic_book_pairs_with_low_overlap: {
        Args: { limit_arg?: number }
        Returns: {
          book1_id: string
          book1_title: string
          book2_id: string
          book2_title: string
          similarity: number
          shared_recommender_count: number
        }[]
      }
      get_semantic_person_pairs_with_low_overlap: {
        Args: { limit_arg?: number }
        Returns: {
          person1_id: string
          person1_name: string
          person2_id: string
          person2_name: string
          similarity: number
          shared_book_count: number
        }[]
      }
      get_similar_books_by_description: {
        Args: { embedding: string; match_count?: number }
        Returns: {
          id: string
          title: string
          author: string
          genre: string[]
          description: string
          amazon_url: string
          similarity: number
        }[]
      }
      get_similar_books_to_book_by_description: {
        Args: { book_id_arg: string }
        Returns: {
          id: string
          title: string
          author: string
          genre: string[]
          description: string
          amazon_url: string
          similarity: number
        }[]
      }
      get_similar_people_by_description_embedding: {
        Args: { person_id_arg: string }
        Returns: {
          person_id: string
          full_name: string
          type: string
          similarity: number
        }[]
      }
      get_sources_with_most_people: {
        Args: { limit_arg?: number }
        Returns: {
          source: string
          source_link: string
          unique_recommenders: number
        }[]
      }
      get_top_genres_by_recommenders: {
        Args: { limit_arg?: number }
        Returns: {
          genre: string
          unique_recommenders: number
        }[]
      }
      get_top_genres_by_type: {
        Args: { type_arg: string }
        Returns: {
          genre: string
          count: number
        }[]
      }
      get_top_overlapping_recommenders: {
        Args: { limit_arg?: number }
        Returns: {
          person1_id: string
          person1_name: string
          person1_type: string
          person2_id: string
          person2_name: string
          person2_type: string
          shared_book_count: number
        }[]
      }
      get_top_similar_books_with_overlap: {
        Args: { limit_arg?: number }
        Returns: {
          book1_id: string
          book1_title: string
          book2_id: string
          book2_title: string
          similarity: number
          shared_recommender_count: number
        }[]
      }
      get_top_similar_people_with_overlap: {
        Args: { limit_arg?: number }
        Returns: {
          person1_id: string
          person1_name: string
          person2_id: string
          person2_name: string
          similarity: number
          shared_book_count: number
        }[]
      }
      get_top_sources: {
        Args: { limit_arg?: number }
        Returns: {
          source: string
          source_link: string
          count: number
        }[]
      }
      get_type_embedding_centroid: {
        Args: { type_arg: string }
        Returns: {
          embedding: string
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      hybrid_search_books: {
        Args: { query_input: string; embedding_input: string }
        Returns: {
          id: string
          title: string
          author: string
          description: string
          similarity_score: number
        }[]
      }
      hybrid_search_people: {
        Args: { query_input: string; embedding_input: string }
        Returns: {
          id: string
          full_name: string
          type: string
          description: string
          url: string
          similarity_score: number
        }[]
      }
      match_documents: {
        Args: { query_embedding: string }
        Returns: {
          id: string
          similarity: number
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
