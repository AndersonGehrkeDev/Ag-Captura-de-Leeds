import "server-only";
import { auditJobSchema, type AuditJob } from "@/features/auditorias/domain/audit";
import type { IntegrationErrorCode } from "@/domain/integrations/contracts";
import { createSupabaseServerClient } from "@/server/providers/supabase/server";

export type TaskAction = "enqueue" | "claim" | "finish" | "status";
export type TaskArguments = { sourceId?: string; websiteProvenanceId?: string; strategy?: "mobile" | "desktop"; key?: string; jobId?: string; outcome?: "completed" | "inconclusive" | "failed"; errorCode?: string; executor?: string };
export interface AuditTaskRepository { task(workspaceId: string, action: TaskAction, args: TaskArguments): Promise<AuditJob | null> }
export class AuditTaskError extends Error { constructor(readonly code: IntegrationErrorCode) { super(code); } }
export const auditTaskRepository: AuditTaskRepository = {
  async task(workspaceId, action, args) {
    const client = await createSupabaseServerClient();
    if (!client) throw new AuditTaskError("not_configured");
    const { data, error } = await client.rpc("ag_audit_task", {
      p_workspace: workspaceId, p_action: action, p_source: args.sourceId, p_website: args.websiteProvenanceId,
      p_strategy: args.strategy, p_key: args.key, p_job: args.jobId, p_outcome: args.outcome, p_error: args.errorCode, p_executor: args.executor,
    });
    if (error) throw new AuditTaskError(error.code === "42501" ? "access_denied" : error.code === "P0001" ? "rate_limited" : error.code === "55000" ? "limit_reached" : "not_configured");
    return data === null ? null : auditJobSchema.parse(data);
  },
};
