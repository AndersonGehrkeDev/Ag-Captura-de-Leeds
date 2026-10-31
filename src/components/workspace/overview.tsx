import Link from "next/link";
import { stageLabels } from "@/features/crm/domain/crm";
import type { WorkspaceOverview } from "@/domain/management";
export function OverviewCards({ data }: { data: WorkspaceOverview }) {
  const total = data.stages.some((item) => item.count === null) ? null : data.stages.reduce((sum, item) => sum + item.count!, 0);
  const values = [["Leads não arquivados", total], ["Tarefas abertas", data.tasks], ["Campanhas não arquivadas", data.campaigns], ["Leads: Não contatar", data.doNotContact]] as const;
  return <div className="workspace-metrics">{values.map(([label, count]) => <div className="ag-panel" key={label}><span>{label}</span><strong>{count === null ? "—" : count}</strong>{count === null && <small>Consulta indisponível</small>}</div>)}</div>;
}
export function Funnel({ data }: { data: WorkspaceOverview }) {
  const max = Math.max(1, ...data.stages.map((row) => row.count ?? 0));
  return <section className="ag-panel management-section"><h2>Funil comercial</h2><p>Distribuição atual dos leads não arquivados no workspace. Não mede conversão entre etapas.</p><div className="funnel-list">{data.stages.map((row) => <div key={row.stage}><span>{stageLabels[row.stage]}</span><progress max={max} value={row.count ?? 0} aria-label={`${stageLabels[row.stage]}: ${row.count === null ? "indisponível" : row.count}`} /><strong>{row.count === null ? "—" : row.count}</strong></div>)}</div><Link className="management-link" href="/leads">Abrir acompanhamento no CRM</Link></section>;
}
