"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { emailSchema, otpTypeSchema, passwordSchema, safeRedirect, type AuthFormState } from "@/domain/auth";
import { getAuthConfiguration } from "./configuration";
import { createSupabaseServerClient } from "@/server/providers/supabase/server";
import { requireIdentity, workspaceCookie } from "./session";
import { verifyActionOrigin } from "./security";
async function authClient() {
  await verifyActionOrigin();
  return createSupabaseServerClient(true);
}
const unavailable = { message: "Acesso indisponível. Configure NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no servidor." };

export async function loginAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const client = await authClient();
  if (!client) return unavailable;
  const email = emailSchema.safeParse(form.get("email"));
  const password = form.get("password");
  if (!email.success || typeof password !== "string" || !password || password.length > 128) return { message: "Informe um e-mail válido e sua senha." };
  const { error } = await client.auth.signInWithPassword({ email: email.data, password });
  if (error) return { message: error.code === "email_not_confirmed" ? "Confirme seu e-mail pelo link recebido antes de entrar." : error.status === 429 ? "Muitas tentativas. Aguarde antes de tentar novamente." : "Não foi possível entrar. Confira e-mail e senha ou tente novamente mais tarde." };
  const { data, error: identityError } = await client.auth.getUser();
  if (identityError || !data.user) return { message: "Não foi possível validar sua sessão. Tente novamente." };
  redirect(safeRedirect(form.get("next")));
}

export async function signupAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const client = await authClient();
  const config = getAuthConfiguration();
  if (!config.allowSignup) return { message: "Cadastro aberto desativado. Solicite um convite ao administrador." };
  if (!client || !config.origin) return unavailable;
  const email = emailSchema.safeParse(form.get("email"));
  const password = passwordSchema.safeParse(form.get("password"));
  if (!email.success) return { message: "Informe um e-mail válido." };
  if (!password.success) return { message: password.error.issues[0]?.message || "Senha inválida." };
  const { error } = await client.auth.signUp({ email: email.data, password: password.data, options: { emailRedirectTo: `${config.origin}/auth/callback?next=/workspaces` } });
  if (error) return { message: "Não foi possível cadastrar. Confira os dados, as permissões de cadastro e tente mais tarde." };
  // A resposta de signUp pode ocultar a existência de contas; nunca confirme criação com base nela.
  const { data } = await client.auth.getUser();
  if (data.user) redirect("/workspaces");
  return { success: true, message: "Se o cadastro estiver disponível para este e-mail, você receberá as instruções de confirmação. Nenhum workspace é concedido automaticamente." };
}

export async function recoveryAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const client = await authClient();
  const { origin } = getAuthConfiguration();
  if (!client || !origin) return unavailable;
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { message: "Informe um e-mail válido." };
  const { error } = await client.auth.resetPasswordForEmail(email.data, { redirectTo: `${origin}/auth/callback?next=/redefinir-senha` });
  if (error && (error.status === 429 || (error.status ?? 0) >= 500 || error.name === "AuthRetryableFetchError")) return { message: "Recuperação indisponível neste momento. Aguarde e tente novamente." };
  return { success: true, message: "Se houver uma conta elegível, você receberá um e-mail com as instruções para recuperar o acesso." };
}

export async function confirmEmailAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const client = await authClient();
  if (!client) return unavailable;
  const type = otpTypeSchema.safeParse(form.get("type"));
  const token = form.get("token_hash");
  if (!type.success || typeof token !== "string" || !/^[a-zA-Z0-9_-]{20,512}$/.test(token)) return { message: "Link inválido. Solicite um novo e-mail." };
  const { error } = await client.auth.verifyOtp({ type: type.data, token_hash: token });
  if (error) return { message: "Este link expirou, já foi usado ou é inválido. Solicite um novo e-mail." };
  const { data } = await client.auth.getUser();
  if (!data.user) return { message: "Não foi possível validar a sessão. Solicite um novo link." };
  redirect(type.data === "recovery" ? "/redefinir-senha" : type.data === "invite" ? "/redefinir-senha?convite=1" : "/workspaces");
}

export async function resetPasswordAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  await verifyActionOrigin();
  const { client } = await requireIdentity(true);
  const password = passwordSchema.safeParse(form.get("password"));
  if (!password.success) return { message: password.error.issues[0]?.message || "Senha inválida." };
  if (password.data !== form.get("confirmPassword")) return { message: "As senhas precisam ser iguais." };
  const { error } = await client.auth.updateUser({ password: password.data });
  if (error) return { message: error.code === "same_password" ? "Escolha uma senha diferente da atual." : "Não foi possível alterar a senha. Reabra um link recente ou tente novamente." };
  // Mesmo em convite, encerre a sessão utilizada para definir a senha. Demais sessões são revogadas.
  const { error: logoutError } = await client.auth.signOut({ scope: "global" });
  if (logoutError && ![401, 403, 404].includes(logoutError.status ?? 0)) return { success: true, message: "Senha alterada. Não foi possível encerrar as sessões agora; acesse Meu perfil para tentar sair novamente." };
  (await cookies()).delete(workspaceCookie);
  redirect("/login?aviso=senha");
}

export async function logoutAction(): Promise<AuthFormState> {
  const client = await authClient();
  if (client) {
    await client.auth.getUser();
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error && error.status !== 401 && error.status !== 403 && error.status !== 404) return { message: "Não foi possível encerrar a sessão. Verifique a conexão e tente novamente." };
  }
  (await cookies()).delete(workspaceCookie);
  revalidatePath("/", "layout");
  redirect("/login?aviso=saiu");
}

export async function updateProfileAction(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  await verifyActionOrigin();
  const { client, user } = await requireIdentity(true);
  const name = form.get("display_name");
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100) return { message: "Informe um nome de até 100 caracteres." };
  const { data, error } = await client.from("profiles").update({ display_name: name.trim() }).eq("id", user.id).select("id");
  if (error || !data?.length) return { message: "Não foi possível salvar seu perfil." };
  revalidatePath("/", "layout");
  return { success: true, message: "Perfil atualizado." };
}
