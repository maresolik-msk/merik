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
      announcements: {
        Row: {
          active: boolean
          audience: string
          body: string | null
          created_at: string
          id: string
          kind: string
          title: string
        }
        Insert: {
          active?: boolean
          audience?: string
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          title: string
        }
        Update: {
          active?: boolean
          audience?: string
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          title?: string
        }
        Relationships: []
      }
      app_assets: {
        Row: {
          content: string
          name: string
          updated_at: string | null
        }
        Insert: {
          content: string
          name: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          att_date: string
          created_at: string | null
          employee_id: string
          entry_time: string | null
          exit_time: string | null
          id: string
          in_lat: number | null
          in_lng: number | null
          in_loc: string | null
          org_id: string | null
          out_lat: number | null
          out_lng: number | null
          out_loc: string | null
          remarks: string | null
          shift: string | null
          status: string | null
        }
        Insert: {
          att_date: string
          created_at?: string | null
          employee_id: string
          entry_time?: string | null
          exit_time?: string | null
          id?: string
          in_lat?: number | null
          in_lng?: number | null
          in_loc?: string | null
          org_id?: string | null
          out_lat?: number | null
          out_lng?: number | null
          out_loc?: string | null
          remarks?: string | null
          shift?: string | null
          status?: string | null
        }
        Update: {
          att_date?: string
          created_at?: string | null
          employee_id?: string
          entry_time?: string | null
          exit_time?: string | null
          id?: string
          in_lat?: number | null
          in_lng?: number | null
          in_loc?: string | null
          org_id?: string | null
          out_lat?: number | null
          out_lng?: number | null
          out_loc?: string | null
          remarks?: string | null
          shift?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          gstin: string | null
          id: string
          name: string
          notes: string | null
          org_id: string | null
          phone: string | null
          start_date: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id?: string | null
          phone?: string | null
          start_date?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string | null
          phone?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      emp_notes: {
        Row: {
          content: string | null
          created_at: string
          done: boolean
          employee_id: string
          id: string
          kind: string
          org_id: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          done?: boolean
          employee_id: string
          id?: string
          kind?: string
          org_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          done?: boolean
          employee_id?: string
          id?: string
          kind?: string
          org_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emp_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          bank_account: string | null
          created_at: string | null
          ctc: number | null
          department: string | null
          designation: string | null
          doj: string | null
          email: string | null
          emp_code: string
          employment_type: string | null
          full_name: string
          id: string
          org_id: string | null
          pan: string | null
          status: string
          uan: string | null
        }
        Insert: {
          bank_account?: string | null
          created_at?: string | null
          ctc?: number | null
          department?: string | null
          designation?: string | null
          doj?: string | null
          email?: string | null
          emp_code: string
          employment_type?: string | null
          full_name: string
          id?: string
          org_id?: string | null
          pan?: string | null
          status?: string
          uan?: string | null
        }
        Update: {
          bank_account?: string | null
          created_at?: string | null
          ctc?: number | null
          department?: string | null
          designation?: string | null
          doj?: string | null
          email?: string | null
          emp_code?: string
          employment_type?: string | null
          full_name?: string
          id?: string
          org_id?: string | null
          pan?: string | null
          status?: string
          uan?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_reply: string | null
          category: string
          created_at: string
          employee_id: string | null
          id: string
          message: string
          org_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_reply?: string | null
          category?: string
          created_at?: string
          employee_id?: string | null
          id?: string
          message: string
          org_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_reply?: string | null
          category?: string
          created_at?: string
          employee_id?: string | null
          id?: string
          message?: string
          org_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_org_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          holiday_date: string
          id: string
          name: string
          org_id: string | null
          type: string | null
        }
        Insert: {
          holiday_date: string
          id?: string
          name: string
          org_id?: string | null
          type?: string | null
        }
        Update: {
          holiday_date?: string
          id?: string
          name?: string
          org_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holidays_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string | null
          created_at: string | null
          custom_html: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_no: string
          items: Json
          notes: string | null
          org_id: string | null
          quote_id: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tax_pct: number | null
          total: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          custom_html?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_no: string
          items?: Json
          notes?: string | null
          org_id?: string | null
          quote_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_pct?: number | null
          total?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          custom_html?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_no?: string
          items?: Json
          notes?: string | null
          org_id?: string | null
          quote_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_pct?: number | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          address: string | null
          bank_details: string | null
          created_at: string | null
          gstin: string | null
          id: string
          invoice_terms: string | null
          logo: string | null
          modules: Json | null
          name: string
          place_of_supply: string | null
          plan: string | null
          signature: string | null
          status: string
          website: string | null
        }
        Insert: {
          address?: string | null
          bank_details?: string | null
          created_at?: string | null
          gstin?: string | null
          id?: string
          invoice_terms?: string | null
          logo?: string | null
          modules?: Json | null
          name: string
          place_of_supply?: string | null
          plan?: string | null
          signature?: string | null
          status?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          bank_details?: string | null
          created_at?: string | null
          gstin?: string | null
          id?: string
          invoice_terms?: string | null
          logo?: string | null
          modules?: Json | null
          name?: string
          place_of_supply?: string | null
          plan?: string | null
          signature?: string | null
          status?: string
          website?: string | null
        }
        Relationships: []
      }
      payroll: {
        Row: {
          arrears: number | null
          basic: number | null
          created_at: string | null
          employee_id: string
          gross: number | null
          gross_additions: number | null
          hra: number | null
          id: string
          incentives: number | null
          lop: number | null
          net: number | null
          org_id: string | null
          other_allowance: number | null
          paid_days: number | null
          pay_month: number
          pay_status: string
          pay_year: number
          pt: number | null
          sent: boolean
          sent_at: string | null
          total_days: number | null
          total_deductions: number | null
        }
        Insert: {
          arrears?: number | null
          basic?: number | null
          created_at?: string | null
          employee_id: string
          gross?: number | null
          gross_additions?: number | null
          hra?: number | null
          id?: string
          incentives?: number | null
          lop?: number | null
          net?: number | null
          org_id?: string | null
          other_allowance?: number | null
          paid_days?: number | null
          pay_month: number
          pay_status?: string
          pay_year: number
          pt?: number | null
          sent?: boolean
          sent_at?: string | null
          total_days?: number | null
          total_deductions?: number | null
        }
        Update: {
          arrears?: number | null
          basic?: number | null
          created_at?: string | null
          employee_id?: string
          gross?: number | null
          gross_additions?: number | null
          hra?: number | null
          id?: string
          incentives?: number | null
          lop?: number | null
          net?: number | null
          org_id?: string | null
          other_allowance?: number | null
          paid_days?: number | null
          pay_month?: number
          pay_status?: string
          pay_year?: number
          pt?: number | null
          sent?: boolean
          sent_at?: string | null
          total_days?: number | null
          total_deductions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          employee_id: string | null
          id: string
          org_id: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          employee_id?: string | null
          id: string
          org_id?: string | null
          role?: string
        }
        Update: {
          created_at?: string | null
          employee_id?: string | null
          id?: string
          org_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          org_id: string | null
          start_date: string
          status: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          org_id?: string | null
          start_date?: string
          status?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          org_id?: string | null
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_id: string | null
          created_at: string | null
          custom_html: string | null
          id: string
          items: Json
          notes: string | null
          org_id: string | null
          quote_date: string
          quote_no: string
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tax_pct: number | null
          total: number | null
          valid_until: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          custom_html?: string | null
          id?: string
          items?: Json
          notes?: string | null
          org_id?: string | null
          quote_date?: string
          quote_no: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_pct?: number | null
          total?: number | null
          valid_until?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          custom_html?: string | null
          id?: string
          items?: Json
          notes?: string | null
          org_id?: string | null
          quote_date?: string
          quote_no?: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_pct?: number | null
          total?: number | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_history: {
        Row: {
          created_at: string
          effective_month: string
          employee_id: string
          id: string
          new_ctc: number
          note: string | null
          org_id: string | null
          previous_ctc: number | null
        }
        Insert: {
          created_at?: string
          effective_month: string
          employee_id: string
          id?: string
          new_ctc: number
          note?: string | null
          org_id?: string | null
          previous_ctc?: number | null
        }
        Update: {
          created_at?: string
          effective_month?: string
          employee_id?: string
          id?: string
          new_ctc?: number
          note?: string | null
          org_id?: string | null
          previous_ctc?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_requests: {
        Row: {
          company_name: string
          contact_name: string
          created_at: string
          created_org_id: string | null
          email: string
          id: string
          message: string | null
          phone: string | null
          review_notes: string | null
          reviewed_at: string | null
          status: string
        }
        Insert: {
          company_name: string
          contact_name: string
          created_at?: string
          created_org_id?: string | null
          email: string
          id?: string
          message?: string | null
          phone?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          company_name?: string
          contact_name?: string
          created_at?: string
          created_org_id?: string | null
          email?: string
          id?: string
          message?: string | null
          phone?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "signup_requests_created_org_id_fkey"
            columns: ["created_org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      task_updates: {
        Row: {
          blocker: string | null
          completed: string | null
          created_at: string | null
          employee_id: string
          id: string
          next_task: string | null
          not_working: string | null
          org_id: string | null
          project: string | null
          proof_link: string | null
          remarks: string | null
          task_assigned: string | null
          tasks: Json | null
          upd_date: string
          update_status: string | null
        }
        Insert: {
          blocker?: string | null
          completed?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          next_task?: string | null
          not_working?: string | null
          org_id?: string | null
          project?: string | null
          proof_link?: string | null
          remarks?: string | null
          task_assigned?: string | null
          tasks?: Json | null
          upd_date?: string
          update_status?: string | null
        }
        Update: {
          blocker?: string | null
          completed?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          next_task?: string | null
          not_working?: string | null
          org_id?: string | null
          project?: string | null
          proof_link?: string | null
          remarks?: string | null
          task_assigned?: string | null
          tasks?: Json | null
          upd_date?: string
          update_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_updates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_updates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      wfh_leave: {
        Row: {
          approved: string | null
          created_at: string | null
          employee_id: string
          end_date: string | null
          id: string
          org_id: string | null
          reason: string | null
          remarks: string | null
          req_date: string
          status: string
        }
        Insert: {
          approved?: string | null
          created_at?: string | null
          employee_id: string
          end_date?: string | null
          id?: string
          org_id?: string | null
          reason?: string | null
          remarks?: string | null
          req_date: string
          status: string
        }
        Update: {
          approved?: string | null
          created_at?: string | null
          employee_id?: string
          end_date?: string | null
          id?: string
          org_id?: string | null
          reason?: string | null
          remarks?: string | null
          req_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "wfh_leave_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wfh_leave_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_org: { Args: { org_name: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      mark_missing_task_updates: { Args: { target?: string }; Returns: number }
      my_employee_id: { Args: never; Returns: string }
      my_org: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
