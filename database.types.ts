export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
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
          title?: string
          title_embedding?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pending_contributions: {
        Row: {
          approval_token: string | null
          book_ids: string[] | null
          books: Json
          created_at: string | null
          id: string
          person_name: string
          person_url: string | null
          status: string | null
        }
        Insert: {
          approval_token?: string | null
          book_ids?: string[] | null
          books: Json
          created_at?: string | null
          id?: string
          person_name: string
          person_url?: string | null
          status?: string | null
        }
        Update: {
          approval_token?: string | null
          book_ids?: string[] | null
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
          type: Database["public"]["Enums"]["recommender_type"] | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          type?: Database["public"]["Enums"]["recommender_type"] | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          type?: Database["public"]["Enums"]["recommender_type"] | null
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
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
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
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          title: string
          author: string
          description: string
          genre: string[]
          amazon_url: string
          recommendations: Json
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
      get_books_by_similar_recommenders: {
        Args: { p_person_id: string; p_limit?: number }
        Returns: {
          id: string
          title: string
          author: string
          genre: string[]
          amazon_url: string
          recommenders: string
          recommender_types: string
          recommender_count: number
        }[]
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
          title: string
          title_embedding: string | null
          updated_at: string
        }[]
      }
      get_random_book_with_recommendations: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          title: string
          author: string
          year: number
          description: string
          cover_image: string
          recommendations: Json
        }[]
      }
      get_recommendation_graph: {
        Args: Record<PropertyKey, never>
        Returns: {
          person1_name: string
          person1_type: string
          person2_name: string
          person2_type: string
          shared_books: number
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
        Args: { p_person_id: string }
        Returns: {
          id: string
          full_name: string
          url: string
          type: string
          recommendation_count: number
          books: Json
        }[]
      }
      get_related_books: {
        Args: { book_id: number; limit_count?: number }
        Returns: {
          id: number
          title: string
          author: string
          genres: string
          amazon_url: string
          recommender_count: number
        }[]
      }
      get_related_recommenders: {
        Args: { p_recommender_id: string; p_limit?: number }
        Returns: {
          id: string
          full_name: string
          url: string
          type: Database["public"]["Enums"]["recommender_type"]
          shared_books: string
          shared_count: number
        }[]
      }
      get_shared_recommendations: {
        Args: Record<PropertyKey, never>
        Returns: {
          person1_id: string
          person1_name: string
          person2_id: string
          person2_name: string
          shared_books_count: number
          shared_books: string[]
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
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
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
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      recommender_type:
        | "Technologist or Mathematician"
        | "Librarian or Teacher"
        | "Entrepreneur or Startup Founder"
        | "Historian, Philosopher, or Theologian"
        | "Anthropologist or Social Scientist"
        | "Biologist, Physicist, or Medical Scientist"
        | "Economist or Policy Expert"
        | "Architect or Design Expert"
        | "Broadcaster, Journalist, or Media Commentator"
        | "Venture Capitalist or Investor"
        | "Author or Writer"
        | "Musician, Music Critic, or Filmmaker"
        | "Biographer or Memoirist"
        | "Cook, Food Writer, or Culinary Expert"
        | "Comedian, Magician, or Entertainer"
        | "Business Leader or Executive"
        | "Product Manager, Designer, or Engineer"
        | "Art Historian, Critic, or Visual Artist"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      recommender_type: [
        "Technologist or Mathematician",
        "Librarian or Teacher",
        "Entrepreneur or Startup Founder",
        "Historian, Philosopher, or Theologian",
        "Anthropologist or Social Scientist",
        "Biologist, Physicist, or Medical Scientist",
        "Economist or Policy Expert",
        "Architect or Design Expert",
        "Broadcaster, Journalist, or Media Commentator",
        "Venture Capitalist or Investor",
        "Author or Writer",
        "Musician, Music Critic, or Filmmaker",
        "Biographer or Memoirist",
        "Cook, Food Writer, or Culinary Expert",
        "Comedian, Magician, or Entertainer",
        "Business Leader or Executive",
        "Product Manager, Designer, or Engineer",
        "Art Historian, Critic, or Visual Artist",
      ],
    },
  },
} as const

