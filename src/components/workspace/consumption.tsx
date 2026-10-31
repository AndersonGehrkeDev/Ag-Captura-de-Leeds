import { resourceLabels, type ConsumptionReport } from "@/domain/management";
import { RefreshWorkspace } from "@/features/gestao/client";
export function ConsumptionSummary({ report, compact = false }: { report?: ConsumptionReport; compact?: boolean }) {
  return <div className={compact ? "consumption compact" : "consumption"}>
    {!report ? <p>Selecione um workspace para consultar os limites.</p> : !report.available ? <p role="status">Consumo indisponível. Não foi possível consultar os contadores.</p> : !report.rows.length ? <p>Nenhum limite configurado para o período UTC atual.</p> : report.rows.map((row) => <div className="consumption-row" key={row.resource}><strong>{resourceLabels[row.resource]}</strong><p>{row.used_units} / {row.unit_limit} unidades utilizadas · {row.reserved_units} reservadas</p><progress max={Math.max(1, row.unit_limit)} value={Math.min(row.unit_limit, row.used_units + row.reserved_units)} aria-label={`Consumo registrado de ${resourceLabels[row.resource]}`} /><small>{row.period_start} a {row.period_end} (fim exclusivo) · UTC</small></div>)}
    <small>Contadores da última consulta. Não representam cobrança, tokens ou todas as ações feitas na interface.</small><RefreshWorkspace />
  </div>;
}
