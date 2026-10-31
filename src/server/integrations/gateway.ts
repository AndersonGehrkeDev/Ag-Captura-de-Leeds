import "server-only";
import { z } from "zod";
import { authorizeData, integrationPolicyVersion, providerDataPolicies, type PolicyContext } from "@/domain/integrations/policy";
import { auditRequestSchema, detailsRequestSchema, integrationFailure, messageRequestSchema, ownPersistenceRequestSchema, searchRequestSchema, type AuditRequest, type IntegrationResult, type MessageGenerationPort, type OwnDataPersistencePort } from "@/domain/integrations/contracts";
import { numberDatumSchema, textDatumSchema, type DataField, type GovernedDatum, type TextDatum } from "@/domain/integrations/data";
import type { IntegrationFlags } from "@/domain/integrations/flags";
import type { IntegrationRegistryRepository, WorkspaceIntegrationSnapshot } from "./contracts";
import { verifyIntegrationWorkspace } from "./access";
import { getIntegrationFlags } from "./configuration";
import { createOwnedCatalogAdapter } from "@/server/providers/owned/catalog";

const website = z.url().max(2048).refine((value) => {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash && (!url.port || ["80", "443"].includes(url.port)) && url.hostname.includes(".") && !url.hostname.endsWith(".local") && !url.hostname.endsWith(".localhost") && !url.hostname.startsWith("[") && !/^[0-9.]+$/.test(url.hostname); } catch { return false; }
});
type Scope = { snapshot: WorkspaceIntegrationSnapshot; context: PolicyContext };
export function createIntegrationGateway(repository: IntegrationRegistryRepository, options: {
  authorize?: (workspaceId: string) => Promise<string | null>; flags?: () => IntegrationFlags; now?: () => Date;
} = {}) {
  async function scope(workspaceId: string): Promise<IntegrationResult<Scope>> {
    if (!z.uuid().safeParse(workspaceId).success) return integrationFailure("invalid_input");
    let userId: string | null;
    try { userId = await (options.authorize ?? verifyIntegrationWorkspace)(workspaceId); }
    catch { return integrationFailure("access_denied"); }
    if (!userId) return integrationFailure("access_denied");
    try {
      const snapshot = await repository.readAuthorizedWorkspace(workspaceId, userId);
      if (snapshot.workspaceId !== workspaceId) return integrationFailure("access_denied");
      return { ok: true, data: { snapshot, context: { workspaceId, mode: "production", now: (options.now ?? (() => new Date()))(), flags: (options.flags ?? getIntegrationFlags)(), provenance: snapshot.provenance, licenses: snapshot.licenses } } };
    } catch { return integrationFailure("provider_unavailable"); }
  }
  function source(id: string, current: Scope) {
    const selected = current.snapshot.sources.find((source) => source.id === id && source.workspaceId === current.context.workspaceId);
    return selected && ["first_party", "licensed"].includes(selected.provider) && providerDataPolicies[selected.provider].productUse !== "blocked" &&
      current.context.provenance.get(selected.provenanceId)?.provider === selected.provider &&
      authorizeData(selected.provenanceId, "display", "prospecting", current.context).allowed ? selected : null;
  }
  function datum(id: string, field: DataField | readonly DataField[], current: Scope): GovernedDatum | null {
    const record = current.context.provenance.get(id);
    const data = z.union([textDatumSchema, numberDatumSchema]).safeParse(current.snapshot.values.get(id));
    return record && data.success && data.data.provenanceId === id && (typeof field === "string" ? record.field === field : field.includes(record.field)) ? data.data : null;
  }
  return {
    async search(workspaceId: string, input: unknown, signal?: AbortSignal) {
      const request = searchRequestSchema.safeParse(input); if (!request.success) return integrationFailure("invalid_input");
      const current = await scope(workspaceId); if (!current.ok) return current;
      const selected = source(request.data.sourceId, current.data); if (!selected) return integrationFailure("permission_denied");
      if (!current.data.snapshot.catalogs.has(selected.id)) return integrationFailure("not_configured");
      return createOwnedCatalogAdapter(selected.id, selected.provider as "first_party" | "licensed", current.data.context, current.data.snapshot.catalogs.get(selected.id) ?? [], current.data.snapshot.locations?.get(selected.id)).search(request.data, signal);
    },
    async details(workspaceId: string, input: unknown, signal?: AbortSignal) {
      const request = detailsRequestSchema.safeParse(input); if (!request.success) return integrationFailure("invalid_input");
      const current = await scope(workspaceId); if (!current.ok) return current;
      const selected = source(request.data.sourceId, current.data); if (!selected) return integrationFailure("permission_denied");
      if (!current.data.snapshot.catalogs.has(selected.id)) return integrationFailure("not_configured");
      return createOwnedCatalogAdapter(selected.id, selected.provider as "first_party" | "licensed", current.data.context, current.data.snapshot.catalogs.get(selected.id) ?? []).details(request.data, signal);
    },
    async prepareAudit(workspaceId: string, input: unknown): Promise<IntegrationResult<{ website: TextDatum; strategy: AuditRequest["strategy"] }>> {
      const request = auditRequestSchema.safeParse(input); if (!request.success) return integrationFailure("invalid_input");
      const current = await scope(workspaceId); if (!current.ok) return current;
      if (!current.data.context.flags.websiteAudit) return integrationFailure("feature_disabled");
      const data = datum(request.data.websiteProvenanceId, "website_url", current.data);
      if (!data || typeof data.value !== "string" || !website.safeParse(data.value).success) return integrationFailure("invalid_input");
      if (!authorizeData(data.provenanceId, "export", "website_audit", current.data.context).allowed) return integrationFailure("permission_denied");
      // Planejamento apenas. Adaptador HTTP futuro precisa validar DNS/IP e cada redirecionamento na conexão.
      return { ok: true, data: { website: { provenanceId: data.provenanceId, value: data.value }, strategy: request.data.strategy } };
    },
    async prepareMessage(workspaceId: string, input: unknown): Promise<IntegrationResult<Parameters<MessageGenerationPort["generate"]>[0]>> {
      const request = messageRequestSchema.safeParse(input); if (!request.success) return integrationFailure("invalid_input");
      const current = await scope(workspaceId); if (!current.ok) return current;
      if (!current.data.context.flags.aiMessages) return integrationFailure("feature_disabled");
      const facts: GovernedDatum[] = []; const services: TextDatum[] = [];
      for (const [ids, service] of [[request.data.factProvenanceIds, false], [request.data.serviceProvenanceIds, true]] as const) for (const id of ids) {
        const data = datum(id, service ? "service_description" : ["name", "category", "website_url", "audit_metric", "note"], current.data);
        if (!data || !authorizeData(id, "ai", "message_draft", current.data.context).allowed || (service && typeof data.value !== "string")) return integrationFailure("permission_denied");
        if (service) services.push({ provenanceId: id, value: String(data.value) }); else facts.push(data);
      }
      if ([...facts, ...services].reduce((size, data) => size + String(data.value).length, 0) > 8000) return integrationFailure("invalid_input");
      return { ok: true, data: { facts, services, tone: request.data.tone, locale: "pt-BR", maxOutputTokens: 600, store: false, background: false } };
    },
    async preparePersistence(workspaceId: string, input: unknown): Promise<IntegrationResult<Parameters<OwnDataPersistencePort["save"]>[0]>> {
      const request = ownPersistenceRequestSchema.safeParse(input); if (!request.success) return integrationFailure("invalid_input");
      const current = await scope(workspaceId); if (!current.ok) return current;
      const fields: Parameters<OwnDataPersistencePort["save"]>[0]["fields"][number][] = [];
      const lengths = { name: 200, category: 100, website_url: 2048, address: 500, city: 120, note: 10000, stage: 20, task: 200 };
      for (const field of request.data.fields) {
        const data = datum(field.provenanceId, field.field, current.data);
        if (!data || typeof data.value !== "string" || !data.value.trim() || data.value.length > lengths[field.field]) return integrationFailure("invalid_input");
        if (field.field === "website_url" && !website.safeParse(data.value).success) return integrationFailure("invalid_input");
        if (field.field === "stage" && !["new", "analysis", "qualified", "contacted", "proposal", "negotiation", "won", "lost"].includes(data.value)) return integrationFailure("invalid_input");
        const decision = authorizeData(field.provenanceId, "persist", "crm", current.data.context);
        if (!decision.allowed || !decision.deleteAt) return integrationFailure("permission_denied");
        fields.push({ field: field.field, data, deleteAt: decision.deleteAt });
      }
      return { ok: true, data: { leadId: request.data.leadId, fields, policyVersion: integrationPolicyVersion } };
    },
  };
}
