import "server-only";
import { stages } from "@/features/crm/domain/crm";
import type { ConsumptionReport, WorkspaceOverview } from "@/domain/management";
import type { requireSelectedWorkspace } from "@/server/auth/session";

type Client = Awaited<ReturnType<typeof requireSelectedWorkspace>>["client"];
export async function getConsumption(client: Client, workspaceId: string): Promise<ConsumptionReport> {
  const period = new Date().toISOString().slice(0, 7) + "-01";
  const { data, error } = await client.from("usage_counters").select("resource,period_start,period_end,unit_limit,used_units,reserved_units").eq("workspace_id", workspaceId).eq("period_start", period).order("resource");
  return { rows: error ? [] : data ?? [], available: !error };
}
export async function getOverview(client: Client, workspaceId: string): Promise<WorkspaceOverview> {
  const counts = await Promise.all(stages.map(async (stage) => {
    const { count, error } = await client.from("leads").select("id", { head: true, count: "exact" }).eq("workspace_id", workspaceId).is("archived_at", null).eq("stage", stage);
    return { stage, count: error ? null : count };
  }));
  const [tasks, campaigns, doNotContact] = await Promise.all([
    client.from("crm_tasks").select("id", { head: true, count: "exact" }).eq("workspace_id", workspaceId).is("completed_at", null),
    client.from("campaigns").select("id", { head: true, count: "exact" }).eq("workspace_id", workspaceId).neq("status", "archived"),
    client.from("leads").select("id", { head: true, count: "exact" }).eq("workspace_id", workspaceId).is("archived_at", null).eq("do_not_contact", true),
  ]);
  return { stages: counts, tasks: tasks.error ? null : tasks.count, campaigns: campaigns.error ? null : campaigns.count, doNotContact: doNotContact.error ? null : doNotContact.count };
}
