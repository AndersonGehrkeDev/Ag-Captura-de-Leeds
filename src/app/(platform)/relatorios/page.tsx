import type { Metadata } from "next";
import { requireSelectedWorkspace } from "@/server/auth/session";
import { getOverview, getConsumption } from "@/server/management/queries";
import { OverviewCards, Funnel } from "@/components/workspace/overview";
import { ConsumptionSummary } from "@/components/workspace/consumption";
export const metadata: Metadata = { title: "Relatórios" };
export default async function ReportsPage() {
  const { client, workspace } = await requireSelectedWorkspace(); const [data, consumption] = await Promise.all([getOverview(client, workspace.id), getConsumption(client, workspace.id)]);
  const won = data.stages.find((row) => row.stage === "won")?.count; const lost = data.stages.find((row) => row.stage === "lost")?.count;
  return <div className="management-page"><header><h1>Relatórios</h1><p>{workspace.name} · Situação atual da carteira e contadores do período UTC.</p></header><OverviewCards data={data} /><div className="management-grid"><Funnel data={data} /><section className="ag-panel management-section"><h2>Ganhos e perdas</h2><dl className="management-totals"><div><dt>Leads em Ganho</dt><dd>{won ?? "—"}</dd></div><div><dt>Leads em Perdido</dt><dd>{lost ?? "—"}</dd></div></dl><p>Contagem das etapas atuais, somente leads não arquivados. Não representa faturamento, contratos ou taxas históricas de conversão.</p></section></div><section className="ag-panel management-section"><h2>Consumo e limites reais</h2><ConsumptionSummary report={consumption} /><p>Utilizadas e reservadas são unidades operacionais registradas. Contadores de busca/exportação ainda não medem automaticamente cada ação da interface. Auditorias e IA debitam tentativas, conforme suas regras. Valores monetários e cobrança não são calculados.</p></section></div>;
}
