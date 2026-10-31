import Link from "next/link";
import { listWorkspaces, requireIdentity } from "@/server/auth/session";
import { invitationsSchema, roleLabels } from "@/domain/workspaces";
import { WorkspaceChoice } from "@/features/auth/workspace-forms";
export default async function Workspaces({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const identity = await requireIdentity();
  const workspaces = await listWorkspaces(identity);
  const { data, error } = await identity.client.rpc("ag_list_my_invitations");
  const invitations = invitationsSchema.safeParse(data);
  return <div className="account-page"><h1>Seus workspaces</h1><p>Escolha o ambiente de trabalho. Seu acesso é verificado em cada operação.</p>{(await searchParams).aviso === "acesso" && <p role="alert" className="form-message">O workspace selecionado não está disponível para sua conta.</p>}<section><h2>Ambientes disponíveis</h2>{workspaces.length ? <div className="workspace-grid">{workspaces.map((w) => <article className="account-card" key={w.id}><h2>{w.name}</h2><p>{roleLabels[w.role]}</p><WorkspaceChoice id={w.id} /></article>)}</div> : <p className="auth-notice">Você ainda não pertence a um workspace. Peça um convite ao administrador. O workspace inicial AG precisa de provisionamento administrativo; a primeira conta não se torna proprietária automaticamente.</p>}</section><section><h2>Convites para seu e-mail</h2>{error || !invitations.success ? <p role="alert">Não foi possível consultar convites. Confira se todas as migrações foram aplicadas.</p> : invitations.data.length ? <div className="workspace-grid">{invitations.data.map((i) => <article className="account-card" key={i.id}><h2>{i.workspace_name}</h2><p>{roleLabels[i.role]} · Expira em {new Date(i.expires_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (Brasília)</p><WorkspaceChoice id={i.id} invitation /></article>)}</div> : <p className="auth-notice">Nenhum convite pendente para seu e-mail confirmado.</p>}</section><div className="account-links"><Link href="/perfil">Meu perfil</Link></div></div>;
}
