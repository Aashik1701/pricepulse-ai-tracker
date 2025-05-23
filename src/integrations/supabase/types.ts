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
      application_status_history: {
        Row: {
          application_id: string
          date: string | null
          id: string
          notes: string | null
          status: string
        }
        Insert: {
          application_id: string
          date?: string | null
          id?: string
          notes?: string | null
          status: string
        }
        Update: {
          application_id?: string
          date?: string | null
          id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string
          created_at: string | null
          feedback: string | null
          id: string
          interview_date: string
          interview_type: string
          interviewer: string | null
          notes: string | null
          preparation_notes: string | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          created_at?: string | null
          feedback?: string | null
          id?: string
          interview_date: string
          interview_type: string
          interviewer?: string | null
          notes?: string | null
          preparation_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string | null
          feedback?: string | null
          id?: string
          interview_date?: string
          interview_type?: string
          interviewer?: string | null
          notes?: string | null
          preparation_notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applied_date: string
          company: string
          contact_info: Json | null
          created_at: string | null
          id: string
          job_description: string | null
          location: string | null
          notes: string | null
          position: string
          resume_id: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          applied_date?: string
          company: string
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          job_description?: string | null
          location?: string | null
          notes?: string | null
          position: string
          resume_id?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          applied_date?: string
          company?: string
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          job_description?: string | null
          location?: string | null
          notes?: string | null
          position?: string
          resume_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      job_trends: {
        Row: {
          avg_salary: number | null
          date_recorded: string | null
          demand_score: number | null
          growth_percentage: number | null
          id: string
          industry: string | null
          location: string | null
          remote_percentage: number | null
          role_name: string
          source: string | null
          top_skills: Json | null
        }
        Insert: {
          avg_salary?: number | null
          date_recorded?: string | null
          demand_score?: number | null
          growth_percentage?: number | null
          id?: string
          industry?: string | null
          location?: string | null
          remote_percentage?: number | null
          role_name: string
          source?: string | null
          top_skills?: Json | null
        }
        Update: {
          avg_salary?: number | null
          date_recorded?: string | null
          demand_score?: number | null
          growth_percentage?: number | null
          id?: string
          industry?: string | null
          location?: string | null
          remote_percentage?: number | null
          role_name?: string
          source?: string | null
          top_skills?: Json | null
        }
        Relationships: []
      }
      mentor_bookings: {
        Row: {
          booking_date: string
          created_at: string | null
          duration: number
          id: string
          mentor_id: string
          notes: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booking_date: string
          created_at?: string | null
          duration: number
          id?: string
          mentor_id: string
          notes?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booking_date?: string
          created_at?: string | null
          duration?: number
          id?: string
          mentor_id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_bookings_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors: {
        Row: {
          about: string | null
          availability: string | null
          company: string | null
          created_at: string | null
          experience: string | null
          expertise: Json | null
          id: string
          image_url: string | null
          name: string
          price: string | null
          rating: number | null
          review_count: number | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          about?: string | null
          availability?: string | null
          company?: string | null
          created_at?: string | null
          experience?: string | null
          expertise?: Json | null
          id?: string
          image_url?: string | null
          name: string
          price?: string | null
          rating?: number | null
          review_count?: number | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          about?: string | null
          availability?: string | null
          company?: string | null
          created_at?: string | null
          experience?: string | null
          expertise?: Json | null
          id?: string
          image_url?: string | null
          name?: string
          price?: string | null
          rating?: number | null
          review_count?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          linkedin: string | null
          location: string | null
          phone: string | null
          portfolio: string | null
          professional_title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          linkedin?: string | null
          location?: string | null
          phone?: string | null
          portfolio?: string | null
          professional_title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          linkedin?: string | null
          location?: string | null
          phone?: string | null
          portfolio?: string | null
          professional_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          ats_score: number | null
          content: Json
          created_at: string | null
          id: string
          template_id: number
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ats_score?: number | null
          content: Json
          created_at?: string | null
          id?: string
          template_id: number
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ats_score?: number | null
          content?: Json
          created_at?: string | null
          id?: string
          template_id?: number
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          category: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_skills: {
        Row: {
          proficiency_level: number | null
          skill_id: string
          user_id: string
        }
        Insert: {
          proficiency_level?: number | null
          skill_id: string
          user_id: string
        }
        Update: {
          proficiency_level?: number | null
          skill_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
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
