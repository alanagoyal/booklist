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
          cover_url: string | null
          created_at: string
          description: string | null
          description_embedding: string | null
          genre: string[]
          id: string
          title: string
          title_embedding: string | null
          updated_at: string
        }
        Insert: {
          amazon_url?: string | null
          author: string
          author_embedding?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          description_embedding?: string | null
          genre: string[]
          id?: string
          title: string
          title_embedding?: string | null
          updated_at?: string
        }
        Update: {
          amazon_url?: string | null
          author?: string
          author_embedding?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          description_embedding?: string | null
          genre?: string[]
          id?: string
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
          full_name: string
          id: string
          type: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          type?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
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
      get_books_by_recommendation_count: {
        Args: {
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          title: string
          author: string
          description: string
          genre: string[]
          amazon_url: string
          recommendations: Json
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
      get_books_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_random_book: {
        Args: Record<PropertyKey, never>
        Returns: {
          amazon_url: string | null
          author: string
          author_embedding: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          description_embedding: string | null
          genre: string[]
          id: string
          title: string
          title_embedding: string | null
          updated_at: string
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
      get_related_recommenders: {
        Args: { p_recommender_id: string; p_limit?: number }
        Returns: {
          id: string
          full_name: string
          url: string
          type: string
          shared_books: string
          shared_count: number
        }[]
      }
      get_recommender_details: {
        Args: {
          p_recommender_id: string
        }
        Returns: {
          id: string
          full_name: string
          url: string | null
          type: string | null
          recommendations: Json
          related_recommenders: Json
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
