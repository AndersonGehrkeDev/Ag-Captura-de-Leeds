import Link from "next/link";
import { requireIdentity } from "@/server/auth/session";
import { AuthForm } from "@/features/auth/auth-form";
export default async function Profile() {
  const { client, user } = await requireIdentity();
  const { data, error } = await client.from("profiles").select("display_name").eq("id", user.id).single();
  return <div className="account-page"><h1>Meu perfil</h1><p>Gerencie sua identificação e seu acesso.</p><section className="account-card"><h2>Dados da conta</h2><p>{user.email}</p><p>{user.email_confirmed_at ? "E-mail confirmado" : "E-mail ainda não confirmado"}</p>{error ? <p role="alert">Não foi possível consultar o perfil. Tente novamente.</p> : <AuthForm mode="profile" displayName={data?.display_name} />}</section><div className="account-links"><Link href="/workspaces">Workspaces</Link><Link href="/recuperar-senha">Recuperar ou alterar senha por e-mail</Link><Link href="/workspace/membros">Membros e convites</Link></div><section className="account-card"><h2>Encerrar acesso</h2><p>Sair encerra a sessão neste dispositivo.</p><AuthForm mode="logout" /></section></div>;
}
