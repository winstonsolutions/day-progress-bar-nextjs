export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          clerk_id: string
          created_at: string
          email: string
          first_name: string | null
          last_name: string | null
          updated_at: string
          trial_started_at: string | null
        }
        Insert: {
          id?: string
          clerk_id: string
          created_at?: string
          email: string
          first_name?: string | null
          last_name?: string | null
          updated_at?: string
          trial_started_at?: string | null
        }
        Update: {
          id?: string
          clerk_id?: string
          created_at?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          updated_at?: string
          trial_started_at?: string | null
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          theme: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          theme?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          theme?: string
          created_at?: string
          updated_at?: string
        }
      }
      licenses: {
        Row: {
          id: string
          user_id: string
          license_key: string
          expires_at: string | null
          created_at: string
          updated_at: string
          active: boolean
          email: string | null
        }
        Insert: {
          id?: string
          user_id: string
          license_key: string
          expires_at?: string | null
          created_at?: string
          updated_at?: string
          active?: boolean
          email?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          license_key?: string
          expires_at?: string | null
          created_at?: string
          updated_at?: string
          active?: boolean
          email?: string | null
        }
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
  }
}