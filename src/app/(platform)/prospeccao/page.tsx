import type { Metadata } from "next";
import { ProspectingScreen } from "@/features/prospeccao/components/prospecting-screen";
import { requireSelectedWorkspace } from "@/server/auth/session";
import { LiveProspectingScreen } from "@/features/prospeccao/components/live-prospecting-screen";
import { openDataEnabled } from "@/server/providers/open-data/configuration";

export const metadata: Metadata = { title: "Prospecção de Empresas" };
export default async function ProspectingPage() {
  const { client, workspace } = await requireSelectedWorkspace();
  if (process.env.OWNED_CATALOG_FILE || openDataEnabled(workspace.id)) {
    const { count, error } = await client.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id);
    return <LiveProspectingScreen key={workspace.id} workspaceId={workspace.id} savedLeads={error ? null : count} openMap={openDataEnabled(workspace.id)} />;
  }
  return <ProspectingScreen companies={[]} />;
}
