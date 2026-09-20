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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      attendance: {
        Row: {
          created_at: string
          id: string
          instance_id: string
          is_adhoc: boolean
          overridden_at: string | null
          overridden_by: string | null
          override_price: number | null
          override_reason: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_id: string
          is_adhoc?: boolean
          overridden_at?: string | null
          overridden_by?: string | null
          override_price?: number | null
          override_reason?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_id?: string
          is_adhoc?: boolean
          overridden_at?: string | null
          overridden_by?: string | null
          override_price?: number | null
          override_reason?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "lesson_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_overridden_by_fkey"
            columns: ["overridden_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_days: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          kind: Database["public"]["Enums"]["calendar_day_kind"]
          note: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          kind: Database["public"]["Enums"]["calendar_day_kind"]
          note?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          kind?: Database["public"]["Enums"]["calendar_day_kind"]
          note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_days_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      enrolments: {
        Row: {
          created_at: string
          end_date: string | null
          grade_id: string
          id: string
          instrument_id: string
          start_date: string
          status: Database["public"]["Enums"]["enrolment_status"]
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          grade_id: string
          id?: string
          instrument_id: string
          start_date: string
          status?: Database["public"]["Enums"]["enrolment_status"]
          student_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          grade_id?: string
          id?: string
          instrument_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["enrolment_status"]
          student_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrolments_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrolments_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrolments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrolments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          created_at: string
          id: string
          instrument_id: string
          label: string
          level: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instrument_id: string
          label: string
          level: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instrument_id?: string
          label?: string
          level?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      instruments: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_instances: {
        Row: {
          cancelled_reason: string | null
          capacity_override: number | null
          created_at: string
          created_by: string | null
          date: string
          duration_mins: number | null
          id: string
          instrument_id: string | null
          is_one_off: boolean
          room: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["lesson_instance_status"]
          teacher_id: string | null
          template_id: string | null
          type: Database["public"]["Enums"]["lesson_type"] | null
          updated_at: string
        }
        Insert: {
          cancelled_reason?: string | null
          capacity_override?: number | null
          created_at?: string
          created_by?: string | null
          date: string
          duration_mins?: number | null
          id?: string
          instrument_id?: string | null
          is_one_off?: boolean
          room?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["lesson_instance_status"]
          teacher_id?: string | null
          template_id?: string | null
          type?: Database["public"]["Enums"]["lesson_type"] | null
          updated_at?: string
        }
        Update: {
          cancelled_reason?: string | null
          capacity_override?: number | null
          created_at?: string
          created_by?: string | null
          date?: string
          duration_mins?: number | null
          id?: string
          instrument_id?: string | null
          is_one_off?: boolean
          room?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["lesson_instance_status"]
          teacher_id?: string | null
          template_id?: string | null
          type?: Database["public"]["Enums"]["lesson_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_instances_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_instances_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_instances_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "lesson_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_templates: {
        Row: {
          created_at: string
          day_of_week: number
          duration_mins: number
          id: string
          instrument_id: string
          is_active: boolean
          max_capacity: number
          room: string | null
          start_time: string
          teacher_id: string
          type: Database["public"]["Enums"]["lesson_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          duration_mins: number
          id?: string
          instrument_id: string
          is_active?: boolean
          max_capacity?: number
          room?: string | null
          start_time: string
          teacher_id: string
          type: Database["public"]["Enums"]["lesson_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          duration_mins?: number
          id?: string
          instrument_id?: string
          is_active?: boolean
          max_capacity?: number
          room?: string | null
          start_time?: string
          teacher_id?: string
          type?: Database["public"]["Enums"]["lesson_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_templates_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_templates_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          preferred_language: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          preferred_language?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          preferred_language?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      pricing: {
        Row: {
          amount: number
          created_at: string
          duration_mins: number
          effective_from: string
          id: string
          instrument_id: string
          lesson_type: Database["public"]["Enums"]["lesson_type"]
          teacher_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          duration_mins: number
          effective_from: string
          id?: string
          instrument_id: string
          lesson_type: Database["public"]["Enums"]["lesson_type"]
          teacher_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          duration_mins?: number
          effective_from?: string
          id?: string
          instrument_id?: string
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      student_parents: {
        Row: {
          created_at: string
          is_primary: boolean
          parent_id: string
          relationship: string
          student_id: string
        }
        Insert: {
          created_at?: string
          is_primary?: boolean
          parent_id: string
          relationship: string
          student_id: string
        }
        Update: {
          created_at?: string
          is_primary?: boolean
          parent_id?: string
          relationship?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_parents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          date_of_birth: string | null
          emergency_contact: string | null
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      template_enrolments: {
        Row: {
          enrolment_id: string
          joined_at: string
          template_id: string
        }
        Insert: {
          enrolment_id: string
          joined_at?: string
          template_id: string
        }
        Update: {
          enrolment_id?: string
          joined_at?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_enrolments_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "enrolments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_enrolments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "lesson_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          is_approved: boolean
          phone: string | null
          push_token: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          is_approved?: boolean
          phone?: string | null
          push_token?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_approved?: boolean
          phone?: string | null
          push_token?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_user: { Args: { p_user_id: string }; Returns: undefined }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      effective_capacity: { Args: { p_instance_id: string }; Returns: number }
      instance_headcount: { Args: { p_instance_id: string }; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      is_approved_user: { Args: never; Returns: boolean }
      is_school_open: { Args: { p_date: string }; Returns: boolean }
      is_self_student: { Args: { p_student_id: string }; Returns: boolean }
      is_teacher_for_enrolment: {
        Args: { p_enrolment_id: string }
        Returns: boolean
      }
      is_teacher_for_instance: {
        Args: { p_instance_id: string }
        Returns: boolean
      }
      is_teacher_for_student: {
        Args: { p_student_id: string }
        Returns: boolean
      }
      is_teacher_for_template: {
        Args: { p_template_id: string }
        Returns: boolean
      }
      resolve_price: {
        Args: {
          p_duration_mins: number
          p_instrument_id: string
          p_lesson_date: string
          p_lesson_type: Database["public"]["Enums"]["lesson_type"]
          p_teacher_id: string
        }
        Returns: number
      }
    }
    Enums: {
      attendance_status: "present" | "absent" | "late"
      calendar_day_kind: "closure" | "term_break" | "exam_week"
      enrolment_status: "active" | "paused" | "dropped"
      lesson_instance_status: "scheduled" | "cancelled" | "done"
      lesson_type: "1-1" | "group"
      user_role: "admin" | "teacher" | "student" | "parent"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      attendance_status: ["present", "absent", "late"],
      calendar_day_kind: ["closure", "term_break", "exam_week"],
      enrolment_status: ["active", "paused", "dropped"],
      lesson_instance_status: ["scheduled", "cancelled", "done"],
      lesson_type: ["1-1", "group"],
      user_role: ["admin", "teacher", "student", "parent"],
    },
  },
} as const

