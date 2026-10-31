import type { Metadata } from "next";
import { requireSelectedWorkspace } from "@/server/auth/session";
import { LiveProspectingScreen } from "@/features/prospeccao/components/live-prospecting-screen";
export const metadata: Metadata = { title: "Mapa de Oportunidades" };
export default async function OpportunitiesMap() {
  const { client, workspace } = await requireSelectedWorkspace(); const { count, error } = await client.from("leads").select("id", { head: true, count: "exact" }).eq("workspace_id", workspace.id);
  return <LiveProspectingScreen key={workspace.id} workspaceId={workspace.id} savedLeads={error ? null : count} opportunities />;
}
