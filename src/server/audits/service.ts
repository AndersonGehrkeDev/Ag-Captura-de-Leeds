import "server-only";
import { randomUUID } from "node:crypto";
import { auditCommandSchema, type AuditResponse, type SiteAuditReport } from "@/features/auditorias/domain/audit";
import { integrationFailure, type IntegrationResult } from "@/domain/integrations/contracts";
import { authorizeData, type PolicyContext } from "@/domain/integrations/policy";
import type { ProvenanceRecord } from "@/domain/integrations/data";
import { verifyIntegrationWorkspace } from "@/server/integrations/access";
import { getIntegrationFlags } from "@/server/integrations/configuration";
import { readOwnedRegistry } from "@/server/providers/owned/registry";
import { validateAuditTarget } from "@/server/providers/google-pagespeed/target";
import { createPageSpeedAdapter } from "@/server/providers/google-pagespeed/adapter";
import { AuditTaskError, auditTaskRepository, type AuditTaskRepository } from "./repository";

export const pageSpeedSourceReference = "pagespeed-insights-v5";
export function createAuditService(options: {
  authorize?: typeof verifyIntegrationWorkspace; registry?: typeof readOwnedRegistry; repository?: AuditTaskRepository;
  target?: typeof validateAuditTarget; provider?: typeof createPageSpeedAdapter; flags?: typeof getIntegrationFlags;
  credentials?: () => { key: string; executor: string }; now?: () => Date;
} = {}) {
  const repository = options.repository ?? auditTaskRepository;
  const authorize = options.authorize ?? verifyIntegrationWorkspace;
  const flags = options.flags ?? getIntegrationFlags;
  const credentials = options.credentials ?? (() => ({ key: process.env.GOOGLE_PAGESPEED_API_KEY ?? "", executor: process.env.AUDIT_EXECUTOR_SECRET ?? "" }));
  async function resolve(workspaceId: string, sourceId: string, websiteId: string, signal: AbortSignal) {
    if (!flags().websiteAudit) throw new AuditTaskError("feature_disabled");
    const keys = credentials(); if (!keys.key || !/^[a-f0-9]{64}$/i.test(keys.executor)) throw new AuditTaskError("not_configured");
    const registry = await (options.registry ?? readOwnedRegistry)(workspaceId, signal);
    if (!registry || registry.snapshot.workspaceId !== workspaceId) throw new AuditTaskError("not_configured");
    const source = registry.snapshot.sources.find((entry) => entry.id === sourceId && ["first_party", "licensed"].includes(entry.provider));
    const company = registry.snapshot.catalogs.get(sourceId)?.find((entry) => entry.website.state === "known" && entry.website.data.provenanceId === websiteId);
    if (!source || !company || company.website.state !== "known") throw new AuditTaskError("permission_denied");
    const context: PolicyContext = { workspaceId, mode: "production", now: (options.now ?? (() => new Date()))(), flags: flags(), provenance: registry.snapshot.provenance, licenses: registry.snapshot.licenses };
    if (context.provenance.get(websiteId)?.field !== "website_url" || !authorizeData(websiteId, "display", "website_audit", context).allowed || !authorizeData(websiteId, "export", "website_audit", context).allowed) throw new AuditTaskError("permission_denied");
    const output = new Map(context.provenance); const credits = new Set<string>();
    function outputId(field: "audit_metric" | "audit_recommendation") {
      for (const license of context.licenses.values()) {
        if (license.provider !== "pagespeed" || license.sourceReference !== pageSpeedSourceReference) continue;
        const record: ProvenanceRecord = { id: randomUUID(), workspaceId, provider: "pagespeed", reference: pageSpeedSourceReference, field, method: "api", parentIds: [websiteId], licenseId: license.id, observedAt: context.now.toISOString() };
        output.set(record.id, record);
        const permission = authorizeData(record.id, "display", "website_audit", { ...context, provenance: output });
        if (permission.allowed) { permission.attributions.forEach((credit) => credits.add(credit)); return record.id; }
        output.delete(record.id);
      }
      throw new AuditTaskError("permission_denied");
    }
    const metricId = outputId("audit_metric"); const recommendationId = outputId("audit_recommendation");
    const target = await (options.target ?? validateAuditTarget)(company.website.data.value);
    if (!target) throw new AuditTaskError("invalid_input");
    signal.throwIfAborted();
    return { website: { ...company.website.data, value: target.href }, keys, metricId, recommendationId, credits: [...credits] };
  }
  return async function execute(input: unknown, signal: AbortSignal): Promise<IntegrationResult<AuditResponse>> {
    const parsed = auditCommandSchema.safeParse(input); if (!parsed.success) return integrationFailure("invalid_input");
    const command = parsed.data;
    let runningId: string | null = null;
    try {
      if (!await authorize(command.workspaceId)) return integrationFailure("access_denied");
      if (command.operation === "status") {
        const job = await repository.task(command.workspaceId, "status", { sourceId: command.sourceId, websiteProvenanceId: command.websiteProvenanceId, strategy: command.strategy });
        return { ok: true, data: { job, report: null } };
      }
      if (command.operation === "create") {
        const resolved = await resolve(command.workspaceId, command.sourceId, command.websiteProvenanceId, signal);
        const job = await repository.task(command.workspaceId, "enqueue", { sourceId: command.sourceId, websiteProvenanceId: command.websiteProvenanceId, strategy: command.strategy, key: `audit:${command.requestId}`, executor: resolved.keys.executor });
        return { ok: true, data: { job, report: null } };
      }
      const existing = await repository.task(command.workspaceId, "status", { jobId: command.jobId });
      if (!existing) return integrationFailure("access_denied");
      if (existing.state !== "pending") return { ok: true, data: { job: existing, report: null } };
      // Revalida origem, permissões, credenciais, DNS e associação ao executar, não só ao enfileirar.
      const resolved = await resolve(command.workspaceId, existing.sourceId, existing.websiteProvenanceId, signal);
      if (!await authorize(command.workspaceId)) return integrationFailure("access_denied");
      const job = await repository.task(command.workspaceId, "claim", { jobId: existing.id, executor: resolved.keys.executor });
      if (!job) return integrationFailure("provider_unavailable");
      runningId = job.id;
      const adapter = (options.provider ?? createPageSpeedAdapter)({ key: resolved.keys.key, metricId: resolved.metricId, recommendationId: resolved.recommendationId, now: options.now });
      const result = await adapter.audit({ website: resolved.website, strategy: job.strategy }, signal);
      let report: SiteAuditReport | null = null;
      if (result.ok) {
        // Releitura também antes da exibição: expiração/revogação não autoriza devolver dados do PSI.
        const fresh = await resolve(command.workspaceId, existing.sourceId, existing.websiteProvenanceId, signal);
        if (fresh.website.value !== resolved.website.value) throw new AuditTaskError("permission_denied");
        if (!await authorize(command.workspaceId)) throw new AuditTaskError("access_denied");
        report = { ...result.data, metrics: result.data.metrics.map((metric) => ({ ...metric, data: metric.data.state === "known" ? { state: "known", data: { ...metric.data.data, provenanceId: fresh.metricId } } : metric.data })), recommendations: result.data.recommendations.map((recommendation) => ({ ...recommendation, provenanceId: fresh.recommendationId })), attribution: [...new Set([...result.data.attribution, ...fresh.credits])] };
      }
      const complete = report && report.measuredAt !== null && Object.values(report.scores).some((score) => score !== null);
      const finished = await repository.task(command.workspaceId, "finish", { jobId: job.id, outcome: !result.ok ? "failed" : complete ? "completed" : "inconclusive", errorCode: !result.ok ? result.error.code === "rate_limited" ? "rate_limited" : "provider_unavailable" : undefined, executor: resolved.keys.executor });
      runningId = null;
      return { ok: true, data: { job: finished, report } };
    } catch (error) {
      if (runningId) { try { await repository.task(command.workspaceId, "finish", { jobId: runningId, outcome: "failed", errorCode: "internal_error", executor: credentials().executor }); } catch { /* O lease durável expira; não deixar trabalho em memória após a resposta. */ } }
      return integrationFailure(error instanceof AuditTaskError ? error.code : signal.aborted ? "timeout" : "provider_unavailable");
    }
  };
}
