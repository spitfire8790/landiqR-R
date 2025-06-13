export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      allocations: {
        Row: {
          id: string
          category_id: string
          person_id: string
          is_lead: boolean
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          person_id: string
          is_lead?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          person_id?: string
          is_lead?: boolean
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string
          group_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          group_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          group_id?: string
          created_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          created_at?: string
        }
      }
      people: {
        Row: {
          id: string
          name: string
          email: string
          organisation: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          organisation: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          organisation?: string
          role?: string
          created_at?: string
        }
      }
    }
  }
}
