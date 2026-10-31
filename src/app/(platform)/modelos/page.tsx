import type { Metadata } from "next";
import { requireSelectedWorkspace } from "@/server/auth/session";
import { MessageTemplates } from "@/features/ia/components/message-templates";
export const metadata: Metadata = { title: "Modelos de Mensagens" };
export default async function TemplatesPage() {
  const { client, workspace } = await requireSelectedWorkspace(); const { data, error } = await client.from("message_templates").select("id,name,body,tone,updated_at").eq("workspace_id", workspace.id).is("archived_at", null).order("name").limit(100);
  return <MessageTemplates workspaceId={workspace.id} canManage={workspace.role !== "member"} available={!error} templates={(data ?? []).map((row) => ({ ...row, tone: row.tone as "professional" | "consultative" | "direct" }))} />;
}
