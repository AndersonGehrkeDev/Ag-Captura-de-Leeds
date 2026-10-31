import "server-only";
import { createSupabaseServerClient } from "@/server/providers/supabase/server";
import { verifyIntegrationWorkspace } from "@/server/integrations/access";
import type { ManagementCommand } from "@/domain/management";

export class ManagementError extends Error {}
export async function managementContext(workspaceId: string) {
  const userId = await verifyIntegrationWorkspace(workspaceId); const client = await createSupabaseServerClient(true);
  if (!userId || !client) throw new ManagementError("Sessão expirada ou workspace não autorizado.");
  const { data, error } = await client.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", userId).maybeSingle();
  if (error || !data) throw new ManagementError("Associação ao workspace indisponível.");
  return { client, userId, role: data.role, workspaceId };
}
export async function applyManagement(command: Exclude<ManagementCommand, { operation: "template_copy" }>, context: Awaited<ReturnType<typeof managementContext>>) {
  const { client, workspaceId, userId } = context;
  if (command.operation === "task_create") return client.from("crm_tasks").insert({ workspace_id: workspaceId, title: command.title, due_at: command.dueAt, assigned_to: userId }).select("id");
  if (command.operation === "task_complete") {
    const { data, error } = await client.from("crm_tasks").select("created_by,assigned_to").eq("workspace_id", workspaceId).eq("id", command.id).maybeSingle();
    if (error || !data || (context.role === "member" && data.created_by !== userId && data.assigned_to !== userId)) throw new ManagementError("Você não pode alterar esta tarefa.");
    return client.from("crm_tasks").update({ completed_at: command.complete ? new Date().toISOString() : null }).eq("workspace_id", workspaceId).eq("id", command.id).select("id");
  }
  if (command.operation === "workspace_rename") return client.from("workspaces").update({ name: command.name }).eq("id", workspaceId).select("id");
  if (command.operation === "template_save") {
    const fields = { name: command.name, body: command.body, tone: command.tone };
    if (command.id) return client.from("message_templates").update(fields).eq("workspace_id", workspaceId).eq("id", command.id).eq("updated_at", command.expectedUpdatedAt!).select("id");
    return client.from("message_templates").insert({ workspace_id: workspaceId, ...fields }).select("id");
  }
  if (command.operation === "template_delete") return client.from("message_templates").delete().eq("workspace_id", workspaceId).eq("id", command.id).eq("updated_at", command.expectedUpdatedAt).select("id");
  if (command.operation === "campaign_save") {
    if (command.templateId) {
      const { data, error } = await client.from("message_templates").select("id").eq("workspace_id", workspaceId).eq("id", command.templateId).is("archived_at", null).maybeSingle();
      if (error || !data) throw new ManagementError("Modelo não disponível neste workspace.");
    }
    const fields = { name: command.name, description: command.description || null, template_id: command.templateId, status: command.status };
    if (command.id) return client.from("campaigns").update(fields).eq("workspace_id", workspaceId).eq("id", command.id).eq("updated_at", command.expectedUpdatedAt!).select("id");
    return client.from("campaigns").insert({ workspace_id: workspaceId, ...fields }).select("id");
  }
  const { data: campaign, error } = await client.from("campaigns").select("id,status").eq("workspace_id", workspaceId).eq("id", command.campaignId).maybeSingle();
  if (error || !campaign || campaign.status === "archived") throw new ManagementError("Campanha indisponível ou arquivada.");
  if (command.operation === "campaign_add") {
    const { data: lead, error: leadError } = await client.from("leads").select("id,do_not_contact").eq("workspace_id", workspaceId).eq("id", command.leadId).is("archived_at", null).maybeSingle();
    if (leadError || !lead || lead.do_not_contact) throw new ManagementError("Lead indisponível ou marcado como Não contatar.");
    return client.from("campaign_leads").insert({ workspace_id: workspaceId, campaign_id: command.campaignId, lead_id: command.leadId }).select("id");
  }
  return client.from("campaign_leads").update({ status: command.status }).eq("workspace_id", workspaceId).eq("campaign_id", command.campaignId).eq("id", command.id).select("id");
}
