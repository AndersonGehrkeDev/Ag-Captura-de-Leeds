import type { Metadata } from "next";
import { ResourceCard } from "@/features/configuracoes/components/resource-card";
import { getConfigurationReport } from "@/server/configuration";
import Link from "next/link";
import { requireSelectedWorkspace } from "@/server/auth/session";
import { AuthForm } from "@/features/auth/auth-form";
import { WorkspaceName } from "@/features/configuracoes/components/workspace-name";
import { getIntegrationFlags } from "@/server/integrations/configuration";
import { roleLabels } from "@/domain/workspaces";
import { openDataEnabled } from "@/server/providers/open-data/configuration";

export const metadata: Metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default async function ConfigurationPage() {
  const { client, workspace, user } = await requireSelectedWorkspace();
  const { data: profile, error: profileError } = await client.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const { data: members, error: membersError } = await client.from("workspace_members").select("user_id,role").eq("workspace_id", workspace.id).limit(50);
  const flags = getIntegrationFlags();
  const openProvider = process.env.OPEN_DATA_PROVIDER === "overture" ? "Overture Maps/DuckDB" : "OpenStreetMap/Private.coffee";
  const report = getConfigurationReport();
  return <div className="management-page space-y-6">
    <div><p className="mb-2 text-xs font-semibold tracking-widest text-primary uppercase">Conta, workspace e integrações</p><h1 className="text-2xl font-bold sm:text-3xl">Configurações por recurso</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Configure as variáveis diretamente no ambiente local ou na hospedagem. Esta tela mostra somente nomes e estados, sem exibir ou receber credenciais.</p></div>
    <div className="management-grid"><section className="ag-panel management-section"><h2>Perfil</h2><p>{user.email}</p>{profileError ? <p role="alert">Perfil indisponível.</p> : <AuthForm mode="profile" displayName={profile?.display_name} />}<Link className="management-link" href="/perfil">Acesso e recuperação de senha</Link></section><section className="ag-panel management-section"><h2>Workspace</h2><p>Seu papel: {roleLabels[workspace.role]}</p><WorkspaceName workspaceId={workspace.id} name={workspace.name} canManage={workspace.role !== "member"} /><Link className="management-link" href="/workspaces">Selecionar workspace e aceitar convites</Link></section></div>
    <section className="ag-panel management-section"><h2>Membros e permissões</h2>{membersError ? <p role="alert">Consulta da equipe indisponível.</p> : <p>{members?.length ?? 0} associações carregadas (até 50). As ações disponíveis seguem seu papel no workspace.</p>}<Link className="management-link" href="/workspace/membros">Gerenciar membros e convites</Link></section>
    <aside aria-label="Limites da validação" className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-relaxed"><p className="font-semibold text-primary">Validação local de formato</p><p className="mt-1 text-muted-foreground">Este diagnóstico não consulta APIs comerciais. Configuração presente não libera o caso de uso: conexão, restrições de chave, permissões da fonte e disponibilidade precisam de verificação. Flags não substituem autorização.</p></aside>
    <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">{report.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}</div>
    <section className="ag-panel management-section"><h2>Busca e mapa gratuitos do Brasil</h2><p>{openDataEnabled(workspace.id) ? `Alternativa IBGE + ${openProvider} + OpenFreeMap habilitada para este workspace. Não exige chave, cartão ou créditos; disponibilidade e cobertura dependem dos serviços e dados abertos.` : "Alternativa gratuita desativada neste workspace. Requer aprovação e configuração administrativa do servidor."}</p><p>Municípios nacionais por seleção; busca explícita, cache e limite persistente. Sem garantia de listar todas as empresas. Exportação de conteúdo, IA e raios não estão habilitados nesta fonte.</p><Link className="management-link" href="/prospeccao">Abrir prospecção</Link></section>
    <section className="ag-panel management-section"><h2>Capacidades e requisitos</h2><ul>{[["Catálogo: busca", flags.catalogSearch], ["Catálogo: detalhes", flags.catalogDetails], ["Auditorias", flags.websiteAudit], ["Mensagens IA", flags.aiMessages], ["Persistência CRM", flags.ownPersistence], ["Exportação", flags.exports]].map(([label, enabled]) => <li key={String(label)}>{label}: {enabled ? "flag habilitada; ainda exige permissões/configuração" : "desativado"}</li>)}</ul><p>Google Places/Maps continuam bloqueados pela política do produto, mesmo com chaves ou flags presentes. O mapa local usa coordenadas aprovadas e não é Google Maps.</p><p>Catálogo: {process.env.OWNED_CATALOG_FILE ? "caminho informado; arquivo/evidências não são validados por este diagnóstico" : "OWNED_CATALOG_FILE não informado"}.</p>{["AUDIT_EXECUTOR_SECRET", "MESSAGE_EXECUTOR_SECRET", "CRM_EXECUTOR_SECRET"].map((key) => <p key={key}><code>{key}</code>: {/^[a-f0-9]{64}$/i.test(process.env[key] ?? "") ? "formato presente; hash privado não verificado nesta tela" : "ausente ou formato inválido"}.</p>)}<p>Cotas, políticas SQL e agendamento de retenção precisam de configuração administrativa; este diagnóstico não os provisiona.</p></section>
    <p className="text-sm leading-relaxed text-muted-foreground">Use <code>.env.example</code> como referência. Não envie segredos pelo chat. A chave privilegiada Supabase é exclusiva do convite Auth administrativo; nunca é usada nas operações comuns. Cobrança e pagamentos não fazem parte desta plataforma.</p>
  </div>;
}
