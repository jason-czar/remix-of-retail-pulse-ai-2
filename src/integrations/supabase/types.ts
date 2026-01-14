export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_active: boolean
          last_triggered_at: string | null
          symbol: string
          threshold: number | null
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          symbol: string
          threshold?: number | null
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          symbol?: string
          threshold?: number | null
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      emotion_cache: {
        Row: {
          created_at: string | null
          emotions: Json
          expires_at: string
          id: string
          symbol: string
          time_range: string
        }
        Insert: {
          created_at?: string | null
          emotions: Json
          expires_at: string
          id?: string
          symbol: string
          time_range: string
        }
        Update: {
          created_at?: string | null
          emotions?: Json
          expires_at?: string
          id?: string
          symbol?: string
          time_range?: string
        }
        Relationships: []
      }
      emotion_history: {
        Row: {
          created_at: string
          dominant_emotion: string | null
          emotions: Json
          id: string
          message_count: number
          period_type: string
          recorded_at: string
          symbol: string
        }
        Insert: {
          created_at?: string
          dominant_emotion?: string | null
          emotions?: Json
          id?: string
          message_count?: number
          period_type: string
          recorded_at?: string
          symbol: string
        }
        Update: {
          created_at?: string
          dominant_emotion?: string | null
          emotions?: Json
          id?: string
          message_count?: number
          period_type?: string
          recorded_at?: string
          symbol?: string
        }
        Relationships: []
      }
      lens_summary_cache: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          lens: string
          message_count: number | null
          summary: string
          symbol: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          lens: string
          message_count?: number | null
          summary: string
          symbol: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          lens?: string
          message_count?: number | null
          summary?: string
          symbol?: string
        }
        Relationships: []
      }
      market_psychology_history: {
        Row: {
          created_at: string
          dominant_signal: string | null
          emotion_breakdown: Json
          fear_greed_index: number
          fear_greed_label: string
          id: string
          recorded_at: string
          signal_strength: string | null
          signals: Json
          symbol_count: number
          symbols: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          dominant_signal?: string | null
          emotion_breakdown?: Json
          fear_greed_index: number
          fear_greed_label: string
          id?: string
          recorded_at?: string
          signal_strength?: string | null
          signals?: Json
          symbol_count?: number
          symbols?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          dominant_signal?: string | null
          emotion_breakdown?: Json
          fear_greed_index?: number
          fear_greed_label?: string
          id?: string
          recorded_at?: string
          signal_strength?: string | null
          signals?: Json
          symbol_count?: number
          symbols?: string[]
          user_id?: string
        }
        Relationships: []
      }
      narrative_cache: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          message_count: number | null
          narratives: Json
          symbol: string
          time_range: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          message_count?: number | null
          narratives: Json
          symbol: string
          time_range: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          message_count?: number | null
          narratives?: Json
          symbol?: string
          time_range?: string
        }
        Relationships: []
      }
      narrative_history: {
        Row: {
          created_at: string
          dominant_narrative: string | null
          id: string
          message_count: number
          narratives: Json
          period_type: string
          recorded_at: string
          symbol: string
        }
        Insert: {
          created_at?: string
          dominant_narrative?: string | null
          id?: string
          message_count?: number
          narratives?: Json
          period_type: string
          recorded_at?: string
          symbol: string
        }
        Update: {
          created_at?: string
          dominant_narrative?: string | null
          id?: string
          message_count?: number
          narratives?: Json
          period_type?: string
          recorded_at?: string
          symbol?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          api_calls_reset_at: string
          api_calls_today: number
          company: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          updated_at: string
          user_id: string
        }
        Insert: {
          api_calls_reset_at?: string
          api_calls_today?: number
          company?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
          user_id: string
        }
        Update: {
          api_calls_reset_at?: string
          api_calls_today?: number
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      psychology_snapshots: {
        Row: {
          created_at: string
          data_confidence: Json
          historical_context: Json | null
          id: string
          interpretation: Json
          interpretation_version: number
          message_count: number
          observed_state: Json
          period_type: string
          snapshot_end: string
          snapshot_start: string
          symbol: string
          unique_authors: number
        }
        Insert: {
          created_at?: string
          data_confidence?: Json
          historical_context?: Json | null
          id?: string
          interpretation?: Json
          interpretation_version?: number
          message_count?: number
          observed_state?: Json
          period_type: string
          snapshot_end: string
          snapshot_start: string
          symbol: string
          unique_authors?: number
        }
        Update: {
          created_at?: string
          data_confidence?: Json
          historical_context?: Json | null
          id?: string
          interpretation?: Json
          interpretation_version?: number
          message_count?: number
          observed_state?: Json
          period_type?: string
          snapshot_end?: string
          snapshot_start?: string
          symbol?: string
          unique_authors?: number
        }
        Relationships: []
      }
      sentiment_cache: {
        Row: {
          created_at: string | null
          current_score: number | null
          daily_data: Json | null
          expires_at: string
          hourly_data: Json | null
          id: string
          symbol: string
          time_range: string
        }
        Insert: {
          created_at?: string | null
          current_score?: number | null
          daily_data?: Json | null
          expires_at: string
          hourly_data?: Json | null
          id?: string
          symbol: string
          time_range: string
        }
        Update: {
          created_at?: string | null
          current_score?: number | null
          daily_data?: Json | null
          expires_at?: string
          hourly_data?: Json | null
          id?: string
          symbol?: string
          time_range?: string
        }
        Relationships: []
      }
      sentiment_history: {
        Row: {
          bearish_count: number
          bullish_count: number
          created_at: string
          dominant_emotion: string | null
          dominant_narrative: string | null
          id: string
          message_volume: number
          neutral_count: number
          recorded_at: string
          sentiment_score: number
          symbol: string
        }
        Insert: {
          bearish_count?: number
          bullish_count?: number
          created_at?: string
          dominant_emotion?: string | null
          dominant_narrative?: string | null
          id?: string
          message_volume?: number
          neutral_count?: number
          recorded_at?: string
          sentiment_score: number
          symbol: string
        }
        Update: {
          bearish_count?: number
          bullish_count?: number
          created_at?: string
          dominant_emotion?: string | null
          dominant_narrative?: string | null
          id?: string
          message_volume?: number
          neutral_count?: number
          recorded_at?: string
          sentiment_score?: number
          symbol?: string
        }
        Relationships: []
      }
      volume_cache: {
        Row: {
          created_at: string | null
          daily_data: Json | null
          expires_at: string
          hourly_data: Json | null
          id: string
          message_count: number | null
          symbol: string
          time_range: string
        }
        Insert: {
          created_at?: string | null
          daily_data?: Json | null
          expires_at: string
          hourly_data?: Json | null
          id?: string
          message_count?: number | null
          symbol: string
          time_range: string
        }
        Update: {
          created_at?: string | null
          daily_data?: Json | null
          expires_at?: string
          hourly_data?: Json | null
          id?: string
          message_count?: number | null
          symbol?: string
          time_range?: string
        }
        Relationships: []
      }
      volume_history: {
        Row: {
          created_at: string
          daily_volume: number | null
          hourly_distribution: Json | null
          id: string
          message_count: number
          period_type: string
          recorded_at: string
          symbol: string
        }
        Insert: {
          created_at?: string
          daily_volume?: number | null
          hourly_distribution?: Json | null
          id?: string
          message_count?: number
          period_type?: string
          recorded_at?: string
          symbol: string
        }
        Update: {
          created_at?: string
          daily_volume?: number | null
          hourly_distribution?: Json | null
          id?: string
          message_count?: number
          period_type?: string
          recorded_at?: string
          symbol?: string
        }
        Relationships: []
      }
      watchlists: {
        Row: {
          created_at: string
          id: string
          name: string
          symbols: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          symbols?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          symbols?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_lens_cache: { Args: never; Returns: undefined }
      cleanup_old_history: { Args: never; Returns: undefined }
      cleanup_psychology_history: { Args: never; Returns: undefined }
      cleanup_psychology_snapshots: { Args: never; Returns: undefined }
      cleanup_volume_history: { Args: never; Returns: undefined }
    }
    Enums: {
      subscription_plan: "free" | "professional" | "enterprise"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      subscription_plan: ["free", "professional", "enterprise"],
    },
  },
} as const
