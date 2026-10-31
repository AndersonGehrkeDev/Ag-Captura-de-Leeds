import "server-only";
import { createSupabaseServerClient } from "@/server/providers/supabase/server";
import { uuidSchema } from "@/domain/auth";

export async function verifyIntegrationWorkspace(workspaceId: string): Promise<string | null> {
  if (!uuidSchema.safeParse(workspaceId).success) return null;
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  const { data: membership, error: membershipError } = await client.from("workspace_members").select("user_id").eq("workspace_id", workspaceId).eq("user_id", data.user.id).maybeSingle();
  // RLS do schema verifica também o workspace ativo; nada vem de metadata ou da escolha na UI.
  return membershipError || !membership ? null : data.user.id;
}
