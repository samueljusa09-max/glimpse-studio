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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target?: string | null
        }
        Relationships: []
      }
      canned_responses: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          base: string
          currency: string
          fetched_at: string
          id: string
          rate: number
          source: string
        }
        Insert: {
          base?: string
          currency: string
          fetched_at?: string
          id?: string
          rate: number
          source?: string
        }
        Update: {
          base?: string
          currency?: string
          fetched_at?: string
          id?: string
          rate?: number
          source?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          category: string
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      generations: {
        Row: {
          created_at: string
          error: string | null
          id: string
          kind: string
          params: Json
          prompt: string
          status: string
          storage_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          params?: Json
          prompt: string
          status?: string
          storage_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          params?: Json
          prompt?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_countries: {
        Row: {
          code: string
          created_at: string
          currency: string
          dial_code: string
          flag: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency: string
          dial_code?: string
          flag?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string
          dial_code?: string
          flag?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          code: string
          country_code: string
          created_at: string
          id: string
          is_active: boolean
          kind: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          country_code: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "payment_countries"
            referencedColumns: ["code"]
          },
        ]
      }
      payment_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          checkout_url: string | null
          converted_amount: number
          country_code: string | null
          created_at: string
          currency: string
          cycle: string
          error_message: string | null
          exchange_rate: number
          fee_amount: number
          gateway_transaction_id: string | null
          id: string
          mobile_number: string | null
          original_amount_usd: number
          paid_at: string | null
          payment_channel: string
          payment_method: string | null
          plan_id: string | null
          plan_name: string | null
          provider: string
          reference: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          checkout_url?: string | null
          converted_amount?: number
          country_code?: string | null
          created_at?: string
          currency?: string
          cycle?: string
          error_message?: string | null
          exchange_rate?: number
          fee_amount?: number
          gateway_transaction_id?: string | null
          id?: string
          mobile_number?: string | null
          original_amount_usd?: number
          paid_at?: string | null
          payment_channel?: string
          payment_method?: string | null
          plan_id?: string | null
          plan_name?: string | null
          provider?: string
          reference?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          checkout_url?: string | null
          converted_amount?: number
          country_code?: string | null
          created_at?: string
          currency?: string
          cycle?: string
          error_message?: string | null
          exchange_rate?: number
          fee_amount?: number
          gateway_transaction_id?: string | null
          id?: string
          mobile_number?: string | null
          original_amount_usd?: number
          paid_at?: string | null
          payment_channel?: string
          payment_method?: string | null
          plan_id?: string | null
          plan_name?: string | null
          provider?: string
          reference?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          annual_price: number
          badge: string | null
          created_at: string
          cta_label: string
          currency: string
          description: string | null
          features: Json
          id: string
          image_quota: number
          interval: string
          is_active: boolean
          msg_quota: number
          name: string
          price: number
          slug: string
          sort_order: number
          tagline: string | null
          tier: string
          trial_days: number
          updated_at: string
          video_quota: number
        }
        Insert: {
          annual_price?: number
          badge?: string | null
          created_at?: string
          cta_label?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          image_quota?: number
          interval?: string
          is_active?: boolean
          msg_quota?: number
          name: string
          price?: number
          slug: string
          sort_order?: number
          tagline?: string | null
          tier?: string
          trial_days?: number
          updated_at?: string
          video_quota?: number
        }
        Update: {
          annual_price?: number
          badge?: string | null
          created_at?: string
          cta_label?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          image_quota?: number
          interval?: string
          is_active?: boolean
          msg_quota?: number
          name?: string
          price?: number
          slug?: string
          sort_order?: number
          tagline?: string | null
          tier?: string
          trial_days?: number
          updated_at?: string
          video_quota?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_year: number | null
          created_at: string
          credits: number
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          username: string | null
          welcome_email_sent_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string
          credits?: number
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          username?: string | null
          welcome_email_sent_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string
          credits?: number
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          username?: string | null
          welcome_email_sent_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          body: string | null
          created_at: string
          id: string
          is_staff: boolean
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_staff?: boolean
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_staff?: boolean
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          id: string
          last_message_at: string
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          api_cost: number
          created_at: string
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          api_cost?: number
          created_at?: string
          id?: string
          kind: string
          user_id: string
        }
        Update: {
          api_cost?: number
          created_at?: string
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          appearance: string
          haptics: boolean
          language: string
          notifications: boolean
          updated_at: string
          user_id: string
          widget: boolean
        }
        Insert: {
          appearance?: string
          haptics?: boolean
          language?: string
          notifications?: boolean
          updated_at?: string
          user_id: string
          widget?: boolean
        }
        Update: {
          appearance?: string
          haptics?: boolean
          language?: string
          notifications?: boolean
          updated_at?: string
          user_id?: string
          widget?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      account_status: "active" | "suspended" | "banned"
      app_role:
        | "super_admin"
        | "support_operator"
        | "content_manager"
        | "accountant"
      ticket_status: "new" | "open" | "resolved"
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
      account_status: ["active", "suspended", "banned"],
      app_role: [
        "super_admin",
        "support_operator",
        "content_manager",
        "accountant",
      ],
      ticket_status: ["new", "open", "resolved"],
    },
  },
} as const
