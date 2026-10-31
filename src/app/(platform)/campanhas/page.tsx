import type { Metadata } from "next";
import { z } from "zod";
import { requireSelectedWorkspace } from "@/server/auth/session";
import { createCrmService } from "@/server/crm/service";
import { CampaignScreen } from "@/features/campanhas/components/campaign-screen";
import type { Campaign } from "@/domain/management";
export const metadata: Metadata = { title: "Campanhas" };
export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ campanha?: string }> }) {
  const { client, workspace } = await requireSelectedWorkspace(); const query = await searchParams;
  const [campaigns, templates, leads] = await Promise.all([
    client.from("campaigns").select("id,name,description,template_id,status,updated_at").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(50),
    client.from("message_templates").select("id,name").eq("workspace_id", workspace.id).is("archived_at", null).order("name").limit(100),
    createCrmService()({ operation: "list", workspaceId: workspace.id, page: 0 }, AbortSignal.timeout(10_000)),
  ]);
  const id = z.uuid().safeParse(query.campanha); let selected: Campaign | null = null;
  if (id.success) { const { data } = await client.from("campaigns").select("id,name,description,template_id,status,updated_at").eq("workspace_id", workspace.id).eq("id", id.data).maybeSingle(); if (data) selected = { ...data, status: data.status as Campaign["status"] }; }
  const participants = selected ? await client.from("campaign_leads").select("id,lead_id,status,updated_at").eq("workspace_id", workspace.id).eq("campaign_id", selected.id).order("created_at").limit(100) : { data: [], error: null };
  const ids = (participants.data ?? []).map((row) => row.lead_id); const preference = ids.length ? await client.from("leads").select("id,do_not_contact").eq("workspace_id", workspace.id).in("id", ids) : { data: [], error: null };
  const options = leads.ok ? leads.data.leads : [];
  return <CampaignScreen workspaceId={workspace.id} canManage={workspace.role !== "member"} available={!campaigns.error} campaigns={(campaigns.data ?? []).map((row) => ({ ...row, status: row.status as Campaign["status"] }))} selected={selected} templates={templates.data ?? []} leads={options} participantsAvailable={!participants.error} participants={(participants.data ?? []).map((row) => ({ ...row, status: row.status as "planned" | "contacted" | "responded" | "removed", label: options.find((lead) => lead.id === row.lead_id)?.name ?? options.find((lead) => lead.id === row.lead_id)?.internalLabel ?? `Lead ${row.lead_id.slice(0, 8)} (identificação não carregada)`, doNotContact: preference.error ? null : preference.data?.find((lead) => lead.id === row.lead_id)?.do_not_contact ?? null }))} />;
}
