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
      departments: {
        Row: {
          created_at: string | null
          cta_text: string | null
          description: string | null
          display_order: number
          id: string
          name: string
          what_they_do: string | null
          who_should_join: string | null
        }
        Insert: {
          created_at?: string | null
          cta_text?: string | null
          description?: string | null
          display_order?: number
          id?: string
          name: string
          what_they_do?: string | null
          who_should_join?: string | null
        }
        Update: {
          created_at?: string | null
          cta_text?: string | null
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          what_they_do?: string | null
          who_should_join?: string | null
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          donor_email: string | null
          donor_name: string | null
          frequency: string
          id: string
          payment_method: string
          reference: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency: string
          donor_email?: string | null
          donor_name?: string | null
          frequency: string
          id?: string
          payment_method: string
          reference?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          donor_email?: string | null
          donor_name?: string | null
          frequency?: string
          id?: string
          payment_method?: string
          reference?: string | null
          status?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          event_date: string
          id: string
          image_url: string | null
          is_highlighted: boolean
          location: string
          name: string
          recurrence: string
          registration_link: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_date: string
          id?: string
          image_url?: string | null
          is_highlighted?: boolean
          location?: string
          name: string
          recurrence?: string
          registration_link?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_date?: string
          id?: string
          image_url?: string | null
          is_highlighted?: boolean
          location?: string
          name?: string
          recurrence?: string
          registration_link?: string | null
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          area: string | null
          category: string | null
          confidential: boolean | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          invited_by: string | null
          message: string | null
          phone: string | null
          prayer_need: string | null
          status: string
          type: string
          visit_type: string | null
        }
        Insert: {
          area?: string | null
          category?: string | null
          confidential?: boolean | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          invited_by?: string | null
          message?: string | null
          phone?: string | null
          prayer_need?: string | null
          status?: string
          type: string
          visit_type?: string | null
        }
        Update: {
          area?: string | null
          category?: string | null
          confidential?: boolean | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          invited_by?: string | null
          message?: string | null
          phone?: string | null
          prayer_need?: string | null
          status?: string
          type?: string
          visit_type?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          department_id: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string | null
        }
        Insert: {
          department_id?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Update: {
          department_id?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse: {
        Row: {
          active_event_id: string | null
          id: number
          is_live: boolean
          sermon_of_the_day_id: string | null
          updated_at: string | null
        }
        Insert: {
          active_event_id?: string | null
          id: number
          is_live?: boolean
          sermon_of_the_day_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active_event_id?: string | null
          id?: number
          is_live?: boolean
          sermon_of_the_day_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_active_event_id_fkey"
            columns: ["active_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_sermon_of_the_day_id_fkey"
            columns: ["sermon_of_the_day_id"]
            isOneToOne: false
            referencedRelation: "sermons"
            referencedColumns: ["id"]
          },
        ]
      }
      sermons: {
        Row: {
          audio_url: string | null
          category: string
          created_at: string | null
          date_preached: string | null
          description: string | null
          duration: string | null
          id: string
          is_featured: boolean | null
          preacher: string
          thumbnail_url: string | null
          title: string
          video_url: string | null
          youtube_url: string | null
        }
        Insert: {
          audio_url?: string | null
          category?: string
          created_at?: string | null
          date_preached?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          is_featured?: boolean | null
          preacher: string
          thumbnail_url?: string | null
          title: string
          video_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          audio_url?: string | null
          category?: string
          created_at?: string | null
          date_preached?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          is_featured?: boolean | null
          preacher?: string
          thumbnail_url?: string | null
          title?: string
          video_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "owner" | "pastor" | "manager" | "leader"
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
      app_role: ["owner", "pastor", "manager", "leader"],
    },
  },
} as const
