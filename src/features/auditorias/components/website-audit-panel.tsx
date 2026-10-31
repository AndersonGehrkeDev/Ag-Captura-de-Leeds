"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { integrationErrorCodes, integrationFailure, type IntegrationResult } from "@/domain/integrations/contracts";
import { auditResponseSchema, auditStateLabels, type AuditCommand, type AuditResponse } from "../domain/audit";

async function auditRequest(command: AuditCommand, cancellation: AbortSignal): Promise<IntegrationResult<AuditResponse>> {
  const signal = AbortSignal.any([cancellation, AbortSignal.timeout(55_000)]);
  try {
    const response = await fetch("/api/auditorias", { method: "POST", body: JSON.stringify(command), headers: { "Content-Type": "application/json" }, cache: "no-store", signal });
    const body: unknown = await response.json();
    const success = z.strictObject({ ok: z.literal(true), data: auditResponseSchema }).safeParse(body);
    if (response.ok && success.success) return success.data;
    const failure = z.strictObject({ ok: z.literal(false), error: z.strictObject({ code: z.enum(integrationErrorCodes), message: z.string().max(300) }) }).safeParse(body);
    return failure.success ? failure.data : integrationFailure("provider_unavailable");
  } catch { return integrationFailure(signal.aborted ? "timeout" : "provider_unavailable"); }
}
export function WebsiteAuditPanel({ workspaceId, sourceId, websiteProvenanceId }: { workspaceId: string; sourceId: string; websiteProvenanceId: string }) {
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");
  const [data, setData] = useState<AuditResponse>({ job: null, report: null });
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  const submitting = useRef(false);
  useEffect(() => {
    const request = new AbortController(); controller.current = request;
    // Somente estado durável. Nunca analisa um site ao abrir a aba ou alterar estratégia.
    void auditRequest({ operation: "status", workspaceId, sourceId, websiteProvenanceId, strategy }, request.signal).then((result) => {
      if (request.signal.aborted) return;
      if (result.ok) { setData(result.data); setMessage(""); } else setMessage(result.error.message);
    });
    return () => { request.abort(); controller.current?.abort(); };
  }, [workspaceId, sourceId, websiteProvenanceId, strategy]);
  async function analyze(resume = false) {
    if (submitting.current) return;
    submitting.current = true;
    controller.current?.abort(); const request = new AbortController(); controller.current = request;
    setBusy(true); setMessage(""); setData((previous) => ({ ...previous, report: null }));
    let jobId = resume ? data.job?.id : null;
    try {
      if (!jobId) {
        const created = await auditRequest({ operation: "create", workspaceId, sourceId, websiteProvenanceId, strategy, requestId: crypto.randomUUID() }, request.signal);
        if (request.signal.aborted) return;
        if (!created.ok) { setMessage(created.error.message); return; }
        setData(created.data); jobId = created.data.job?.id;
      }
      if (!jobId) { setMessage("Não foi possível criar a tarefa de auditoria."); return; }
      setMessage("Processamento solicitado. Aguarde a conclusão desta tarefa.");
      const result = await auditRequest({ operation: "run", workspaceId, jobId }, request.signal);
      if (request.signal.aborted) return;
      if (result.ok) { setData(result.data); setMessage(result.data.job?.state === "failed" ? "A análise falhou. Isso não classifica o site como ruim." : ""); }
      else setMessage(result.error.message);
    } finally { submitting.current = false; if (controller.current === request) setBusy(false); }
  }
  async function refresh() {
    if (busy) return;
    const request = new AbortController(); controller.current?.abort(); controller.current = request;
    const result = await auditRequest({ operation: "status", workspaceId, sourceId, websiteProvenanceId, strategy }, request.signal);
    if (!request.signal.aborted) { if (result.ok) { setData(result.data); setMessage(""); } else setMessage(result.error.message); }
  }
  const report = data.report;
  const displayState = busy && data.job ? "processing" : data.job?.state;
  return <section className="website-audit" aria-label="Auditoria do site" aria-busy={busy}>
    <h3>Auditoria do site</h3>
    <label className="field-label">Dispositivo<select className="ag-input" value={strategy} disabled={busy} onChange={(event) => { setData({ job: null, report: null }); setStrategy(event.target.value as "mobile" | "desktop"); }}><option value="mobile">Mobile (padrão)</option><option value="desktop">Desktop</option></select></label>
    <p role="status">{displayState ? auditStateLabels[displayState] : "Nenhuma análise solicitada"}</p>
    <Button className="gold-button" disabled={busy || data.job?.state === "processing"} onClick={() => void analyze(data.job?.state === "pending")}>{busy ? "Aguarde a análise…" : data.job?.state === "pending" ? "Executar tarefa pendente" : `Analisar site (${strategy})`}</Button>
    <Button variant="outline" disabled={busy} onClick={() => void refresh()}>Atualizar estado</Button>
    {message && <p className="audit-notice">{message}</p>}
    {data.job && <p>Processamento {data.job.completedAt ? `finalizado em ${new Date(data.job.completedAt).toLocaleString("pt-BR")}` : `solicitado em ${new Date(data.job.createdAt).toLocaleString("pt-BR")}`}.</p>}
    {!report && ["completed", "inconclusive"].includes(data.job?.state ?? "") && <p>O relatório não é armazenado pela política de dados. Uma nova análise exige sua ação e consome outra tentativa.</p>}
    {report && <>
      <p>Data da análise: {report.measuredAt ? new Date(report.measuredAt).toLocaleString("pt-BR") : "Não informada pela fonte"}. Estratégia: {report.strategy}.</p>
      <dl className="audit-scores">{([["Desempenho", report.scores.performance], ["Acessibilidade", report.scores.accessibility], ["Boas práticas", report.scores.bestPractices], ["SEO", report.scores.seo]] as const).map(([label, value]) => <div key={label}><dt>{label} · Lighthouse</dt><dd>{value === null ? "Não disponível" : `${value}/100`}</dd></div>)}</dl>
      <h4>Principais recomendações disponíveis</h4>{report.recommendations.length ? <ul>{report.recommendations.map((recommendation) => <li key={recommendation.id}><strong>{recommendation.title}</strong><p>{recommendation.evidence}</p></li>)}</ul> : <p>Nenhuma recomendação disponível nos campos desta resposta.</p>}
      <h4>Avaliação comercial · regra AG</h4><p>{report.commercial.kind === "review_opportunity" ? "Há uma oportunidade técnica a revisar: a fonte estimou economia de carregamento. Confirme impacto e escopo com o cliente." : report.commercial.kind === "no_opportunity_identified" ? "Nenhuma oportunidade identificada nos critérios desta execução; não representa avaliação completa do site." : "Evidências insuficientes para avaliação comercial."}</p>
      {report.commercial.evidenceIds.length > 0 && <p>Evidências: {report.commercial.evidenceIds.join(", ")}.</p>}
      {report.limitations.map((limitation) => <p key={limitation}>{limitation}</p>)}{report.attribution.map((credit) => <small key={credit}>{credit}</small>)}
    </>}
    <p>Uma página por ação. Sem análise em lote, exportação ou envio à IA. Falhas e campos ausentes não classificam o site como ruim.</p>
  </section>;
}
