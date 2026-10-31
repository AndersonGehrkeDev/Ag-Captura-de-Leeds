// GERADO por scripts/db/generate-types.mjs a partir do catálogo PostgreSQL após aplicar as migrações.
// Não editar manualmente. Os tipos não substituem RLS, grants ou validação de entradas.
// SHA256 das migrações: 4d5e07701e0c5a192c84d208882d0107c556f64614755069eda9abacc373258f
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      admin_audit_events: {
        Row: {
          id: string;
          workspace_id: string | null;
          actor_id: string | null;
          action: string;
          entity_table: string;
          entity_id: string | null;
          changed_columns: (string)[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          actor_id?: string | null;
          action: string;
          entity_table: string;
          entity_id?: string | null;
          changed_columns?: (string)[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string | null;
          actor_id?: string | null;
          action?: string;
          entity_table?: string;
          entity_id?: string | null;
          changed_columns?: (string)[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "admin_audit_events_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "admin_audit_events_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"]; },
        ];
      };
      ai_generations: {
        Row: {
          id: string;
          workspace_id: string;
          lead_id: string | null;
          template_id: string | null;
          job_id: string | null;
          policy_id: string;
          source: Database["public"]["Enums"]["data_source"];
          purpose: string;
          model: string;
          request_digest: string;
          state: Database["public"]["Enums"]["operation_state"];
          output_text: string | null;
          input_tokens: number | null;
          output_tokens: number | null;
          completed_at: string | null;
          retention_until: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          lead_id?: string | null;
          template_id?: string | null;
          job_id?: string | null;
          policy_id: string;
          source: Database["public"]["Enums"]["data_source"];
          purpose?: string;
          model: string;
          request_digest: string;
          state?: Database["public"]["Enums"]["operation_state"];
          output_text?: string | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          completed_at?: string | null;
          retention_until: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          lead_id?: string | null;
          template_id?: string | null;
          job_id?: string | null;
          policy_id?: string;
          source?: Database["public"]["Enums"]["data_source"];
          purpose?: string;
          model?: string;
          request_digest?: string;
          state?: Database["public"]["Enums"]["operation_state"];
          output_text?: string | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          completed_at?: string | null;
          retention_until?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "ai_generations_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "ai_generations_workspace_id_job_id_fkey"; columns: ["workspace_id","job_id"]; isOneToOne: false; referencedRelation: "async_jobs"; referencedColumns: ["workspace_id","id"]; },
          { foreignKeyName: "ai_generations_workspace_id_lead_id_fkey"; columns: ["workspace_id","lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["workspace_id","id"]; },
          { foreignKeyName: "ai_generations_workspace_id_policy_id_fkey"; columns: ["workspace_id","policy_id"]; isOneToOne: false; referencedRelation: "data_usage_policies"; referencedColumns: ["workspace_id","id"]; },
          { foreignKeyName: "ai_generations_workspace_id_template_id_fkey"; columns: ["workspace_id","template_id"]; isOneToOne: false; referencedRelation: "message_templates"; referencedColumns: ["workspace_id","id"]; },
        ];
      };
      async_jobs: {
        Row: {
          id: string;
          workspace_id: string;
          kind: Database["public"]["Enums"]["job_kind"];
          state: Database["public"]["Enums"]["operation_state"];
          lead_id: string | null;
          search_id: string | null;
          template_id: string | null;
          idempotency_key: string;
          attempts: number;
          max_attempts: number;
          available_at: string;
          lease_until: string | null;
          worker_id: string | null;
          error_code: string | null;
          completed_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          kind: Database["public"]["Enums"]["job_kind"];
          state?: Database["public"]["Enums"]["operation_state"];
          lead_id?: string | null;
          search_id?: string | null;
          template_id?: string | null;
          idempotency_key: string;
          attempts?: number;
          max_attempts?: number;
          available_at?: string;
          lease_until?: string | null;
          worker_id?: string | null;
          error_code?: string | null;
          completed_at?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          kind?: Database["public"]["Enums"]["job_kind"];
          state?: Database["public"]["Enums"]["operation_state"];
          lead_id?: string | null;
          search_id?: string | null;
          template_id?: string | null;
          idempotency_key?: string;
          attempts?: number;
          max_attempts?: number;
          available_at?: string;
          lease_until?: string | null;
          worker_id?: string | null;
          error_code?: string | null;
          completed_at?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "async_jobs_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "async_jobs_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"]; },
          { foreignKeyName: "async_jobs_workspace_id_lead_id_fkey"; columns: ["workspace_id","lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["workspace_id","id"]; },
          { foreignKeyName: "async_jobs_workspace_id_search_id_fkey"; columns: ["workspace_id","search_id"]; isOneToOne: false; referencedRelation: "search_history"; referencedColumns: ["workspace_id","id"]; },
          { foreignKeyName: "async_jobs_workspace_id_template_id_fkey"; columns: ["workspace_id","template_id"]; isOneToOne: false; referencedRelation: "message_templates"; referencedColumns: ["workspace_id","id"]; },
        ];
      };
      campaign_leads: {
        Row: {
          id: string;
          workspace_id: string;
          campaign_id: string;
          lead_id: string;
          status: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          campaign_id: string;
          lead_id: string;
          status?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          campaign_id?: string;
          lead_id?: string;
          status?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "campaign_leads_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "campaign_leads_workspace_id_campaign_id_fkey"; columns: ["workspace_id","campaign_id"]; isOneToOne: false; referencedRelation: "campaigns"; referencedColumns: ["workspace_id","id"]; },
          { foreignKeyName: "campaign_leads_workspace_id_lead_id_fkey"; columns: ["workspace_id","lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["workspace_id","id"]; },
        ];
      };
      campaigns: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string | null;
          template_id: string | null;
          status: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          description?: string | null;
          template_id?: string | null;
          status?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          description?: string | null;
          template_id?: string | null;
          status?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "campaigns_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "campaigns_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"]; },
          { foreignKeyName: "campaigns_workspace_id_template_id_fkey"; columns: ["workspace_id","template_id"]; isOneToOne: false; referencedRelation: "message_templates"; referencedColumns: ["workspace_id","id"]; },
        ];
      };
      crm_field_provenance: {
        Row: {
          id: string;
          workspace_id: string;
          lead_id: string;
          field_name: string;
          source: Database["public"]["Enums"]["data_source"];
          purpose: string;
          external_reference_id: string | null;
          policy_id: string | null;
          recorded_by: string | null;
          recorded_via: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          lead_id: string;
          field_name: string;
          source: Database["public"]["Enums"]["data_source"];
          purpose?: string;
          external_reference_id?: string | null;
          policy_id?: string | null;
          recorded_by?: string | null;
          recorded_via: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          lead_id?: string;
          field_name?: string;
          source?: Database["public"]["Enums"]["data_source"];
          purpose?: string;
          external_reference_id?: string | null;
          policy_id?: string | null;
          recorded_by?: string | null;
          recorded_via?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "crm_field_provenance_recorded_by_fkey"; columns: ["recorded_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "crm_field_provenance_workspace_id_lead_id_external_referen_fkey"; columns: ["workspace_id","lead_id","external_reference_id"]; isOneToOne: false; referencedRelation: "lead_external_references"; referencedColumns: ["workspace_id","lead_id","id"]; },
          { foreignKeyName: "crm_field_provenance_workspace_id_lead_id_fkey"; columns: ["workspace_id","lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["workspace_id","id"]; },
          { foreignKeyName: "crm_field_provenance_workspace_id_policy_id_fkey"; columns: ["workspace_id","policy_id"]; isOneToOne: false; referencedRelation: "data_usage_policies"; referencedColumns: ["workspace_id","id"]; },
        ];
      };
      crm_tasks: {
        Row: {
          id: string;
          workspace_id: string;
          lead_id: string | null;
          title: string;
          description: string | null;
          assigned_to: string | null;
          due_at: string | null;
          completed_at: string | null;
          source: Database["public"]["Enums"]["data_source"];
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          lead_id?: string | null;
          title: string;
          description?: string | null;
          assigned_to?: string | null;
          due_at?: string | null;
          completed_at?: string | null;
          source?: Database["public"]["Enums"]["data_source"];
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          lead_id?: string | null;
          title?: string;
          description?: string | null;
          assigned_to?: string | null;
          due_at?: string | null;
          completed_at?: string | null;
          source?: Database["public"]["Enums"]["data_source"];
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "crm_tasks_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "crm_tasks_workspace_id_assigned_to_fkey"; columns: ["workspace_id","assigned_to"]; isOneToOne: false; referencedRelation: "workspace_members"; referencedColumns: ["workspace_id","user_id"]; },
          { foreignKeyName: "crm_tasks_workspace_id_lead_id_fkey"; columns: ["workspace_id","lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["workspace_id","id"]; },
        ];
      };
      data_usage_policies: {
        Row: {
          id: string;
          workspace_id: string;
          source: Database["public"]["Enums"]["data_source"];
          purpose: string;
          version: number;
          persistence: Database["public"]["Enums"]["persistence_rule"];
          allowed_fields: (string)[];
          allows_export: boolean;
          allows_ai: boolean;
          retention_days: number | null;
          rules_url: string;
          reviewed_at: string;
          valid_until: string | null;
          reviewed_by: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          source: Database["public"]["Enums"]["data_source"];
          purpose: string;
          version: number;
          persistence?: Database["public"]["Enums"]["persistence_rule"];
          allowed_fields?: (string)[];
          allows_export?: boolean;
          allows_ai?: boolean;
          retention_days?: number | null;
          rules_url: string;
          reviewed_at: string;
          valid_until?: string | null;
          reviewed_by?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          source?: Database["public"]["Enums"]["data_source"];
          purpose?: string;
          version?: number;
          persistence?: Database["public"]["Enums"]["persistence_rule"];
          allowed_fields?: (string)[];
          allows_export?: boolean;
          allows_ai?: boolean;
          retention_days?: number | null;
          rules_url?: string;
          reviewed_at?: string;
          valid_until?: string | null;
          reviewed_by?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "data_usage_policies_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "data_usage_policies_reviewed_by_fkey"; columns: ["reviewed_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "data_usage_policies_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"]; },
        ];
      };
      lead_activities: {
        Row: {
          id: string;
          workspace_id: string;
          lead_id: string;
          kind: string;
          summary: string;
          occurred_at: string;
          source: Database["public"]["Enums"]["data_source"];
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          lead_id: string;
          kind: string;
          summary: string;
          occurred_at?: string;
          source?: Database["public"]["Enums"]["data_source"];
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          lead_id?: string;
          kind?: string;
          summary?: string;
          occurred_at?: string;
          source?: Database["public"]["Enums"]["data_source"];
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "lead_activities_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "lead_activities_workspace_id_lead_id_fkey"; columns: ["workspace_id","lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["workspace_id","id"]; },
        ];
      };
      lead_external_references: {
        Row: {
          id: string;
          workspace_id: string;
          lead_id: string;
          provider: Database["public"]["Enums"]["data_source"];
          external_id: string;
          place_id: string | null;
          policy_id: string;
          purpose: string;
          persistence: Database["public"]["Enums"]["persistence_rule"];
          observed_at: string;
          created_by: string;
          created_at: string;
          updated_at: string;
          managed_by_crm: boolean;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          lead_id: string;
          provider: Database["public"]["Enums"]["data_source"];
          external_id: string;
          place_id?: never;
          policy_id: string;
          purpose?: string;
          persistence?: Database["public"]["Enums"]["persistence_rule"];
          observed_at?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          managed_by_crm?: boolean;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          lead_id?: string;
          provider?: Database["public"]["Enums"]["data_source"];
          external_id?: string;
          place_id?: never;
          policy_id?: string;
          purpose?: string;
          persistence?: Database["public"]["Enums"]["persistence_rule"];
          observed_at?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          managed_by_crm?: boolean;
        };
        Relationships: [
          { foreignKeyName: "lead_external_references_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "lead_external_references_workspace_id_lead_id_fkey"; columns: ["workspace_id","lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["workspace_id","id"]; },
          { foreignKeyName: "lead_external_references_workspace_id_policy_id_fkey"; columns: ["workspace_id","policy_id"]; isOneToOne: false; referencedRelation: "data_usage_policies"; referencedColumns: ["workspace_id","id"]; },
        ];
      };
      lead_notes: {
        Row: {
          id: string;
          workspace_id: string;
          lead_id: string;
          body: string;
          source: Database["public"]["Enums"]["data_source"];
          purpose: string;
          created_by: string;
          created_at: string;
          updated_at: string;
          crm_authored: boolean;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          lead_id: string;
          body: string;
          source?: Database["public"]["Enums"]["data_source"];
          purpose?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          crm_authored?: boolean;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          lead_id?: string;
          body?: string;
          source?: Database["public"]["Enums"]["data_source"];
          purpose?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          crm_authored?: boolean;
        };
        Relationships: [
          { foreignKeyName: "lead_notes_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "lead_notes_workspace_id_lead_id_fkey"; columns: ["workspace_id","lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["workspace_id","id"]; },
        ];
      };
      lead_stage_history: {
        Row: {
          id: string;
          workspace_id: string;
          lead_id: string;
          from_stage: Database["public"]["Enums"]["lead_stage"] | null;
          to_stage: Database["public"]["Enums"]["lead_stage"];
          changed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          lead_id: string;
          from_stage?: Database["public"]["Enums"]["lead_stage"] | null;
          to_stage: Database["public"]["Enums"]["lead_stage"];
          changed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          lead_id?: string;
          from_stage?: Database["public"]["Enums"]["lead_stage"] | null;
          to_stage?: Database["public"]["Enums"]["lead_stage"];
          changed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "lead_stage_history_changed_by_fkey"; columns: ["changed_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "lead_stage_history_workspace_id_lead_id_fkey"; columns: ["workspace_id","lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["workspace_id","id"]; },
        ];
      };
      leads: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          category: string | null;
          contact_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          website_url: string | null;
          address: string | null;
          city: string | null;
          stage: Database["public"]["Enums"]["lead_stage"];
          assigned_to: string | null;
          archived_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          crm_mode: string;
          tags: (string)[];
          do_not_contact: boolean;
          next_contact_at: string | null;
          manual_key: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          category?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          website_url?: string | null;
          address?: string | null;
          city?: string | null;
          stage?: Database["public"]["Enums"]["lead_stage"];
          assigned_to?: string | null;
          archived_at?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          crm_mode?: string;
          tags?: (string)[];
          do_not_contact?: boolean;
          next_contact_at?: string | null;
          manual_key?: never;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          category?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          website_url?: string | null;
          address?: string | null;
          city?: string | null;
          stage?: Database["public"]["Enums"]["lead_stage"];
          assigned_to?: string | null;
          archived_at?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          crm_mode?: string;
          tags?: (string)[];
          do_not_contact?: boolean;
          next_contact_at?: string | null;
          manual_key?: never;
        };
        Relationships: [
          { foreignKeyName: "leads_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "leads_workspace_id_assigned_to_fkey"; columns: ["workspace_id","assigned_to"]; isOneToOne: false; referencedRelation: "workspace_members"; referencedColumns: ["workspace_id","user_id"]; },
          { foreignKeyName: "leads_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"]; },
        ];
      };
      message_templates: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          body: string;
          tone: string;
          source: Database["public"]["Enums"]["data_source"];
          archived_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          body: string;
          tone?: string;
          source?: Database["public"]["Enums"]["data_source"];
          archived_at?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          body?: string;
          tone?: string;
          source?: Database["public"]["Enums"]["data_source"];
          archived_at?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "message_templates_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "message_templates_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"]; },
        ];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string;
          locale: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          locale?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          locale?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
        ];
      };
      search_history: {
        Row: {
          id: string;
          workspace_id: string;
          mode: string;
          location_input: string;
          keyword_input: string | null;
          category_input: string | null;
          radius_meters: number | null;
          source: Database["public"]["Enums"]["data_source"];
          provider: Database["public"]["Enums"]["data_source"];
          purpose: string;
          state: Database["public"]["Enums"]["operation_state"];
          duration_ms: number | null;
          error_code: string | null;
          completed_at: string | null;
          retention_until: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          mode: string;
          location_input: string;
          keyword_input?: string | null;
          category_input?: string | null;
          radius_meters?: number | null;
          source?: Database["public"]["Enums"]["data_source"];
          provider?: Database["public"]["Enums"]["data_source"];
          purpose?: string;
          state?: Database["public"]["Enums"]["operation_state"];
          duration_ms?: number | null;
          error_code?: string | null;
          completed_at?: string | null;
          retention_until?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          mode?: string;
          location_input?: string;
          keyword_input?: string | null;
          category_input?: string | null;
          radius_meters?: number | null;
          source?: Database["public"]["Enums"]["data_source"];
          provider?: Database["public"]["Enums"]["data_source"];
          purpose?: string;
          state?: Database["public"]["Enums"]["operation_state"];
          duration_ms?: number | null;
          error_code?: string | null;
          completed_at?: string | null;
          retention_until?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "search_history_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "search_history_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"]; },
        ];
      };
      usage_counters: {
        Row: {
          id: string;
          workspace_id: string;
          resource: Database["public"]["Enums"]["job_kind"];
          period_start: string;
          period_end: string;
          unit_limit: number;
          used_units: number;
          reserved_units: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          resource: Database["public"]["Enums"]["job_kind"];
          period_start: string;
          period_end: string;
          unit_limit: number;
          used_units?: number;
          reserved_units?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          resource?: Database["public"]["Enums"]["job_kind"];
          period_start?: string;
          period_end?: string;
          unit_limit?: number;
          used_units?: number;
          reserved_units?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "usage_counters_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "usage_counters_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"]; },
        ];
      };
      usage_reservations: {
        Row: {
          id: string;
          workspace_id: string;
          counter_id: string;
          resource: Database["public"]["Enums"]["job_kind"];
          job_id: string | null;
          idempotency_key: string;
          units: number;
          actual_units: number | null;
          state: Database["public"]["Enums"]["reservation_state"];
          expires_at: string;
          settled_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          counter_id: string;
          resource: Database["public"]["Enums"]["job_kind"];
          job_id?: string | null;
          idempotency_key: string;
          units: number;
          actual_units?: number | null;
          state?: Database["public"]["Enums"]["reservation_state"];
          expires_at?: string;
          settled_at?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          counter_id?: string;
          resource?: Database["public"]["Enums"]["job_kind"];
          job_id?: string | null;
          idempotency_key?: string;
          units?: number;
          actual_units?: number | null;
          state?: Database["public"]["Enums"]["reservation_state"];
          expires_at?: string;
          settled_at?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "usage_reservations_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "usage_reservations_workspace_id_counter_id_resource_fkey"; columns: ["workspace_id","counter_id","resource"]; isOneToOne: false; referencedRelation: "usage_counters"; referencedColumns: ["workspace_id","id","resource"]; },
          { foreignKeyName: "usage_reservations_workspace_id_job_id_fkey"; columns: ["workspace_id","job_id"]; isOneToOne: true; referencedRelation: "async_jobs"; referencedColumns: ["workspace_id","id"]; },
        ];
      };
      website_audits: {
        Row: {
          id: string;
          workspace_id: string;
          lead_id: string;
          job_id: string | null;
          policy_id: string;
          source: Database["public"]["Enums"]["data_source"];
          purpose: string;
          target_url: string;
          strategy: string;
          state: Database["public"]["Enums"]["operation_state"];
          performance_score: number | null;
          lcp_ms: number | null;
          cls: number | null;
          inp_ms: number | null;
          measured_at: string | null;
          retention_until: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          lead_id: string;
          job_id?: string | null;
          policy_id: string;
          source?: Database["public"]["Enums"]["data_source"];
          purpose?: string;
          target_url: string;
          strategy: string;
          state?: Database["public"]["Enums"]["operation_state"];
          performance_score?: number | null;
          lcp_ms?: number | null;
          cls?: number | null;
          inp_ms?: number | null;
          measured_at?: string | null;
          retention_until: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          lead_id?: string;
          job_id?: string | null;
          policy_id?: string;
          source?: Database["public"]["Enums"]["data_source"];
          purpose?: string;
          target_url?: string;
          strategy?: string;
          state?: Database["public"]["Enums"]["operation_state"];
          performance_score?: number | null;
          lcp_ms?: number | null;
          cls?: number | null;
          inp_ms?: number | null;
          measured_at?: string | null;
          retention_until?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "website_audits_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "website_audits_workspace_id_job_id_fkey"; columns: ["workspace_id","job_id"]; isOneToOne: false; referencedRelation: "async_jobs"; referencedColumns: ["workspace_id","id"]; },
          { foreignKeyName: "website_audits_workspace_id_lead_id_fkey"; columns: ["workspace_id","lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["workspace_id","id"]; },
          { foreignKeyName: "website_audits_workspace_id_policy_id_fkey"; columns: ["workspace_id","policy_id"]; isOneToOne: false; referencedRelation: "data_usage_policies"; referencedColumns: ["workspace_id","id"]; },
        ];
      };
      workspace_invitations: {
        Row: {
          id: string;
          workspace_id: string;
          email: string;
          role: Database["public"]["Enums"]["workspace_role"];
          expires_at: string;
          accepted_at: string | null;
          accepted_by: string | null;
          revoked_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          email: string;
          role: Database["public"]["Enums"]["workspace_role"];
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          revoked_at?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          email?: string;
          role?: Database["public"]["Enums"]["workspace_role"];
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          revoked_at?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "workspace_invitations_accepted_by_fkey"; columns: ["accepted_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "workspace_invitations_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "workspace_invitations_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"]; },
        ];
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["workspace_role"];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["workspace_role"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["workspace_role"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "workspace_members_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "workspace_members_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "workspace_members_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"]; },
        ];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          state: Database["public"]["Enums"]["workspace_state"];
          owner_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          state?: Database["public"]["Enums"]["workspace_state"];
          owner_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          state?: Database["public"]["Enums"]["workspace_state"];
          owner_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "workspace_owner_membership"; columns: ["id","owner_id"]; isOneToOne: false; referencedRelation: "workspace_members"; referencedColumns: ["workspace_id","user_id"]; },
          { foreignKeyName: "workspaces_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "workspaces_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      ag_accept_invitation: { Args: {
        p_token: string;
      }; Returns: string; };
      ag_accept_invitation_by_id: { Args: {
        p_invitation: string;
      }; Returns: string; };
      ag_audit_task: { Args: {
        p_workspace: string;
        p_action: string;
        p_source?: string;
        p_website?: string;
        p_strategy?: string;
        p_key?: string;
        p_job?: string;
        p_outcome?: string;
        p_error?: string;
        p_executor?: string;
      }; Returns: Json; };
      ag_change_member_role: { Args: {
        p_workspace: string;
        p_user: string;
        p_role: Database["public"]["Enums"]["workspace_role"];
      }; Returns: undefined; };
      ag_create_invitation: { Args: {
        p_workspace: string;
        p_email: string;
        p_role?: Database["public"]["Enums"]["workspace_role"];
      }; Returns: string; };
      ag_create_workspace: { Args: {
        p_name: string;
        p_slug: string;
      }; Returns: string; };
      ag_crm: { Args: {
        p_workspace: string;
        p_action: string;
        p_input?: Json;
        p_executor?: string;
      }; Returns: Json; };
      ag_list_my_invitations: { Args: Record<string, never>
      ; Returns: Json; };
      ag_message_attempt: { Args: {
        p_workspace: string;
        p_action: string;
        p_key?: string;
        p_job?: string;
        p_error?: string;
        p_executor?: string;
      }; Returns: string; };
      ag_remove_member: { Args: {
        p_workspace: string;
        p_user: string;
      }; Returns: undefined; };
      ag_reserve_usage: { Args: {
        p_workspace: string;
        p_resource: Database["public"]["Enums"]["job_kind"];
        p_units: number;
        p_idempotency_key: string;
      }; Returns: string; };
      ag_revoke_invitation: { Args: {
        p_workspace: string;
        p_invitation: string;
      }; Returns: undefined; };
      ag_settle_usage: { Args: {
        p_reservation: string;
        p_state: Database["public"]["Enums"]["reservation_state"];
        p_actual_units?: number;
      }; Returns: undefined; };
      ag_transfer_ownership: { Args: {
        p_workspace: string;
        p_user: string;
      }; Returns: undefined; };
    };
    Enums: {
      data_source: "user_input" | "first_party" | "authorized_import" | "google_places" | "pagespeed" | "openai";
      job_kind: "company_search" | "website_audit" | "ai_generation" | "export";
      lead_stage: "new" | "analysis" | "qualified" | "contacted" | "proposal" | "negotiation" | "won" | "lost";
      operation_state: "queued" | "running" | "completed" | "failed" | "cancelled";
      persistence_rule: "blocked" | "identifier_only" | "time_limited";
      reservation_state: "reserved" | "committed" | "released" | "expired";
      workspace_role: "owner" | "admin" | "member";
      workspace_state: "pending_owner" | "active";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type TableName = keyof Database["public"]["Tables"];
export type Tables<Name extends TableName> = Database["public"]["Tables"][Name]["Row"];
export type TablesInsert<Name extends TableName> = Database["public"]["Tables"][Name]["Insert"];
export type TablesUpdate<Name extends TableName> = Database["public"]["Tables"][Name]["Update"];
export type Enums<Name extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][Name];
