import "server-only";
import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/server/providers/supabase/server";
import type { CrmErrorCode } from "@/features/crm/domain/crm";

export class CrmError extends Error { constructor(readonly code: CrmErrorCode) { super(code); } }
export interface CrmRepository { execute(workspaceId: string, action: string, input: Json, executor: string): Promise<unknown> }
export const crmRepository: CrmRepository = { async execute(workspaceId, action, input, executor) {
  const client = await createSupabaseServerClient(); if (!client) throw new CrmError("not_configured");
  const { data, error } = await client.rpc("ag_crm", { p_workspace: workspaceId, p_action: action, p_input: input, p_executor: executor });
  if (error) throw new CrmError(error.code === "42501" ? "access_denied" : error.code === "40001" || error.code === "23505" ? "conflict" : error.code === "22023" || error.code === "23514" ? "invalid_input" : "provider_unavailable");
  return data;
} };
