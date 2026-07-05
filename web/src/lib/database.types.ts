export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_assets: {
        Row: { content: string; name: string; updated_at: string | null }
        Insert: { content: string; name: string; updated_at?: string | null }
        Update: { content?: string; name?: string; updated_at?: string | null }
        Relationships: []
      }
      attendance: {
        Row: {
          att_date: string; created_at: string | null; employee_id: string
          entry_time: string | null; exit_time: string | null; id: string
          in_lat: number | null; in_lng: number | null; in_loc: string | null
          org_id: string | null; out_lat: number | null; out_lng: number | null
          out_loc: string | null; remarks: string | null; shift: string | null
          status: string | null
        }
        Insert: {
          att_date: string; created_at?: string | null; employee_id: string
          entry_time?: string | null; exit_time?: string | null; id?: string
          in_lat?: number | null; in_lng?: number | null; in_loc?: string | null
          org_id?: string | null; out_lat?: number | null; out_lng?: number | null
          out_loc?: string | null; remarks?: string | null; shift?: string | null
          status?: string | null
        }
        Update: {
          att_date?: string; created_at?: string | null; employee_id?: string
          entry_time?: string | null; exit_time?: string | null; id?: string
          in_lat?: number | null; in_lng?: number | null; in_loc?: string | null
          org_id?: string | null; out_lat?: number | null; out_lng?: number | null
          out_loc?: string | null; remarks?: string | null; shift?: string | null
          status?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null; contact_person: string | null; created_at: string | null
          email: string | null; gstin: string | null; id: string; name: string
          notes: string | null; org_id: string | null; phone: string | null
        }
        Insert: {
          address?: string | null; contact_person?: string | null; created_at?: string | null
          email?: string | null; gstin?: string | null; id?: string; name: string
          notes?: string | null; org_id?: string | null; phone?: string | null
        }
        Update: {
          address?: string | null; contact_person?: string | null; created_at?: string | null
          email?: string | null; gstin?: string | null; id?: string; name?: string
          notes?: string | null; org_id?: string | null; phone?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          bank_account: string | null; created_at: string | null; ctc: number | null
          department: string | null; designation: string | null; doj: string | null
          email: string | null; emp_code: string; full_name: string; id: string
          org_id: string | null; pan: string | null; status: string; uan: string | null
        }
        Insert: {
          bank_account?: string | null; created_at?: string | null; ctc?: number | null
          department?: string | null; designation?: string | null; doj?: string | null
          email?: string | null; emp_code: string; full_name: string; id?: string
          org_id?: string | null; pan?: string | null; status?: string; uan?: string | null
        }
        Update: {
          bank_account?: string | null; created_at?: string | null; ctc?: number | null
          department?: string | null; designation?: string | null; doj?: string | null
          email?: string | null; emp_code?: string; full_name?: string; id?: string
          org_id?: string | null; pan?: string | null; status?: string; uan?: string | null
        }
        Relationships: []
      }
      holidays: {
        Row: { holiday_date: string; id: string; name: string; org_id: string | null; type: string | null }
        Insert: { holiday_date: string; id?: string; name: string; org_id?: string | null; type?: string | null }
        Update: { holiday_date?: string; id?: string; name?: string; org_id?: string | null; type?: string | null }
        Relationships: []
      }
      invoices: {
        Row: {
          client_id: string | null; created_at: string | null; custom_html: string | null
          due_date: string | null; id: string; invoice_date: string; invoice_no: string
          items: Json; notes: string | null; org_id: string | null; quote_id: string | null
          status: string | null; subtotal: number | null; tax_amount: number | null
          tax_pct: number | null; total: number | null
        }
        Insert: {
          client_id?: string | null; created_at?: string | null; custom_html?: string | null
          due_date?: string | null; id?: string; invoice_date?: string; invoice_no: string
          items?: Json; notes?: string | null; org_id?: string | null; quote_id?: string | null
          status?: string | null; subtotal?: number | null; tax_amount?: number | null
          tax_pct?: number | null; total?: number | null
        }
        Update: {
          client_id?: string | null; created_at?: string | null; custom_html?: string | null
          due_date?: string | null; id?: string; invoice_date?: string; invoice_no?: string
          items?: Json; notes?: string | null; org_id?: string | null; quote_id?: string | null
          status?: string | null; subtotal?: number | null; tax_amount?: number | null
          tax_pct?: number | null; total?: number | null
        }
        Relationships: []
      }
      orgs: {
        Row: {
          address: string | null; bank_details: string | null; created_at: string | null
          gstin: string | null; id: string; invoice_terms: string | null; logo: string | null
          name: string; place_of_supply: string | null; signature: string | null; website: string | null
        }
        Insert: {
          address?: string | null; bank_details?: string | null; created_at?: string | null
          gstin?: string | null; id?: string; invoice_terms?: string | null; logo?: string | null
          name: string; place_of_supply?: string | null; signature?: string | null; website?: string | null
        }
        Update: {
          address?: string | null; bank_details?: string | null; created_at?: string | null
          gstin?: string | null; id?: string; invoice_terms?: string | null; logo?: string | null
          name?: string; place_of_supply?: string | null; signature?: string | null; website?: string | null
        }
        Relationships: []
      }
      payroll: {
        Row: {
          arrears: number | null; basic: number | null; created_at: string | null; employee_id: string
          gross: number | null; gross_additions: number | null; hra: number | null; id: string
          incentives: number | null; lop: number | null; net: number | null; org_id: string | null
          other_allowance: number | null; paid_days: number | null; pay_month: number
          pay_status: string; pay_year: number; pt: number | null; total_days: number | null
          total_deductions: number | null
        }
        Insert: {
          arrears?: number | null; basic?: number | null; created_at?: string | null; employee_id: string
          gross?: number | null; gross_additions?: number | null; hra?: number | null; id?: string
          incentives?: number | null; lop?: number | null; net?: number | null; org_id?: string | null
          other_allowance?: number | null; paid_days?: number | null; pay_month: number
          pay_status?: string; pay_year: number; pt?: number | null; total_days?: number | null
          total_deductions?: number | null
        }
        Update: {
          arrears?: number | null; basic?: number | null; created_at?: string | null; employee_id?: string
          gross?: number | null; gross_additions?: number | null; hra?: number | null; id?: string
          incentives?: number | null; lop?: number | null; net?: number | null; org_id?: string | null
          other_allowance?: number | null; paid_days?: number | null; pay_month?: number
          pay_status?: string; pay_year?: number; pt?: number | null; total_days?: number | null
          total_deductions?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: { created_at: string | null; employee_id: string | null; id: string; org_id: string | null; role: string }
        Insert: { created_at?: string | null; employee_id?: string | null; id: string; org_id?: string | null; role?: string }
        Update: { created_at?: string | null; employee_id?: string | null; id?: string; org_id?: string | null; role?: string }
        Relationships: []
      }
      projects: {
        Row: { client_id: string | null; created_at: string | null; id: string; name: string; org_id: string | null; status: string }
        Insert: { client_id?: string | null; created_at?: string | null; id?: string; name: string; org_id?: string | null; status?: string }
        Update: { client_id?: string | null; created_at?: string | null; id?: string; name?: string; org_id?: string | null; status?: string }
        Relationships: []
      }
      quotes: {
        Row: {
          client_id: string | null; created_at: string | null; custom_html: string | null; id: string
          items: Json; notes: string | null; org_id: string | null; quote_date: string; quote_no: string
          status: string | null; subtotal: number | null; tax_amount: number | null; tax_pct: number | null
          total: number | null; valid_until: string | null
        }
        Insert: {
          client_id?: string | null; created_at?: string | null; custom_html?: string | null; id?: string
          items?: Json; notes?: string | null; org_id?: string | null; quote_date?: string; quote_no: string
          status?: string | null; subtotal?: number | null; tax_amount?: number | null; tax_pct?: number | null
          total?: number | null; valid_until?: string | null
        }
        Update: {
          client_id?: string | null; created_at?: string | null; custom_html?: string | null; id?: string
          items?: Json; notes?: string | null; org_id?: string | null; quote_date?: string; quote_no?: string
          status?: string | null; subtotal?: number | null; tax_amount?: number | null; tax_pct?: number | null
          total?: number | null; valid_until?: string | null
        }
        Relationships: []
      }
      task_updates: {
        Row: {
          blocker: string | null; completed: string | null; created_at: string | null; employee_id: string
          id: string; next_task: string | null; not_working: string | null; org_id: string | null
          project: string | null; proof_link: string | null; remarks: string | null; task_assigned: string | null
          upd_date: string; update_status: string | null
        }
        Insert: {
          blocker?: string | null; completed?: string | null; created_at?: string | null; employee_id: string
          id?: string; next_task?: string | null; not_working?: string | null; org_id?: string | null
          project?: string | null; proof_link?: string | null; remarks?: string | null; task_assigned?: string | null
          upd_date?: string; update_status?: string | null
        }
        Update: {
          blocker?: string | null; completed?: string | null; created_at?: string | null; employee_id?: string
          id?: string; next_task?: string | null; not_working?: string | null; org_id?: string | null
          project?: string | null; proof_link?: string | null; remarks?: string | null; task_assigned?: string | null
          upd_date?: string; update_status?: string | null
        }
        Relationships: []
      }
      wfh_leave: {
        Row: {
          approved: string | null; created_at: string | null; employee_id: string; id: string
          org_id: string | null; reason: string | null; remarks: string | null; req_date: string; status: string
        }
        Insert: {
          approved?: string | null; created_at?: string | null; employee_id: string; id?: string
          org_id?: string | null; reason?: string | null; remarks?: string | null; req_date: string; status: string
        }
        Update: {
          approved?: string | null; created_at?: string | null; employee_id?: string; id?: string
          org_id?: string | null; reason?: string | null; remarks?: string | null; req_date?: string; status?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_org: { Args: { org_name: string }; Returns: string }
      is_admin: { Args: Record<string, never>; Returns: boolean }
      my_employee_id: { Args: Record<string, never>; Returns: string }
      my_org: { Args: Record<string, never>; Returns: string }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

type PublicSchema = Database["public"]
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
