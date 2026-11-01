import "server-only";
import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/server/providers/supabase/server";
import { OpenDataError } from "./overpass";

export async function openDataRepository(workspaceId: string, action: string, input: Json = {}) {
  const executor = process.env.CRM_EXECUTOR_SECRET;
  if (!executor || !/^[a-f0-9]{64}$/i.test(executor)) throw new OpenDataError("not_configured");
  const client = await createSupabaseServerClient(); if (!client) throw new OpenDataError("not_configured");
  const { data, error } = await client.rpc("ag_open_data", { p_workspace: workspaceId, p_action: action, p_input: input, p_executor: executor });
  if (error) throw new OpenDataError(error.code === "42501" ? "access_denied" : error.code === "54000" ? "limit_reached" : "provider_unavailable", undefined, `db_${/^[A-Z0-9]{5,12}$/.test(error.code) ? error.code : "unknown"}`);
  return data;
}
