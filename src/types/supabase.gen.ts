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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_credentials: {
        Row: {
          anthropic_key_encrypted: string | null
          default_card_count: number
          default_engine: string
          default_tone: string
          google_ai_key_encrypted: string | null
          monthly_budget_usd: number | null
          openai_key_encrypted: string | null
          planning_model: string
          research_model: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anthropic_key_encrypted?: string | null
          default_card_count?: number
          default_engine?: string
          default_tone?: string
          google_ai_key_encrypted?: string | null
          monthly_budget_usd?: number | null
          openai_key_encrypted?: string | null
          planning_model?: string
          research_model?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anthropic_key_encrypted?: string | null
          default_card_count?: number
          default_engine?: string
          default_tone?: string
          google_ai_key_encrypted?: string | null
          monthly_budget_usd?: number | null
          openai_key_encrypted?: string | null
          planning_model?: string
          research_model?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      brand_profiles: {
        Row: {
          color_primary: string
          color_secondary: string
          color_text: string
          created_at: string
          font_primary: string
          font_secondary: string | null
          id: string
          is_default: boolean
          logo_url: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color_primary?: string
          color_secondary?: string
          color_text?: string
          created_at?: string
          font_primary?: string
          font_secondary?: string | null
          id?: string
          is_default?: boolean
          logo_url?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color_primary?: string
          color_secondary?: string
          color_text?: string
          created_at?: string
          font_primary?: string
          font_secondary?: string | null
          id?: string
          is_default?: boolean
          logo_url?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          body: string
          card_order: number
          created_at: string
          cta: string | null
          engine: string | null
          headline: string
          id: string
          image_prompt: string | null
          image_url: string | null
          project_id: string
          rendered_url: string | null
          role: Database["public"]["Enums"]["card_role"]
          updated_at: string
        }
        Insert: {
          body?: string
          card_order: number
          created_at?: string
          cta?: string | null
          engine?: string | null
          headline?: string
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          project_id: string
          rendered_url?: string | null
          role: Database["public"]["Enums"]["card_role"]
          updated_at?: string
        }
        Update: {
          body?: string
          card_order?: number
          created_at?: string
          cta?: string | null
          engine?: string | null
          headline?: string
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          project_id?: string
          rendered_url?: string | null
          role?: Database["public"]["Enums"]["card_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_accounts: {
        Row: {
          access_token_encrypted: string
          connected_at: string
          fb_page_id: string
          fb_page_name: string | null
          ig_user_id: string
          ig_username: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          connected_at?: string
          fb_page_id: string
          fb_page_name?: string | null
          ig_user_id: string
          ig_username?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          connected_at?: string
          fb_page_id?: string
          fb_page_name?: string | null
          ig_user_id?: string
          ig_username?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          card_outline: Json
          confirmed_at: string | null
          created_at: string
          id: string
          key_message: string
          project_id: string
          target_persona: string
        }
        Insert: {
          card_outline: Json
          confirmed_at?: string | null
          created_at?: string
          id?: string
          key_message: string
          project_id: string
          target_persona: string
        }
        Update: {
          card_outline?: Json
          confirmed_at?: string | null
          created_at?: string
          id?: string
          key_message?: string
          project_id?: string
          target_persona?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          brand_override: Json | null
          brand_profile_id: string | null
          caption: string | null
          card_count: number
          created_at: string
          hashtags: string[] | null
          id: string
          published_at: string | null
          published_permalink: string | null
          published_post_id: string | null
          status: Database["public"]["Enums"]["project_status"]
          tone: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_override?: Json | null
          brand_profile_id?: string | null
          caption?: string | null
          card_count?: number
          created_at?: string
          hashtags?: string[] | null
          id?: string
          published_at?: string | null
          published_permalink?: string | null
          published_post_id?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          tone?: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_override?: Json | null
          brand_profile_id?: string | null
          caption?: string | null
          card_count?: number
          created_at?: string
          hashtags?: string[] | null
          id?: string
          published_at?: string | null
          published_permalink?: string | null
          published_post_id?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          tone?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_brand_profile_id_fkey"
            columns: ["brand_profile_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      research_reports: {
        Row: {
          confirmed_at: string | null
          content: Json
          created_at: string
          id: string
          project_id: string
        }
        Insert: {
          confirmed_at?: string | null
          content: Json
          created_at?: string
          id?: string
          project_id: string
        }
        Update: {
          confirmed_at?: string | null
          content?: Json
          created_at?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          cached_input_tokens: number | null
          cost_usd: number
          created_at: string
          id: string
          image_count: number | null
          image_quality: string | null
          input_tokens: number | null
          metadata: Json | null
          model: string
          operation: Database["public"]["Enums"]["ai_operation"]
          output_tokens: number | null
          project_id: string | null
          user_id: string
        }
        Insert: {
          cached_input_tokens?: number | null
          cost_usd?: number
          created_at?: string
          id?: string
          image_count?: number | null
          image_quality?: string | null
          input_tokens?: number | null
          metadata?: Json | null
          model: string
          operation: Database["public"]["Enums"]["ai_operation"]
          output_tokens?: number | null
          project_id?: string | null
          user_id: string
        }
        Update: {
          cached_input_tokens?: number | null
          cost_usd?: number
          created_at?: string
          id?: string
          image_count?: number | null
          image_quality?: string | null
          input_tokens?: number | null
          metadata?: Json | null
          model?: string
          operation?: Database["public"]["Enums"]["ai_operation"]
          output_tokens?: number | null
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ai_operation: "research" | "plan" | "copy" | "image" | "metadata" | "misc"
      card_role:
        | "hook"
        | "problem"
        | "solution"
        | "proof"
        | "cta"
        | "detail"
        | "cover"
      project_status:
        | "draft"
        | "researching"
        | "planning"
        | "copywriting"
        | "imaging"
        | "completed"
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
      ai_operation: ["research", "plan", "copy", "image", "metadata", "misc"],
      card_role: [
        "hook",
        "problem",
        "solution",
        "proof",
        "cta",
        "detail",
        "cover",
      ],
      project_status: [
        "draft",
        "researching",
        "planning",
        "copywriting",
        "imaging",
        "completed",
      ],
    },
  },
} as const
