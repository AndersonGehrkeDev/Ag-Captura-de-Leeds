import type { Metadata } from "next";
import { z } from "zod";
import { requireSelectedWorkspace } from "@/server/auth/session";
import { CrmScreen } from "@/features/crm/components/crm-screen";
import "@/app/crm.css";

export const metadata: Metadata = { title: "Meus Leads" };
export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  const { workspace } = await requireSelectedWorkspace(); const query = await searchParams;
  const lead = z.uuid().safeParse(query.lead);
  return <CrmScreen key={workspace.id} workspaceId={workspace.id} initialLeadId={lead.success ? lead.data : undefined} />;
}
