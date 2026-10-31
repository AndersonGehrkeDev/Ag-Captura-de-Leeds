import "server-only";
import { createSupabaseServerClient } from "@/server/providers/supabase/server";
import type { IntegrationErrorCode } from "@/domain/integrations/contracts";

export class MessageError extends Error { constructor(readonly code: IntegrationErrorCode) { super(code); } }
export interface MessageRepository {
  templates(workspaceId: string): Promise<readonly { id: string; body: string }[]>;
  attempt(workspaceId: string, action: "start" | "finish", args: { key?: string; jobId?: string; error?: "rate_limited" | "provider_unavailable" | "internal_error"; executor: string }): Promise<string | null>;
}
export const messageRepository: MessageRepository = {
  async templates(workspaceId) {
    const client = await createSupabaseServerClient(); if (!client) throw new MessageError("not_configured");
    const { data, error } = await client.from("message_templates").select("id,body").eq("workspace_id", workspaceId).is("archived_at", null).order("id").limit(100);
    if (error) throw new MessageError("provider_unavailable"); return data;
  },
  async attempt(workspaceId, action, args) {
    const client = await createSupabaseServerClient(); if (!client) throw new MessageError("not_configured");
    const { data, error } = await client.rpc("ag_message_attempt", { p_workspace: workspaceId, p_action: action, p_key: args.key, p_job: args.jobId, p_error: args.error, p_executor: args.executor });
    if (error) throw new MessageError(error.code === "42501" ? "access_denied" : error.code === "P0001" ? "rate_limited" : "not_configured");
    return data;
  },
};
