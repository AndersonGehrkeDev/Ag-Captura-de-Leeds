import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/server/providers/supabase/server";
import { uuidSchema } from "@/domain/auth";

export const workspaceCookie = "ag-workspace";
export async function requireIdentity(writable = false) {
  const client = await createSupabaseServerClient(writable);
  if (!client) redirect("/login?aviso=configuracao");
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect("/login?aviso=sessao");
  return { client, user: data.user };
}
export async function listWorkspaces(identity: Awaited<ReturnType<typeof requireIdentity>>) {
  const { data: memberships, error } = await identity.client.from("workspace_members").select("workspace_id,role").eq("user_id", identity.user.id);
  if (error) throw new Error("Não foi possível consultar seus workspaces.");
  if (!memberships?.length) return [];
  const { data, error: workspaceError } = await identity.client.from("workspaces").select("id,name,slug").eq("state", "active").in("id", memberships.map((m) => m.workspace_id));
  if (workspaceError) throw new Error("Não foi possível consultar seus workspaces.");
  return (data ?? []).map((workspace) => ({ ...workspace, role: memberships.find((m) => m.workspace_id === workspace.id)!.role }));
}
export async function requireMembership(workspace: unknown, writable = false) {
  const identity = await requireIdentity(writable);
  const parsed = uuidSchema.safeParse(workspace);
  if (!parsed.success) return null;
  const memberships = await listWorkspaces(identity);
  const membership = memberships.find((m) => m.id === parsed.data);
  return membership ? { ...identity, membership } : null;
}
export async function requireSelectedWorkspace() {
  const identity = await requireIdentity();
  const workspaces = await listWorkspaces(identity);
  const selected = (await cookies()).get(workspaceCookie)?.value;
  const workspace = selected ? workspaces.find((w) => w.id === selected) : workspaces.length === 1 ? workspaces[0] : undefined;
  if (!workspace) redirect("/workspaces" + (selected ? "?aviso=acesso" : ""));
  return { ...identity, workspace };
}
export async function setWorkspaceCookie(id: string) {
  (await cookies()).set(workspaceCookie, id, { httpOnly: true, secure: process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_APP_URL?.startsWith("http://"), sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}
