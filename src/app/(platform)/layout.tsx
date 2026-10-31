import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { PlatformShell } from "@/components/layout/platform-shell";
import { listWorkspaces, requireIdentity, workspaceCookie } from "@/server/auth/session";
import { getAuthConfiguration } from "@/server/auth/configuration";
import { getConsumption } from "@/server/management/queries";

export const dynamic = "force-dynamic";
export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const identity = await requireIdentity();
  const { data: profile } = await identity.client.from("profiles").select("display_name").eq("id", identity.user.id).single();
  const workspaces = await listWorkspaces(identity);
  const selected = (await cookies()).get(workspaceCookie)?.value;
  const workspace = workspaces.find((w) => w.id === selected) ?? (workspaces.length === 1 ? workspaces[0] : undefined);
  const { publicConfig } = getAuthConfiguration();
  const consumption = workspace ? await getConsumption(identity.client, workspace.id) : undefined;
  return <PlatformShell consumption={consumption} viewer={{ name: profile?.display_name || "Minha conta", workspace: workspace?.name || "Selecionar workspace" }} config={publicConfig ?? undefined}>{children}</PlatformShell>;
}
