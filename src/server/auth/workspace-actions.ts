"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { emailSchema, uuidSchema, type AuthFormState } from "@/domain/auth";
import { verifyActionOrigin } from "./security";
import { requireIdentity, requireMembership, setWorkspaceCookie } from "./session";
import { sendAuthInvitation } from "@/server/providers/supabase/invite-admin";

export async function selectWorkspaceAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  await verifyActionOrigin();
  const context = await requireMembership(form.get("workspace_id"), true);
  if (!context) return { message: "Você não tem acesso a este workspace." };
  await setWorkspaceCookie(context.membership.id);
  redirect("/prospeccao");
}

export async function acceptInvitationAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  await verifyActionOrigin();
  const { client } = await requireIdentity(true);
  const id = uuidSchema.safeParse(form.get("invitation_id"));
  if (!id.success) return { message: "Convite inválido." };
  const { data, error } = await client.rpc("ag_accept_invitation_by_id", { p_invitation: id.data });
  if (error || !data) return { message: "Convite indisponível, expirado ou já utilizado. Ele deve corresponder ao seu e-mail confirmado." };
  await setWorkspaceCookie(data);
  revalidatePath("/", "layout");
  redirect("/prospeccao");
}

export async function inviteMemberAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  await verifyActionOrigin();
  const context = await requireMembership(form.get("workspace_id"), true);
  const role = form.get("role");
  if (!context || context.membership.role === "member" || (role !== "member" && role !== "admin") || (role === "admin" && context.membership.role !== "owner")) return { message: "Você não tem permissão para criar este convite." };
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { message: "Informe um e-mail válido." };
  const { error } = await context.client.rpc("ag_create_invitation", { p_workspace: context.membership.id, p_email: email.data, p_role: role });
  if (error) return { message: "Não foi possível criar o convite. Verifique se já existe um convite pendente para este e-mail." };
  // O token legado retornado pelo RPC é descartado; a aceitação usa identidade/e-mail confirmados.
  const delivery = await sendAuthInvitation(email.data);
  revalidatePath("/workspace/membros");
  return { success: true, message: delivery === "requested" ? "Convite criado por 72 horas. O envio do e-mail de acesso foi solicitado ao Supabase; a entrega depende da configuração de e-mail." : delivery === "unavailable" ? "Convite criado por 72 horas. Não foi enviado e-mail de acesso: configure SUPABASE_SECRET_KEY no servidor ou convide a conta pelo painel do Supabase. Contas existentes encontram o convite em Workspaces." : "Convite de workspace criado por 72 horas. O Supabase não confirmou o envio de acesso. Contas existentes podem aceitar em Workspaces; para novas contas, confira o convite no painel do Supabase." };
}

export async function memberOperationAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  await verifyActionOrigin();
  const context = await requireMembership(form.get("workspace_id"), true);
  const target = uuidSchema.safeParse(form.get("target_id"));
  const operation = form.get("operation");
  if (!context || !target.success) return { message: "Operação não autorizada." };
  const ws = context.membership.id;
  let result;
  if (operation === "revoke" && context.membership.role !== "member") result = await context.client.rpc("ag_revoke_invitation", { p_workspace: ws, p_invitation: target.data });
  else if (operation === "remove") result = await context.client.rpc("ag_remove_member", { p_workspace: ws, p_user: target.data });
  else if (operation === "transfer" && context.membership.role === "owner" && form.get("confirmation") === "TRANSFERIR") result = await context.client.rpc("ag_transfer_ownership", { p_workspace: ws, p_user: target.data });
  else if (operation === "role" && context.membership.role === "owner") {
    const role = form.get("role");
    if (role !== "member" && role !== "admin") return { message: "Papel inválido." };
    result = await context.client.rpc("ag_change_member_role", { p_workspace: ws, p_user: target.data, p_role: role });
  } else return { message: "Operação não autorizada. Para transferir a propriedade, digite TRANSFERIR." };
  if (result.error) return { message: "Operação recusada. Confira suas permissões e o registro. O proprietário não pode ser removido nem rebaixado; use a transferência de propriedade." };
  revalidatePath("/", "layout");
  return { success: true, message: "Alteração realizada." };
}
