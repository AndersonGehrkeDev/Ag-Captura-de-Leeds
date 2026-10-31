import "server-only";
import { z } from "zod";
import { integrationFailure, type IntegrationResult, type WebsiteAuditPort } from "@/domain/integrations/contracts";
import type { SiteAuditReport } from "@/features/auditorias/domain/audit";

const audit = z.object({ id: z.string().optional(), title: z.string().optional(), score: z.number().min(0).max(1).nullable().optional(), scoreDisplayMode: z.string().optional(), numericValue: z.number().optional(), details: z.object({ overallSavingsMs: z.number().nonnegative().optional() }).optional() });
const responseSchema = z.object({ lighthouseResult: z.object({
  fetchTime: z.string().optional(), lighthouseVersion: z.string().optional(), requestedUrl: z.string().optional(), finalUrl: z.string().optional(),
  runtimeError: z.object({ code: z.string().optional() }).optional(),
  categories: z.record(z.string(), z.object({ score: z.number().min(0).max(1).nullable().optional() })).optional(),
  audits: z.record(z.string(), audit).optional(),
}).optional() });
const fields = "lighthouseResult(fetchTime,lighthouseVersion,requestedUrl,finalUrl,runtimeError/code,categories/*/score,audits/*/id,audits/*/title,audits/*/score,audits/*/scoreDisplayMode,audits/*/numericValue,audits/*/details/overallSavingsMs)";
const safeText = (value: string, length: number) => value.replace(/<[^>]*>/g, "").replace(/[\u0000-\u001f]/g, " ").replace(/\[[^\]]*\]\([^)]*\)/g, "").slice(0, length);

export function createPageSpeedAdapter(options: { key: string; metricId: string; recommendationId: string; fetch?: typeof fetch; now?: () => Date }) {
  const port = {
    async audit(request: Parameters<WebsiteAuditPort["audit"]>[0], cancellation?: AbortSignal): Promise<IntegrationResult<SiteAuditReport>> {
      if (!options.key) return integrationFailure("not_configured");
      const signal = AbortSignal.any([...(cancellation ? [cancellation] : []), AbortSignal.timeout(40_000)]);
      try {
        const endpoint = new URL("https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed");
        endpoint.searchParams.set("url", request.website.value);
        endpoint.searchParams.set("strategy", request.strategy); endpoint.searchParams.set("locale", "pt-BR"); endpoint.searchParams.set("fields", fields);
        for (const category of ["performance", "accessibility", "best-practices", "seo"]) endpoint.searchParams.append("category", category);
        // Uma chamada por tarefa. Nenhuma repetição automática de análise paga/limitada.
        const response = await (options.fetch ?? fetch)(endpoint, { signal, cache: "no-store", redirect: "error", headers: { Accept: "application/json", "X-Goog-Api-Key": options.key } });
        if (!response.ok) { await response.body?.cancel(); return integrationFailure(response.status === 429 ? "rate_limited" : "provider_unavailable"); }
        if (!response.body) return integrationFailure("provider_unavailable");
        const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
        try {
          for (;;) { const { value, done } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 1024 * 1024) { await reader.cancel(); return integrationFailure("provider_unavailable"); } chunks.push(value); }
        } finally { reader.releaseLock(); }
        const parsed = responseSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        if (!parsed.success) return integrationFailure("provider_unavailable");
        const result = parsed.data.lighthouseResult;
        const now = (options.now ?? (() => new Date()))();
        const measured = result?.fetchTime ? new Date(result.fetchTime) : null;
        const measuredDate = measured && Number.isFinite(measured.getTime()) && measured.getTime() <= now.getTime() + 300_000 ? measured.toISOString() : null;
        const origin = new URL(request.website.value).origin;
        let matchingTarget = false;
        try { matchingTarget = !!result?.finalUrl && new URL(result.finalUrl).origin === origin && !!result.requestedUrl && new URL(result.requestedUrl).href === new URL(request.website.value).href; } catch { /* Resposta inconclusiva; não usar URLs devolvidas como novos alvos. */ }
        const usable = !!result && !result.runtimeError && matchingTarget;
        const measuredAt = usable ? measuredDate : null;
        const score = (key: string) => usable && typeof result.categories?.[key]?.score === "number" ? Math.round(result.categories[key]!.score! * 100) : null;
        const scores = { performance: score("performance"), accessibility: score("accessibility"), bestPractices: score("best-practices"), seo: score("seo") };
        const recommendations = usable ? Object.entries(result.audits ?? {}).filter(([id, item]) => /^[a-z0-9-]{1,100}$/.test(id) && typeof item.score === "number" && item.score < 1 && ["numeric", "binary"].includes(item.scoreDisplayMode ?? "") && !!item.title)
          .sort((a, b) => (b[1].details?.overallSavingsMs ?? 0) - (a[1].details?.overallSavingsMs ?? 0)).slice(0, 5)
          .map(([id, item]) => ({ id, title: safeText(item.title!, 200), evidence: item.details?.overallSavingsMs ? `Economia estimada pela fonte: ${Math.round(item.details.overallSavingsMs)} ms` : "Verificação Lighthouse não atendida nesta execução", provenanceId: options.recommendationId })) : [];
        const quantified = usable ? Object.entries(result.audits ?? {}).filter(([, item]) => typeof item.score === "number" && item.score < 1 && (item.details?.overallSavingsMs ?? 0) > 0).map(([id]) => id) : [];
        const metric = (id: string) => usable && typeof result.audits?.[id]?.numericValue === "number" && result.audits[id]!.numericValue! >= 0 ? { state: "known" as const, data: { provenanceId: options.metricId, value: result.audits[id]!.numericValue! } } : { state: "not_provided" as const };
        const complete = usable && measuredAt !== null && Object.values(scores).some((value) => value !== null);
        const evaluated = usable && Object.values(result.audits ?? {}).some((item) => typeof item.score === "number" && ["numeric", "binary"].includes(item.scoreDisplayMode ?? ""));
        const failedChecks = usable && Object.values(result.audits ?? {}).some((item) => typeof item.score === "number" && item.score < 1);
        return { ok: true, data: {
          auditedAt: now.toISOString(), measuredAt, strategy: request.strategy, lighthouseVersion: usable ? result.lighthouseVersion?.slice(0, 60) ?? null : null,
          scores, recommendations,
          metrics: [{ name: "performance_score", origin: "lab", data: scores.performance === null ? { state: "not_provided" } : { state: "known", data: { provenanceId: options.metricId, value: scores.performance } } }, { name: "lcp_ms", origin: "lab", data: metric("largest-contentful-paint") }, { name: "cls", origin: "lab", data: metric("cumulative-layout-shift") }],
          commercial: { kind: !complete || !evaluated ? "insufficient_evidence" : recommendations.some((item) => quantified.includes(item.id)) ? "review_opportunity" : failedChecks ? "insufficient_evidence" : "no_opportunity_identified", evidenceIds: complete ? recommendations.filter((item) => quantified.includes(item.id)).map((item) => item.id) : [] },
          limitations: ["Medição de laboratório de uma página; não é diagnóstico comercial definitivo. Dados de campo não foram consultados.", ...(!usable ? ["A fonte não concluiu a análise do alvo autorizado ou retornou destino diferente."] : []), ...(!measuredAt ? ["Data da medição não informada pela fonte."] : []), ...(Object.values(scores).some((value) => value === null) ? ["Uma ou mais notas não estão disponíveis; ausência não representa nota zero."] : [])],
          attribution: ["Fonte: Google PageSpeed Insights / Lighthouse"],
        } };
      } catch { return integrationFailure(signal.aborted ? "timeout" : "provider_unavailable"); }
    },
  } satisfies WebsiteAuditPort;
  return port;
}
